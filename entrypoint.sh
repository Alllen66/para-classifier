#!/bin/sh
set -e

# 默认端口
PORT=${PORT:-5002}

# 执行 gunicorn
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 "src.main:app" 