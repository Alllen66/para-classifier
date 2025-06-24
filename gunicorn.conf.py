"""
Gunicorn配置文件 - 用于生产环境部署
PARA智能文件分类工具
"""

import multiprocessing
import os

# 服务器套接字
bind = "127.0.0.1:5002"
backlog = 2048

# 工作进程
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 300
keepalive = 2

# 最大请求数（防止内存泄漏）
max_requests = 1000
max_requests_jitter = 100

# 重启设置
preload_app = True
reload = False

# 用户和组
user = "para-app"
group = "para-app"

# 日志
accesslog = "/var/log/para-classifier-access.log"
errorlog = "/var/log/para-classifier-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程命名
proc_name = "para-classifier"

# 临时目录
tmp_upload_dir = "/tmp"

# SSL/TLS（如果需要）
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# 安全
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

def when_ready(server):
    """服务器启动完成时的回调"""
    server.log.info("PARA Classifier Server is ready. Listening on: %s", server.address)

def worker_int(worker):
    """工作进程收到SIGINT信号时的回调"""
    worker.log.info("worker received INT or QUIT signal")

def pre_fork(server, worker):
    """工作进程fork前的回调"""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    """工作进程fork后的回调"""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def worker_abort(worker):
    """工作进程异常终止时的回调"""
    worker.log.info("worker received SIGABRT signal") 