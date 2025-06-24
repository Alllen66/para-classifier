# PARA智能文件分类工具

## 项目简介

PARA智能文件分类工具是一个基于AI的文件自动分类系统，帮助用户按照PARA（Projects、Areas、Resources、Archive）方法论智能整理文件。

## 技术栈

- **后端**: Flask + Python 3.11
- **前端**: React + Vite + Tailwind CSS  
- **AI服务**: 302.AI API (豆包模型)
- **数据库**: SQLite

## 功能特点

- 🤖 智能AI文件分类
- 📁 支持PARA方法论
- 🔍 文件内容分析
- 📊 可视化分类结果
- 🚀 批量文件迁移
- 💬 歧义文件讨论

## 安装部署

### 环境要求

- Python 3.11+
- Node.js 16+
- 302.AI API Key

### 1. 克隆项目

```bash
git clone https://github.com/Alllen66/para-classifier.git
cd para-classifier
```

### 2. 后端安装

```bash
cd para-file-classifier
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 前端安装

```bash
cd para-classifier-frontend
npm install
```

### 4. 环境配置

设置环境变量：

```bash
export SECRET_KEY="your-secret-key-here"
export FLASK_DEBUG="False"  # 生产环境设为False
```

### 5. 运行项目

**开发模式**：
```bash
# 后端
cd para-file-classifier
python src/main.py

# 前端
cd para-classifier-frontend
npm run dev
```

**生产模式**：
```bash
# 构建前端
cd para-classifier-frontend
npm run build

# 复制构建文件到后端
cp -r dist/* ../para-file-classifier/src/static/

# 启动后端
cd ../para-file-classifier
gunicorn -c gunicorn.conf.py src.main:app
```

## 使用说明

1. 打开web界面
2. 输入302.AI API Key
3. 选择源文件夹和目标文件夹
4. 点击开始分析
5. 查看分类结果
6. 确认后执行迁移

## API文档

### 主要接口

- `POST /api/test-api-key` - 测试API Key
- `POST /api/analyze` - 开始文件分析
- `GET /api/classification/{task_id}` - 获取分析状态
- `POST /api/migrate` - 执行文件迁移

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 支持

如有问题请提交Issue或联系开发者。 