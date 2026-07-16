from functools import wraps

from flask import session, redirect, url_for, g

from core.supabase_client import supabase, row_to_user


def load_current_user():
    """Cache the signed-in team-member row (users table) on flask.g for this request."""
    if not hasattr(g, "_current_user"):
        user_id = session.get("user_id")
        g._current_user = None
        if user_id:
            res = supabase.table("users").select("*").eq("id", user_id).limit(1).execute()
            if res.data:
                g._current_user = row_to_user(res.data[0])
    return g._current_user


def current_user():
    return load_current_user()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = load_current_user()
        if not user or not user["active"]:
            session.clear()
            return redirect(url_for("auth.login"))
        return view(*args, **kwargs)
    return wrapped


def context_required(view):
    """Like login_required, but also gates on a chosen country + department —
    no section shows data until both are picked (mirrors VendorFlow's
    admin_select_business_context gate)."""
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if not session.get("country") or not session.get("department"):
            return redirect(url_for("auth.select_context"))
        return view(*args, **kwargs)
    return wrapped


def roles_required(*roles):
    def decorator(view):
        @wraps(view)
        @context_required
        def wrapped(*args, **kwargs):
            if current_user()["role"] not in roles:
                return redirect(url_for("payments.hub"))
            return view(*args, **kwargs)
        return wrapped
    return decorator


def visible_nav():
    from core.logic import NAV
    user = current_user()
    if not user:
        return []
    return [n for n in NAV if user["role"] in n["roles"]]
