#!/bin/bash

# PARA智能文件分类工具 - 简化本地启动脚本
set -e

echo "🏠 PARA智能文件分类工具 - 本地Web版启动"
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查项目结构
if [ ! -d "para-file-classifier" ] || [ ! -d "para-classifier-frontend" ]; then
    echo -e "${RED}❌ 错误: 项目目录不完整${NC}"
    echo "请确保在项目根目录运行，并包含以下目录："
    echo "  ├── para-file-classifier/"
    echo "  └── para-classifier-frontend/"
    exit 1
fi

# 检查 Python
echo -e "${YELLOW}检查 Python 环境...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ 请先安装 Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python 环境正常${NC}"

# 检查 Node.js
echo -e "${YELLOW}检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 请先安装 Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 环境正常${NC}"

# 设置后端
echo -e "${YELLOW}设置后端环境...${NC}"
cd para-file-classifier

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 安装后端依赖
echo "安装后端依赖..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "${GREEN}✅ 后端环境设置完成${NC}"

# 设置前端
echo -e "${YELLOW}构建前端...${NC}"
cd ../para-classifier-frontend

# 安装并构建前端
if command -v pnpm &> /dev/null; then
    echo "使用 pnpm 安装依赖..."
    pnpm install
    pnpm run build
else
    echo "使用 npm 安装依赖..."
    npm install
    npm run build
fi

echo -e "${GREEN}✅ 前端构建完成${NC}"

# 启动应用
echo -e "${YELLOW}启动应用...${NC}"
cd ../para-file-classifier
source venv/bin/activate

echo ""
echo -e "${GREEN}🎉 PARA文件分类工具启动成功！${NC}"
echo ""
echo "📱 访问地址: http://localhost:5002"
echo "🔧 停止服务: 按 Ctrl+C"
echo ""

# 启动 Flask 应用
python src/main.py 