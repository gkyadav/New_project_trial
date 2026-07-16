from flask import Blueprint, render_template, request, redirect, url_for, flash

from core.auth import login_required, current_user
from core.logic import (
    KB_TREE_REGIONS, KB_TREE_DEPTS, COUNTRY_LABEL, POINTS,
    card_steps, cleaned_steps, steps_to_body, to_bullet_points, new_id, now_minutes, today, empty_step,
)
from core.services import add_audit, award_points
from core.supabase_client import supabase, row_to_kb_card, row_to_kb_revision, row_to_user

bp = Blueprint("kb", __name__, url_prefix="/kb")


def _all_cards():
    return [row_to_kb_card(r) for r in supabase.table("kb_cards").select("*").order("updated_at", desc=True).execute().data]


def _all_revisions():
    return [row_to_kb_revision(r) for r in supabase.table("kb_revisions").select("*").order("created_at", desc=True).execute().data]


def _all_users():
    return [row_to_user(r) for r in supabase.table("users").select("*").order("id").execute().data]


def _get_card(card_id):
    row = supabase.table("kb_cards").select("*").eq("id", card_id).limit(1).execute().data
    return row_to_kb_card(row[0]) if row else None


@bp.route("/")
@login_required
def summary():
    cards = _all_cards()
    global_cards = [c for c in cards if c["country"] == "global"]
    global_published = len([c for c in global_cards if c["status"] == "published"])
    total_published = len([c for c in cards if c["status"] == "published"])

    country_stats = []
    for region in [r for r in KB_TREE_REGIONS if r["id"] != "global"]:
        region_cards = [c for c in cards if c["country"] == region["id"]]
        depts = []
        for dept in KB_TREE_DEPTS:
            dept_cards = [c for c in region_cards if c["department"] == dept["id"]]
            depts.append({**dept, "created": len(dept_cards),
                          "published": len([c for c in dept_cards if c["status"] == "published"])})
        country_stats.append({**region, "created": len(region_cards),
                               "published": len([c for c in region_cards if c["status"] == "published"]), "depts": depts})

    return render_template(
        "kb/summary.html", active_view="kb", header_title="Knowledge base",
        cards=cards, global_cards=global_cards, global_published=global_published,
        total_created=len(cards), total_published=total_published, country_stats=country_stats,
    )


@bp.route("/<region>")
@login_required
def region_view(region):
    return _render_country(region, None)


@bp.route("/<region>/<dept>")
@login_required
def dept_view(region, dept):
    return _render_country(region, dept)


def _render_country(country, department, open_card_id=None, active_section=0):
    cards = _all_cards()
    revisions = _all_revisions()
    users = _all_users()
    country_cards = [c for c in cards if c["country"] == country and (not department or c["department"] == department)]
    open_card = next((c for c in cards if c["id"] == open_card_id and c["country"] == country), None) if open_card_id else None
    dept_label = next((d["label"] for d in KB_TREE_DEPTS if d["id"] == department), None) if department else None

    open_card_revisions = [r for r in revisions if r["cardId"] == open_card_id] if open_card else []
    steps = card_steps(open_card) if open_card else []

    return render_template(
        "kb/country.html", active_view="kb", header_title="Knowledge base",
        country=country, department=department, dept_label=dept_label,
        country_label=COUNTRY_LABEL.get(country, country),
        cards=cards, country_cards=country_cards, revisions=revisions, users=users,
        open_card=open_card, open_card_revisions=open_card_revisions, steps=steps,
        active_section=active_section, country_label_map=COUNTRY_LABEL,
        kb_tab=country, kb_dept=department, open_card_id=open_card_id,
    )


@bp.route("/<region>/card/<card_id>")
@login_required
def open_card(region, card_id):
    card = _get_card(card_id)
    if not card:
        flash("That knowledge card no longer exists")
        return redirect(url_for("kb.region_view", region=region))
    section_arg = request.args.get("section")
    if section_arg is not None:
        active_section = int(section_arg)
    else:
        steps = card_steps(card)
        first_pending = next((i for i, s in enumerate(steps) if s.get("status") != "done"), 0)
        active_section = first_pending
    return _render_country(region, card["department"], open_card_id=card_id, active_section=active_section)


@bp.route("/<region>/<dept>/create", methods=["POST"])
@login_required
def create_card(region, dept):
    user = current_user()
    title = request.form.get("title", "").strip()
    if not title:
        flash("Card title is required")
        return redirect(url_for("kb.dept_view", region=region, dept=dept))
    names = request.form.getlist("step_name")
    details = request.form.getlist("step_detail")
    steps, error = cleaned_steps([{"name": n, "detail": d} for n, d in zip(names, details)])
    if error:
        flash(error)
        return redirect(url_for("kb.dept_view", region=region, dept=dept))

    card_id = new_id("k")
    updated_at = today()
    supabase.table("kb_cards").insert({
        "id": card_id, "title": title, "body": steps_to_body(steps), "steps": steps,
        "region": region, "country": region, "section": "general", "department": dept,
        "owner": user["id"], "status": "draft", "author": user["name"], "updated_at": updated_at,
    }).execute()
    add_audit(user["name"], "Create knowledge card", f'Draft created: "{title}" ({region.upper()} / general)', region)
    award_points(user["id"], user["name"], POINTS["newCard"], f'New knowledge card: "{title}"', card_id)
    flash(f'+{POINTS["newCard"]} pts — ' + ("draft card saved" if user["role"] == "admin" else "draft card saved, pending Gaurav's vetting"))
    return redirect(url_for("kb.open_card", region=region, card_id=card_id))


@bp.route("/card/<card_id>/publish", methods=["POST"])
@login_required
def publish_card(card_id):
    card = _get_card(card_id)
    user = current_user()
    supabase.table("kb_cards").update({"status": "published", "updated_at": today()}).eq("id", card_id).execute()
    add_audit(user["name"], "Publish knowledge card", f'Published: "{card["title"]}"', card["country"])
    flash("Card published to knowledge base")
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/card/<card_id>/unpublish", methods=["POST"])
@login_required
def unpublish_card(card_id):
    card = _get_card(card_id)
    user = current_user()
    supabase.table("kb_cards").update({"status": "draft", "updated_at": today()}).eq("id", card_id).execute()
    add_audit(user["name"], "Unpublish knowledge card", f'Reverted to draft: "{card["title"]}"', card["country"])
    flash("Card reverted to draft")
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/card/<card_id>/delete", methods=["POST"])
@login_required
def delete_card(card_id):
    card = _get_card(card_id)
    user = current_user()
    supabase.table("kb_cards").delete().eq("id", card_id).execute()
    add_audit(user["name"], "Delete knowledge card", f'Deleted: "{card["title"]}"', card["country"])
    flash(f'"{card["title"]}" deleted')
    return redirect(url_for("kb.region_view", region=card["country"]))


@bp.route("/card/<card_id>/section/<int:idx>/save", methods=["POST"])
@login_required
def save_section(card_id, idx):
    card = _get_card(card_id)
    user = current_user()
    steps = card_steps(card)
    name = request.form.get("name", "").strip()
    detail = request.form.get("detail", "")
    mark_done = request.form.get("mark_done") == "1"
    if idx < len(steps):
        status = "done" if mark_done else steps[idx].get("status", "pending")
        steps[idx] = {"name": name, "detail": to_bullet_points(detail), "status": status}
    body = steps_to_body(steps)
    supabase.table("kb_cards").update({"body": body, "steps": steps, "updated_at": today()}).eq("id", card_id).execute()
    add_audit(user["name"], "Edit knowledge card", f'Updated "{card["title"]}"', card["country"])
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id, section=idx))


@bp.route("/card/<card_id>/section/<int:idx>/toggle-done", methods=["POST"])
@login_required
def toggle_done(card_id, idx):
    card = _get_card(card_id)
    user = current_user()
    steps = card_steps(card)
    if idx < len(steps):
        steps[idx]["status"] = "pending" if steps[idx].get("status") == "done" else "done"
    supabase.table("kb_cards").update({"steps": steps, "body": steps_to_body(steps), "updated_at": today()}).eq("id", card_id).execute()
    add_audit(user["name"], "Edit knowledge card", f'Updated "{card["title"]}"', card["country"])
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id, section=idx))


@bp.route("/card/<card_id>/title", methods=["POST"])
@login_required
def save_title(card_id):
    card = _get_card(card_id)
    user = current_user()
    title = request.form.get("title", "").strip()
    if title and title != card["title"]:
        supabase.table("kb_cards").update({"title": title, "updated_at": today()}).eq("id", card_id).execute()
        add_audit(user["name"], "Rename knowledge card", f'Renamed to "{title}"', card["country"])
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/card/<card_id>/assign", methods=["POST"])
@login_required
def assign_card(card_id):
    card = _get_card(card_id)
    user = current_user()
    assignee_id = request.form.get("assignee") or None
    users = _all_users()
    assignee = next((u for u in users if u["id"] == assignee_id), None)
    supabase.table("kb_cards").update({"assigned_to": assignee_id}).eq("id", card_id).execute()
    add_audit(user["name"], "Assign knowledge card",
              f'"{card["title"]}" assigned to {assignee["name"] if assignee else assignee_id}' if assignee_id else f'"{card["title"]}" unassigned',
              card["country"])
    flash(f'Card assigned to {assignee["name"]}' if assignee else "Card unassigned")
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/card/<card_id>/request-update", methods=["POST"])
@login_required
def request_update(card_id):
    card = _get_card(card_id)
    user = current_user()
    note = request.form.get("note", "").strip()
    if not note:
        flash("Describe what needs updating")
        return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))
    supabase.table("kb_cards").update({
        "update_request": note, "update_requested_by": user["name"], "update_requested_at": now_minutes(),
    }).eq("id", card_id).execute()
    add_audit(user["name"], "Request card update", f'Update requested on "{card["title"]}": {note}', card["country"])
    flash("Update requested — the assignee will see it on the card")
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/card/<card_id>/clear-update", methods=["POST"])
@login_required
def clear_update(card_id):
    card = _get_card(card_id)
    user = current_user()
    supabase.table("kb_cards").update({"update_request": "", "update_requested_by": None, "update_requested_at": None}).eq("id", card_id).execute()
    add_audit(user["name"], "Clear update request", f'Update request cleared on "{card["title"]}"', card["country"])
    flash("Update request cleared")
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card_id))


@bp.route("/revision/<rev_id>/merge", methods=["POST"])
@login_required
def merge_revision(rev_id):
    user = current_user()
    row = supabase.table("kb_revisions").select("*").eq("id", rev_id).limit(1).execute().data
    if not row:
        return redirect(url_for("kb.summary"))
    rev = row_to_kb_revision(row[0])
    supabase.table("kb_cards").update({
        "title": rev["title"], "body": rev["body"], "steps": rev["steps"], "updated_at": today(),
        "update_request": "", "update_requested_by": None, "update_requested_at": None,
    }).eq("id", rev["cardId"]).execute()
    supabase.table("kb_revisions").update({"status": "merged", "decided_at": now_minutes(), "decided_by": user["name"]}).eq("id", rev_id).execute()
    add_audit(user["name"], "Merge card revision", f'Merged {rev["authorName"]}\'s edit into "{rev["title"]}"', "-")
    award_points(rev["authorId"], rev["authorName"], POINTS["mergedRevision"], f'Edit merged into "{rev["title"]}"', rev_id)
    flash(f'Merged {rev["authorName"]}\'s revision (+{POINTS["mergedRevision"]} pts to {rev["authorName"]})')
    card = _get_card(rev["cardId"])
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card["id"]))


@bp.route("/revision/<rev_id>/reject", methods=["POST"])
@login_required
def reject_revision(rev_id):
    user = current_user()
    row = supabase.table("kb_revisions").select("*").eq("id", rev_id).limit(1).execute().data
    if not row:
        return redirect(url_for("kb.summary"))
    rev = row_to_kb_revision(row[0])
    supabase.table("kb_revisions").update({"status": "rejected", "decided_at": now_minutes(), "decided_by": user["name"]}).eq("id", rev_id).execute()
    add_audit(user["name"], "Reject card revision", f'Rejected {rev["authorName"]}\'s edit to "{rev["title"]}"', "-")
    flash(f'Rejected {rev["authorName"]}\'s revision')
    card = _get_card(rev["cardId"])
    return redirect(url_for("kb.open_card", region=card["country"], card_id=card["id"]))
