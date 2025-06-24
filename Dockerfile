# 使用官方Python镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# 复制项目文件
COPY . .

# 安装Python依赖
WORKDIR /app/para-file-classifier
RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 构建前端
WORKDIR /app/para-classifier-frontend
RUN npm install --registry=https://registry.npmmirror.com
RUN npm run build
RUN cp -r dist/* ../para-file-classifier/src/static/

# 回到Python项目目录
WORKDIR /app/para-file-classifier

# 暴露端口
EXPOSE 5002

# 设置环境变量
ENV SECRET_KEY=your-production-secret-key
ENV FLASK_DEBUG=False

# 启动命令
CMD ["python", "src/main.py"] 