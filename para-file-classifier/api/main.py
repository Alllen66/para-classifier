import os
import sys

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.main import app

# Vercel需要这个变量名
def handler(request):
    return app(request.environ, lambda status, headers: None) 