"""Server-side Supabase access — port of src/supabase.js.

Row mappers translate snake_case DB rows to the camelCase dict shape the
templates/logic expect, mirroring the old rowToX() functions exactly.

RLS on this project only grants reads/writes to an *authenticated* Supabase
session — the original React app got that for free because supabase-js runs
in the browser and attaches the signed-in user's JWT to every request. A
bare server-side client with just the anon key is treated as anonymous and
gets nothing back (every table looks empty). `supabase` below is a
request-scoped proxy: once a user is signed in, their access token (stashed
in the Flask session by blueprints/auth/routes.py) is attached to a
per-request client via postgrest.auth(), so RLS sees them as authenticated,
same as before. Before login (or outside a request), it falls back to the
plain anon client.
"""
from flask import g, has_request_context, session as flask_session
from werkzeug.local import LocalProxy

from supabase import create_client

from config import SUPABASE_URL, SUPABASE_ANON_KEY

_anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def _current_client():
    if not has_request_context():
        return _anon_client
    token = flask_session.get("access_token")
    if not token:
        return _anon_client
    if not hasattr(g, "_authed_supabase"):
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        client.postgrest.auth(token)
        g._authed_supabase = client
    return g._authed_supabase


supabase = LocalProxy(_current_client)


def row_to_user(r):
    region = r.get("region")
    return {
        "id": r["id"], "name": r["name"], "role": r["role"], "region": region,
        "active": r["active"], "title": r.get("title") or "",
        "regions": r.get("regions") or ([region] if region else []),
    }


def row_to_email(r):
    return {
        "id": r["id"], "region": r["region"], "from": r["from_addr"], "subject": r["subject"],
        "category": r["category"], "body": r["body"], "receivedAt": r["received_at"],
        "status": r["status"], "assignedTo": r.get("assigned_to"), "customerId": r.get("customer_id"),
    }


def row_to_draft(r):
    return {
        "id": r["id"], "emailId": r["email_id"], "text": r["text"], "status": r["status"],
        "createdAt": r["created_at"], "reviewerNote": r.get("reviewer_note"),
        "goodExample": r.get("good_example"),
    }


def row_to_payment(r):
    return {
        "id": r["id"], "customer": r["customer"], "region": r["region"],
        "amount": float(r["amount"]), "currency": r["currency"], "status": r["status"],
        "updatedAt": r["updated_at"],
    }


def row_to_kb_card(r):
    steps = r.get("steps") if isinstance(r.get("steps"), list) else None
    done_sections = len([s for s in steps if (s or {}).get("status") == "done"]) if steps else 0
    progress = round((done_sections / 16) * 100) if steps else 0
    return {
        "id": r["id"], "title": r["title"], "body": r["body"], "region": r["region"],
        "country": r.get("country") or r["region"], "section": r.get("section") or "general",
        "department": r.get("department") or "country_policies", "owner": r.get("owner"),
        "status": r["status"], "author": r["author"], "updatedAt": r["updated_at"],
        "assignedTo": r.get("assigned_to"), "updateRequest": r.get("update_request") or "",
        "updateRequestedBy": r.get("update_requested_by"), "updateRequestedAt": r.get("update_requested_at"),
        "steps": steps, "progress": progress, "doneSections": done_sections,
    }


def row_to_kb_revision(r):
    return {
        "id": r["id"], "cardId": r["card_id"], "title": r["title"], "body": r["body"],
        "authorId": r["author_id"], "authorName": r["author_name"], "note": r.get("note"),
        "status": r["status"], "createdAt": r["created_at"], "decidedAt": r.get("decided_at"),
        "decidedBy": r.get("decided_by"),
        "steps": r.get("steps") if isinstance(r.get("steps"), list) else None,
    }


def row_to_audit(r):
    return {"id": r["id"], "at": r["at"], "actor": r["actor"], "action": r["action"],
            "detail": r["detail"], "region": r["region"]}


def row_to_point(r):
    return {"id": r["id"], "userId": r["user_id"], "userName": r["user_name"],
            "points": float(r["points"]), "reason": r["reason"], "refId": r.get("ref_id"), "at": r["at"]}


def row_to_bot_question(r):
    return {
        "id": r["id"], "cardId": r["card_id"], "cardTitle": r["card_title"], "country": r["country"],
        "section": r["section"], "question": r["question"], "status": r["status"],
        "answer": r.get("answer"), "answeredBy": r.get("answered_by"),
        "answeredByName": r.get("answered_by_name"), "createdAt": r["created_at"],
        "answeredAt": r.get("answered_at"),
    }


def fetch_all():
    """Load every table once, mirroring the old Promise.all() initial load."""
    return {
        "users": [row_to_user(r) for r in supabase.table("users").select("*").order("id").execute().data],
        "payments": [row_to_payment(r) for r in supabase.table("payments").select("*").order("id").execute().data],
        "kb_cards": [row_to_kb_card(r) for r in supabase.table("kb_cards").select("*").order("updated_at", desc=True).execute().data],
        "kb_revisions": [row_to_kb_revision(r) for r in supabase.table("kb_revisions").select("*").order("created_at", desc=True).execute().data],
        "audit_log": [row_to_audit(r) for r in supabase.table("audit_log").select("*").order("at", desc=True).execute().data],
        "points_ledger": [row_to_point(r) for r in supabase.table("points_ledger").select("*").order("at", desc=True).execute().data],
        "bot_questions": [row_to_bot_question(r) for r in supabase.table("bot_questions").select("*").order("created_at", desc=True).execute().data],
    }
