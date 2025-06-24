"""
PARA智能文件分类工具 - 生产环境配置
用于阿里云ECS部署的生产环境配置
"""

import os
from datetime import timedelta

class ProductionConfig:
    """生产环境配置类"""
    
    # 基本配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-super-secret-key-change-this-in-production'
    DEBUG = False
    TESTING = False
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'src', 'database', 'app.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_timeout': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }
    
    # 服务器配置
    HOST = '127.0.0.1'  # 只监听本地，通过Nginx代理
    PORT = int(os.environ.get('PORT', 5002))
    
    # 302.AI API配置
    DOUBAO_API_KEY = os.environ.get('DOUBAO_API_KEY')
    DOUBAO_API_BASE = 'https://302.ai/api/v1'
    DOUBAO_MODEL = 'doubao-seed-1.6-thinking-250615'
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    UPLOAD_FOLDER = '/tmp/para-classifier-uploads'
    
    # 安全配置
    CORS_ORIGINS = ['http://localhost', 'http://127.0.0.1']  # 生产中应配置实际域名
    
    # 日志配置
    LOG_LEVEL = 'INFO'
    LOG_FILE = '/var/log/para-classifier.log'
    
    # 会话配置
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False  # 如果使用HTTPS则设为True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        
        # 创建必要的目录
        upload_folder = ProductionConfig.UPLOAD_FOLDER
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, exist_ok=True)
        
        # 配置日志
        import logging
        from logging.handlers import RotatingFileHandler
        
        # 文件日志处理器
        if not os.path.exists(os.path.dirname(ProductionConfig.LOG_FILE)):
            os.makedirs(os.path.dirname(ProductionConfig.LOG_FILE), exist_ok=True)
            
        file_handler = RotatingFileHandler(
            ProductionConfig.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        # 控制台日志处理器
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        console_handler.setLevel(logging.INFO)
        app.logger.addHandler(console_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('PARA Classifier startup')

class DevelopmentConfig:
    """开发环境配置类"""
    
    SECRET_KEY = 'dev-secret-key'
    DEBUG = False
    TESTING = False
    
    SQLALCHEMY_DATABASE_URI = 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    HOST = '0.0.0.0'
    PORT = 5002
    
    DOUBAO_API_KEY = os.environ.get('DOUBAO_API_KEY')
    DOUBAO_API_BASE = 'https://302.ai/api/v1'
    DOUBAO_MODEL = 'doubao-seed-1.6-thinking-250615'
    
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024
    UPLOAD_FOLDER = './uploads'
    
    LOG_LEVEL = 'DEBUG'

# 配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """获取当前环境配置"""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default']) 