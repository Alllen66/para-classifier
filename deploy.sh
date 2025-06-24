#!/bin/bash

echo "🚀 开始部署PARA智能文件分类工具..."

# 更新代码
echo "📥 拉取最新代码..."
git pull origin main

# Docker部署
echo "🐳 启动Docker容器..."
docker-compose down
docker-compose up --build -d

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me):5002"
echo "📋 查看日志: docker logs -f para-classifier-app" 