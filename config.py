import os

# The publishable key is safe to ship — row access is governed by RLS
# policies on the Supabase side (open for this prototype). Same project the
# React app used; only the serving layer is changing to Flask.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ehljzeocpaxjvdjidext.supabase.co")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY", "sb_publishable_kYYGqGEM5vyXY06_MW0BsA_okd2I8mL"
)
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")
