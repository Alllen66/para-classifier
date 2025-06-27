# PARA智能文件分类工具 - Electron桌面版

## 🚀 项目概述

这是PARA智能文件分类工具的Electron桌面版本，将原本的Web应用升级为独立的桌面应用程序。

## 📁 项目结构

```
para-file-classifier-electron/
├── main.js                    # Electron主进程
├── preload.js                # 预加载脚本
├── package.json              # 项目配置
├── build_backend.py          # Python后端打包脚本
├── renderer/                 # 前端代码（React）
│   ├── src/
│   ├── package.json
│   └── dist/                # 构建输出
├── backend/                  # 后端代码（Python Flask）
│   ├── src/
│   ├── requirements.txt
│   └── dist/                # 打包输出
├── resources/               # 应用资源
│   ├── icon.png            # Linux图标
│   ├── icon.ico            # Windows图标
│   └── icon.icns           # macOS图标
└── dist/                   # 最终应用打包输出
```

## 🛠️ 开发环境设置

### 1. 安装Node.js依赖

```bash
npm install
```

### 2. 安装前端依赖

```bash
cd renderer
npm install
cd ..
```

### 3. 安装Python依赖

```bash
cd backend
pip install -r requirements.txt
cd ..
```

## 🚀 开发和运行

### 开发模式

```bash
# 启动开发模式（同时启动前端、后端和Electron）
npm run dev

# 或者分别启动各个组件：
npm run dev:frontend    # 启动前端开发服务器
npm run dev:backend     # 启动Python后端
npm start              # 启动Electron（需要后端先运行）
```

### 生产构建

```bash
# 构建所有组件
npm run build

# 或者分别构建：
npm run build:frontend  # 构建前端
npm run build:backend   # 打包Python后端
```

### 应用打包

```bash
# 打包当前平台
npm run dist

# 打包特定平台
npm run dist:mac       # macOS
npm run dist:win       # Windows  
npm run dist:linux     # Linux
```

## 🔧 配置说明

### Python后端配置

- **端口**: 5002 (固定)
- **数据库**: SQLite，存储在用户数据目录
- **API Key**: 运行时输入，不持久化存储

### Electron配置

- **窗口大小**: 1200x800 (最小800x600)
- **安全设置**: 启用上下文隔离，禁用Node.js集成
- **文件访问**: 通过IPC安全访问文件系统

## 📦 应用图标

需要为不同平台准备图标文件：

- **macOS**: `resources/icon.icns` (512x512 px)
- **Windows**: `resources/icon.ico` (256x256 px)  
- **Linux**: `resources/icon.png` (512x512 px)

## 🔍 功能特性

### 相比Web版本的优势

- ✅ **原生文件夹选择**: 使用系统原生对话框
- ✅ **完整文件系统访问**: 无浏览器安全限制
- ✅ **离线运行**: 无需网络连接
- ✅ **独立安装**: 作为独立应用安装使用
- ✅ **自动更新**: 支持应用自动更新（可选）

### 核心功能

- 🤖 **AI智能分析**: 使用豆包AI分析文件内容
- 📁 **PARA方法分类**: 按Projects/Areas/Resources/Archive分类
- 🔍 **批量处理**: 支持大量文件同时分析
- 📊 **可视化结果**: 直观展示分类建议
- 🚀 **一键迁移**: 确认后自动移动文件

## 🐛 调试和故障排除

### 开发模式调试

- 开发模式会自动打开DevTools
- 后端日志会在终端显示
- 前端热重载支持代码实时更新

### 常见问题

1. **Python后端启动失败**
   - 检查Python环境和依赖是否正确安装
   - 确认端口5002未被占用

2. **文件夹选择不工作**
   - 确认在Electron环境中运行
   - 检查IPC通信是否正常

3. **应用打包失败**
   - 确保所有依赖已正确安装
   - 检查Python后端是否已成功打包

## 📝 开发计划

- [ ] 添加应用自动更新功能
- [ ] 支持自定义AI模型配置
- [ ] 添加文件预览功能
- [ ] 支持多语言界面
- [ ] 集成更多文件分析方式

## 📄 许可证

MIT License - 详见LICENSE文件

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进这个项目！ 