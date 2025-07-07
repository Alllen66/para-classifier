# 🏠 PARA智能文件分类工具 - 本地Web版

## 🌟 项目简介

PARA智能文件分类工具是一款基于AI的文件管理助手，帮助您按照PARA方法（Projects/Areas/Resources/Archive）智能整理文件。本项目提供**完全本地部署**的Web版本，无需联网即可享受智能文件分类服务。

## ✨ 核心特性

- 🤖 **AI智能分析** - 使用豆包AI深度分析文件内容
- 📁 **PARA方法分类** - 按照Projects/Areas/Resources/Archive科学分类
- 🚀 **批量处理** - 支持大量文件同时智能分析
- 📊 **可视化展示** - 直观展示分类建议和统计信息
- ⚡ **一键迁移** - 确认后自动移动文件到对应目录
- 🏠 **完全本地** - 无需联网，保护隐私安全
- 💻 **现代UI** - 美观响应式界面，支持多种设备

## 🚀 快速开始

### 方式一：一键启动（推荐）
```bash
./启动应用.sh
```

### 方式二：使用原有脚本
```bash
chmod +x start.sh && ./start.sh
# 选择模式 2（生产模式）
```

### 方式三：手动启动
```bash
# 1. 后端设置
cd para-file-classifier
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. 前端构建
cd ../para-classifier-frontend
npm install && npm run build

# 3. 集成启动
cp -r dist/* ../para-file-classifier/src/static/
cd ../para-file-classifier
source venv/bin/activate
python src/main.py
```

## 🌐 访问应用
启动成功后，在浏览器中访问：**http://localhost:5002**

## 📋 环境要求

- **Python 3.11+**
- **Node.js 18+** 
- **可选：pnpm**（推荐，速度更快）

## 🎯 使用场景

### 个人用户
- 📚 整理学习资料和文档
- 💼 管理工作项目文件
- 🗂️ 归档个人数字资产

### 团队协作
- 🏢 标准化团队文件分类
- 📊 提高文件管理效率
- 🔍 快速定位所需文件

### 知识管理
- 🧠 构建个人知识体系
- 📖 整理研究资料
- 💡 管理创意和想法

## 🛠️ 技术架构

- **前端**: React + Vite + TailwindCSS + shadcn/ui
- **后端**: Python Flask + SQLite
- **AI服务**: 豆包AI API
- **部署**: 单机本地部署

## 📁 项目结构

```
para-file-classifier-optimized/
├── para-file-classifier/      # Python Flask 后端
│   ├── src/
│   │   ├── main.py           # 主程序入口
│   │   ├── routes/           # API路由
│   │   ├── models/           # 数据模型
│   │   └── static/           # 前端构建文件
│   └── requirements.txt      # Python依赖
├── para-classifier-frontend/  # React 前端源码
│   ├── src/
│   │   ├── components/       # React组件
│   │   ├── config/           # 配置文件
│   │   └── hooks/            # 自定义钩子
│   └── package.json          # 前端依赖
├── 启动应用.sh               # 简化启动脚本
├── start.sh                  # 完整启动脚本
└── 本地部署指南.md           # 详细部署说明
```

## 🔧 常见问题

### Q: 启动时提示Python版本错误？
A: 请确保安装 Python 3.11 或更高版本。macOS用户可使用 `brew install python@3.11`

### Q: 端口5002被占用？
A: 修改 `para-file-classifier/src/main.py` 中的端口号，或关闭占用该端口的程序

### Q: 前端构建失败？
A: 尝试删除 `node_modules` 并重新安装：`rm -rf node_modules && npm install`

### Q: AI分析不工作？
A: 请确保正确配置豆包AI的API密钥，并检查网络连接

## 🚀 部署选项

### 本地部署（推荐）
完全本地运行，隐私安全，适合个人和小团队使用。

### 云端部署
项目支持部署到 Vercel、Railway 等平台，详见 `一键部署说明.md`

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [豆包AI](https://www.doubao.com/) - 提供智能分析服务
- [PARA方法](https://fortelabs.co/blog/para/) - 文件分类理论基础
- 开源社区的各种优秀工具和库

---

**🎉 开始使用 PARA智能文件分类工具，让文件管理变得简单高效！** 