from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify

from config import SUPABASE_URL, SUPABASE_ANON_KEY
from core.auth import current_user, login_required
from core.logic import REGIONS, DEPARTMENTS
from core.supabase_client import supabase

bp = Blueprint("auth", __name__)


@bp.route("/login")
def login():
    if current_user():
        if not session.get("country") or not session.get("department"):
            return redirect(url_for("auth.select_context"))
        return redirect(url_for("payments.hub"))
    return render_template(
        "auth/login.html",
        supabase_url=SUPABASE_URL, supabase_anon_key=SUPABASE_ANON_KEY,
        restoring=False, nav=[], user=None,
    )


@bp.route("/select-context", methods=["GET", "POST"])
@login_required
def select_context():
    if request.method == "POST":
        country = request.form.get("country")
        department = request.form.get("department")
        if country not in REGIONS or department not in {d["id"] for d in DEPARTMENTS}:
            return render_template("auth/select_context.html", regions=REGIONS, departments=DEPARTMENTS,
                                    error="Pick a country and a department to continue.",
                                    active_view=None, header_title="Select business context")
        session["country"] = country
        session["department"] = department
        return redirect(url_for("payments.hub"))
    return render_template("auth/select_context.html", regions=REGIONS, departments=DEPARTMENTS,
                            error=None, active_view=None, header_title="Select business context")


@bp.route("/auth/session", methods=["POST"])
def establish_session():
    """Called by the browser (supabase-js) right after a successful
    signInWithOtp/verifyOtp/signInWithPassword — mirrors the old
    'resolve the signed-in auth account to a team member row' effect."""
    token = (request.get_json(silent=True) or {}).get("access_token")
    if not token:
        return jsonify({"error": "Missing access token"}), 400
    try:
        auth_user = supabase.auth.get_user(token).user
    except Exception:
        return jsonify({"error": "Could not verify session"}), 401
    email = (auth_user.email or "").lower()
    # Stash the token first so this and every later request in the session queries
    # Supabase as this authenticated user — RLS treats an anon-key client as
    # anonymous and returns nothing, even for real rows.
    session["access_token"] = token
    row = supabase.table("users").select("*").eq("id", email).limit(1).execute().data
    if not row or not row[0]["active"]:
        session.clear()
        return jsonify({"error": "This noon ID is not authorized for the Ops Console. "
                                 "Ask Gaurav to add you as a team member."}), 403
    session["user_id"] = email
    return jsonify({"ok": True})


@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("auth.login"))
