from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify

from config import SUPABASE_URL, SUPABASE_ANON_KEY
from core.auth import current_user
from core.supabase_client import supabase

bp = Blueprint("auth", __name__)


@bp.route("/login")
def login():
    if current_user():
        return redirect(url_for("payments.hub"))
    return render_template(
        "auth/login.html",
        supabase_url=SUPABASE_URL, supabase_anon_key=SUPABASE_ANON_KEY,
        restoring=False, nav=[], user=None,
    )


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
    row = supabase.table("users").select("*").eq("id", email).limit(1).execute().data
    if not row or not row[0]["active"]:
        return jsonify({"error": "This noon ID is not authorized for the Ops Console. "
                                 "Ask Gaurav to add you as a team member."}), 403
    session["user_id"] = email
    return jsonify({"ok": True})


@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("auth.login"))
