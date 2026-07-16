from flask import Blueprint, render_template, request, redirect, url_for, flash

from core.auth import roles_required, current_user
from core.logic import REGIONS
from core.services import add_audit
from core.supabase_client import supabase, row_to_user, row_to_audit

bp = Blueprint("admin", __name__, url_prefix="/admin")

PERMISSION_MATRIX = [
    ("BAU checklist", "Tick own-team stages", "Tick stages, second approver", "Tick stages, second approver, reset cycle"),
    ("Payment status", "Own region, view only", "All regions, view only", "All regions, edit"),
    ("Knowledge cards", "Create drafts, propose edits", "Create drafts, propose edits", "Create, publish, assign, request updates"),
    ("SOP bot & points", "Answer questions, earn points", "Answer questions, earn points", "Scan for gaps, dismiss questions"),
    ("Access control", "No access", "No access", "Full access"),
    ("Audit log", "No access", "View only", "View only"),
]


@bp.route("/access-control")
@roles_required("reviewer", "admin")
def access_control():
    user = current_user()
    if user["role"] != "admin":
        flash("Access control is admin-only")
        return redirect(url_for("admin.audit_log"))
    users = [row_to_user(r) for r in supabase.table("users").select("*").order("id").execute().data]
    return render_template("admin/access_control.html", active_view="admin", header_title="Admin",
                            admin_tab="access", users=users, permission_matrix=PERMISSION_MATRIX)


@bp.route("/access-control/users/<user_id>/toggle", methods=["POST"])
@roles_required("admin")
def toggle_user(user_id):
    admin_user = current_user()
    row = supabase.table("users").select("*").eq("id", user_id).limit(1).execute().data
    if not row:
        return redirect(url_for("admin.access_control"))
    target = row_to_user(row[0])
    new_active = not target["active"]
    supabase.table("users").update({"active": new_active}).eq("id", user_id).execute()
    add_audit(admin_user["name"], "Toggle user access",
              f'{target["name"]} set to {"active" if new_active else "inactive"}',
              REGIONS[target["region"]]["short"] if target["region"] else "-")
    flash(f'{target["name"]} is now {"active" if new_active else "inactive"}')
    return redirect(url_for("admin.access_control"))


@bp.route("/access-control/users/add", methods=["POST"])
@roles_required("admin")
def add_user():
    admin_user = current_user()
    user_id = request.form.get("id", "").strip().lower()
    name = request.form.get("name", "").strip()
    title = request.form.get("title", "").strip()
    role = request.form.get("role", "agent")
    regions = request.form.getlist("regions")

    if not user_id.endswith("@noon.com") or "@" not in user_id:
        flash("Team member ID must be an official noon.com email address")
        return redirect(url_for("admin.access_control"))
    if not name:
        flash("Name is required")
        return redirect(url_for("admin.access_control"))
    existing = supabase.table("users").select("id").eq("id", user_id).limit(1).execute().data
    if existing:
        flash("A team member with that noon ID already exists")
        return redirect(url_for("admin.access_control"))

    region = regions[0] if regions else None
    supabase.table("users").insert({
        "id": user_id, "name": name, "role": role, "region": region,
        "active": True, "title": title, "regions": regions,
    }).execute()
    add_audit(admin_user["name"], "Add team member", f"{name} ({user_id}) added as {role}", "-")
    flash(f"{name} added — they can sign in with their noon email once you share the console link")
    return redirect(url_for("admin.access_control"))


@bp.route("/audit-log")
@roles_required("reviewer", "admin")
def audit_log():
    users = [row_to_user(r) for r in supabase.table("users").select("*").order("id").execute().data]
    entries = [row_to_audit(r) for r in supabase.table("audit_log").select("*").order("at", desc=True).execute().data]

    actor_filter = request.args.get("actor", "all")
    action_filter = request.args.get("action", "all")
    region_filter = request.args.get("region", "all")

    actors = ["all"] + sorted({u["name"] for u in users})
    actions = ["all"] + sorted({e["action"] for e in entries})

    filtered = [
        e for e in entries
        if (actor_filter == "all" or e["actor"] == actor_filter)
        and (action_filter == "all" or e["action"] == action_filter)
        and (region_filter == "all" or e["region"].lower() == REGIONS.get(region_filter, {}).get("short", "").lower())
    ]

    return render_template("admin/audit_log.html", active_view="admin", header_title="Admin",
                            admin_tab="audit", entries=filtered, actors=actors, actions=actions,
                            actor_filter=actor_filter, action_filter=action_filter, region_filter=region_filter,
                            show_access_tab=current_user()["role"] == "admin")
