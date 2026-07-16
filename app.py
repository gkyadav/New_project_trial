from flask import Flask, redirect, url_for

from config import SECRET_KEY


def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY

    from blueprints.auth.routes import bp as auth_bp
    from blueprints.payments.routes import bp as payments_bp
    from blueprints.kb.routes import bp as kb_bp
    from blueprints.ai.routes import bp as ai_bp
    from blueprints.admin.routes import bp as admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(kb_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(admin_bp)

    @app.route("/")
    def index():
        return redirect(url_for("payments.hub"))

    @app.context_processor
    def inject_globals():
        from core.auth import current_user, visible_nav
        from core.logic import REGIONS, KB_TREE_REGIONS, KB_TREE_DEPTS
        return {
            "user": current_user(), "nav": visible_nav(), "regions": REGIONS,
            "kb_tree_regions": KB_TREE_REGIONS, "kb_tree_depts": KB_TREE_DEPTS,
            "kb_tab": None, "kb_dept": None, "open_card_id": None, "ai_tab": None,
        }

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
