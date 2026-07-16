from flask import Blueprint, render_template, request, redirect, url_for, session, flash

from core.auth import context_required, current_user
from core.logic import (
    kb_bot_answer, detect_gaps, answer_looks_complete, group_questions_by_card,
    step_name_for, card_steps, steps_to_body, to_bullet_points, new_id, now_minutes, COUNTRY_LABEL, POINTS,
)
from core.services import add_audit, award_points
from core.supabase_client import supabase, row_to_kb_card, row_to_user, row_to_point, row_to_bot_question

bp = Blueprint("ai", __name__, url_prefix="/ai")


def _all_cards():
    return [row_to_kb_card(r) for r in supabase.table("kb_cards").select("*").execute().data]


def _all_questions():
    return [row_to_bot_question(r) for r in supabase.table("bot_questions").select("*").order("created_at", desc=True).execute().data]


@bp.route("/")
@context_required
def picker():
    return render_template("ai/picker.html", active_view="ai", header_title="AI workspace", ai_tab=None)


@bp.route("/chat")
@context_required
def chat():
    user = current_user()
    cards = _all_cards()
    messages = session.get("chat_messages")
    if not messages:
        published = [c for c in cards if c["status"] == "published"]
        draft_count = len(cards) - len(published)
        messages = [{"role": "bot", "text": (
            f"Hi {user['name']}! I'm the Ops KB bot, connected live to the team knowledge base. "
            f"I can read {len(cards)} card{'s' if len(cards) != 1 else ''} ({len(published)} published, {draft_count} draft) "
            "across UAE, KSA and Egypt. Ask me anything about payment operations — "
            "I'll answer with the exact points from the cards and cite my sources."
        ), "sources": []}]
        session["chat_messages"] = messages
    return render_template("ai/chat.html", active_view="ai", header_title="AI workspace", ai_tab="chat",
                            messages=messages, cards=cards, country_label=COUNTRY_LABEL)


@bp.route("/chat/ask", methods=["POST"])
@context_required
def chat_ask():
    q = request.form.get("question", "").strip()
    if q:
        cards = _all_cards()
        messages = session.get("chat_messages", [])
        messages.append({"role": "user", "text": q, "sources": []})
        answer = kb_bot_answer(q, cards)
        messages.append({"role": "bot", "text": answer["text"], "sources": answer["sources"]})
        session["chat_messages"] = messages
    return redirect(url_for("ai.chat"))


@bp.route("/sopbot")
@context_required
def sopbot():
    user = current_user()
    questions = _all_questions()
    users = [row_to_user(r) for r in supabase.table("users").select("*").execute().data]
    points = [row_to_point(r) for r in supabase.table("points_ledger").select("*").execute().data]

    open_q = [q for q in questions if q["status"] == "open"]
    answered = [q for q in questions if q["status"] == "answered"]
    submitted = [q for q in questions if q["status"] == "submitted"]
    groups = group_questions_by_card(open_q + answered)
    for g in groups:
        g["openCount"] = len([q for q in g["items"] if q["status"] == "open"])
        g["answeredCount"] = len([q for q in g["items"] if q["status"] == "answered"])

    totals = {}
    for p in points:
        totals[p["userId"]] = totals.get(p["userId"], 0) + p["points"]
    board = sorted(
        [{"user": u, "pts": totals.get(u["id"], 0)} for u in users if u["active"]],
        key=lambda b: b["pts"], reverse=True,
    )
    my_pts = totals.get(user["id"], 0)

    return render_template("ai/sopbot.html", active_view="ai", header_title="AI workspace", ai_tab="sopbot",
                            groups=groups, submitted=submitted, board=board, my_pts=my_pts,
                            country_label=COUNTRY_LABEL, points=POINTS)


@bp.route("/sopbot/card/<card_id>")
@context_required
def sopbot_card(card_id):
    questions = _all_questions()
    items = [q for q in questions if q["cardId"] == card_id and q["status"] in ("open", "answered")]
    if not items:
        return render_template("ai/sopbot_card.html", active_view="ai", header_title="AI workspace", ai_tab="sopbot",
                                group=None, card_id=card_id, points=POINTS)
    group = {"cardId": card_id, "cardTitle": items[0]["cardTitle"], "country": items[0]["country"],
             "section": items[0]["section"], "items": items,
             "openCount": len([q for q in items if q["status"] == "open"])}
    return render_template("ai/sopbot_card.html", active_view="ai", header_title="AI workspace", ai_tab="sopbot",
                            group=group, card_id=card_id, country_label=COUNTRY_LABEL, points=POINTS)


@bp.route("/sopbot/scan", methods=["POST"])
@context_required
def scan():
    user = current_user()
    if user["role"] != "admin":
        return redirect(url_for("ai.sopbot"))
    cards = _all_cards()
    existing_questions = _all_questions()
    existing = {f'{q["cardId"]}||{q["question"]}' for q in existing_questions if q["status"] != "dismissed"}
    created_at = now_minutes()
    created = []
    for card in cards:
        for question in detect_gaps(card):
            key = f'{card["id"]}||{question}'
            if key in existing:
                continue
            existing.add(key)
            created.append({
                "id": new_id("q"), "card_id": card["id"], "card_title": card["title"],
                "country": card["country"], "section": card["section"], "question": question,
                "status": "open", "created_at": created_at,
            })
    if not created:
        flash("No new gaps found — the SOPs look complete to the bot")
        return redirect(url_for("ai.sopbot"))
    for q in created:
        supabase.table("bot_questions").insert(q).execute()
    add_audit(user["name"], "SOP bot scan", f'{len(created)} new question{"s" if len(created) > 1 else ""} raised across the knowledge base', "-")
    flash(f'SOP bot raised {len(created)} question{"s" if len(created) > 1 else ""} — answers earn points')
    return redirect(url_for("ai.sopbot"))


@bp.route("/sopbot/question/<qid>/answer", methods=["POST"])
@context_required
def answer_question(qid):
    user = current_user()
    text = request.form.get("answer", "").strip()
    row = supabase.table("bot_questions").select("*").eq("id", qid).limit(1).execute().data
    if not row:
        return redirect(url_for("ai.sopbot"))
    q = row_to_bot_question(row[0])
    if not answer_looks_complete(text):
        flash("Almost — I need specifics before this can go into an SOP. Add names, dates, amounts or system steps.")
        return redirect(url_for("ai.sopbot_card", card_id=q["cardId"]))
    supabase.table("bot_questions").update({
        "status": "answered", "answer": text, "answered_by": user["id"],
        "answered_by_name": user["name"], "answered_at": now_minutes(),
    }).eq("id", qid).execute()
    add_audit(user["name"], "Answer SOP bot question", f'Answered on "{q["cardTitle"]}": {q["question"]}', q["country"])
    award_points(user["id"], user["name"], POINTS["botAnswer"], f'Answered SOP bot on "{q["cardTitle"]}"', qid)
    flash(f'Answer accepted — +{POINTS["botAnswer"]} pts. Submit it to the card for +{POINTS["submitToCard"]} more.')
    return redirect(url_for("ai.sopbot_card", card_id=q["cardId"]))


@bp.route("/sopbot/question/<qid>/submit-to-card", methods=["POST"])
@context_required
def submit_to_card(qid):
    row = supabase.table("bot_questions").select("*").eq("id", qid).limit(1).execute().data
    if not row:
        return redirect(url_for("ai.sopbot"))
    q = row_to_bot_question(row[0])
    card_row = supabase.table("kb_cards").select("*").eq("id", q["cardId"]).limit(1).execute().data
    if not card_row:
        flash("The card behind this question no longer exists")
        return redirect(url_for("ai.sopbot"))
    card = row_to_kb_card(card_row[0])
    steps = card_steps(card) + [{"name": step_name_for(q["question"]), "detail": to_bullet_points(q["answer"])}]
    rev_id = new_id("r")
    supabase.table("kb_revisions").insert({
        "id": rev_id, "card_id": card["id"], "title": card["title"], "body": steps_to_body(steps), "steps": steps,
        "author_id": q["answeredBy"], "author_name": q["answeredByName"], "note": f'SOP bot: {q["question"]}',
        "status": "pending", "created_at": now_minutes(),
    }).execute()
    supabase.table("bot_questions").update({"status": "submitted"}).eq("id", qid).execute()
    add_audit(q["answeredByName"] or "-", "Submit bot answer to card", f'Answer on "{q["cardTitle"]}" submitted as a revision', q["country"])
    award_points(q["answeredBy"], q["answeredByName"], POINTS["submitToCard"], f'Answer submitted to "{card["title"]}"', qid)
    flash(f'+{POINTS["submitToCard"]} pts to {q["answeredByName"]} — revision awaiting Gaurav\'s merge')
    return redirect(url_for("kb.open_card", card_id=card["id"]))


@bp.route("/sopbot/question/<qid>/dismiss", methods=["POST"])
@context_required
def dismiss_question(qid):
    user = current_user()
    row = supabase.table("bot_questions").select("*").eq("id", qid).limit(1).execute().data
    if not row:
        return redirect(url_for("ai.sopbot"))
    q = row_to_bot_question(row[0])
    supabase.table("bot_questions").update({"status": "dismissed"}).eq("id", qid).execute()
    add_audit(user["name"], "Dismiss SOP bot question", f'Dismissed on "{q["cardTitle"]}": {q["question"]}', q["country"])
    flash("Question dismissed")
    return redirect(url_for("ai.sopbot"))
