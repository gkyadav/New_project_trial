"""Shared write-side helpers used by every blueprint — server-side port of
addAudit()/awardPoints()/dbWrite() from App.jsx. Every mutation here writes
straight to Supabase and returns; there's no optimistic client state or
Realtime merge anymore (the app is server-rendered), so pages simply reload
after a POST to pick up the fresh data — see the plan's "Realtime note"."""
from core.supabase_client import supabase
from core.logic import new_id, now_minutes, POINTS


def add_audit(actor_name, action, detail, region="-"):
    entry_id = new_id("a")
    supabase.table("audit_log").insert({
        "id": entry_id, "at": now_minutes(), "actor": actor_name,
        "action": action, "detail": detail, "region": region or "-",
    }).execute()


def award_points(user_id, user_name, points, reason, ref_id=None):
    supabase.table("points_ledger").insert({
        "id": new_id("p"), "user_id": user_id, "user_name": user_name,
        "points": points, "reason": reason, "ref_id": ref_id, "at": now_minutes(),
    }).execute()
