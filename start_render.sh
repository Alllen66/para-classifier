#!/bin/bash

echo "🚀 启动PARA智能文件分类工具..."

# 设置端口
export PORT=${PORT:-5002}

# 进入后端目录并启动
cd para-file-classifier
python src/main.py 