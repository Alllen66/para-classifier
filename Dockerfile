# 使用 Python 3.11 官方镜像
FROM python:3.11-slim

# 安装 Node.js（用于构建前端）
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . /app/

# 构建前端
WORKDIR /app/para-classifier-frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# ✨ 将 dist 文件夹拷贝到后端静态目录
RUN mkdir -p /app/para-file-classifier/src/static \
    && cp -a /app/para-classifier-frontend/dist/. /app/para-file-classifier/src/static/

# 切换到后端目录并安装依赖
WORKDIR /app/para-file-classifier
RUN pip install --no-cache-dir -r requirements.txt

# 复制并设置 entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 5002

# 启动命令
ENTRYPOINT ["/app/entrypoint.sh"] 