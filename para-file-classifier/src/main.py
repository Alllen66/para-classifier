import os
import sys
import pathlib
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp
from src.routes.classifier import classifier_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'change-this-secret-key-in-production')

# 启用 CORS
CORS(app)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(classifier_bp, url_prefix='/api')

# 将 SQLite 文件放到 /tmp，可通过环境变量覆盖
db_path = pathlib.Path(os.environ.get("DB_PATH", "/tmp/app.db"))
db_path.parent.mkdir(parents=True, exist_ok=True)     # 确保目录存在

app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path: str):
    static_folder_path = app.static_folder

    # 根路径直接返回 index.html（与 Vite 构建结果保持一致）
    if path == "":
        return send_from_directory(static_folder_path, "index.html")

    # 其它静态资源
    file_path = os.path.join(static_folder_path, path)
    if os.path.exists(file_path):
        return send_from_directory(static_folder_path, path)

    # 兜底：前端是单页应用，所有未知路径都回到 index.html
    return send_from_directory(static_folder_path, "index.html")

@app.route('/health')
def health():
    return "OK", 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
