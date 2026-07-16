from flask import Blueprint, render_template, request, redirect, url_for, flash

from core.auth import login_required, current_user
from core.logic import PAYMENT_CARDS, STATUS_LABEL
from core.services import add_audit
from core.supabase_client import supabase, row_to_payment

bp = Blueprint("payments", __name__, url_prefix="/payments")


@bp.route("/")
@login_required
def hub():
    user = current_user()
    cards = [c for c in PAYMENT_CARDS if user["role"] in c.get("roles", ["agent", "reviewer", "admin"])]
    return render_template("payments/hub.html", active_view="bau", header_title="Payments",
                            cards=cards, group=request.args.get("group", "fulfillment"))


@bp.route("/status")
@login_required
def status():
    user = current_user()
    rows = supabase.table("payments").select("*").order("id").execute().data
    payments = [row_to_payment(r) for r in rows]
    if user["role"] == "agent":
        payments = [p for p in payments if p["region"] == user["region"]]
    else:
        region_filter = request.args.get("region", "all")
        if region_filter != "all":
            payments = [p for p in payments if p["region"] == region_filter]
    return render_template("payments/status.html", active_view="bau", header_title="Payments",
                            payments=payments, status_label=STATUS_LABEL,
                            region_filter=request.args.get("region", "all"))


@bp.route("/open/<card_id>")
@login_required
def open_card(card_id):
    if card_id == "payment_status":
        return redirect(url_for("payments.status"))
    if card_id == "payments_kb":
        return redirect(url_for("kb.summary"))
    if card_id == "access_control":
        return redirect(url_for("admin.access_control"))
    card = next((c for c in PAYMENT_CARDS if c["id"] == card_id), None)
    flash(f'"{card["title"] if card else card_id}" is coming next — we\'ll build this out as we proceed')
    return redirect(url_for("payments.hub"))


@bp.route("/status/<payment_id>/change", methods=["POST"])
@login_required
def change_status(payment_id):
    user = current_user()
    if user["role"] != "admin":
        return redirect(url_for("payments.status"))
    new_status = request.form.get("status")
    from core.logic import today
    updated_at = today()
    row = supabase.table("payments").select("*").eq("id", payment_id).limit(1).execute().data
    if row:
        old = row[0]
        supabase.table("payments").update({"status": new_status, "updated_at": updated_at}).eq("id", payment_id).execute()
        add_audit(user["name"], "Change payment status",
                  f"{old['customer']}: {STATUS_LABEL[old['status']]} → {STATUS_LABEL[new_status]} (mock, manual)",
                  old["region"])
    flash("Payment status updated (mock)")
    return redirect(url_for("payments.status"))
