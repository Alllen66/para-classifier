#!/usr/bin/env bash
set -e

# 项目根目录
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
PKG_DIR="${ROOT_DIR}/_package"
OUTPUT="${ROOT_DIR}/para-classifier-package.tar.gz"

echo "📦 开始打包 PARA 文件分类工具..."

# 1. 清理旧产物
rm -rf "$ROOT_DIR/para-classifier-frontend/dist" || true
rm -rf "$PKG_DIR" "$OUTPUT" || true

# 2. 构建前端
cd "$ROOT_DIR/para-classifier-frontend"
# 如果使用 pnpm 则优先 pnpm，否则用 npm
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm run build
else
  npm ci --legacy-peer-deps
  npm run build
fi
cd "$ROOT_DIR"

# 3. 创建临时目录并复制后端代码
mkdir -p "$PKG_DIR"
cp -r para-file-classifier "$PKG_DIR/"

# 4. 复制额外配置文件（如果存在）
for f in production-config.py gunicorn.conf.py; do
  [ -f "$f" ] && cp "$f" "$PKG_DIR/" || true
done

# 5. 备份前端 dist (可选)
cp -r para-classifier-frontend/dist "$PKG_DIR/frontend_dist" || true

# 6. 清理无用文件
find "$PKG_DIR" -type d -name "__pycache__" -exec rm -rf {} + || true
find "$PKG_DIR" -type f -name "*.pyc" -delete || true

# 7. 压缩
 tar -czf "$OUTPUT" -C "$PKG_DIR" .

# 8. 清理临时目录
rm -rf "$PKG_DIR"

echo "✅ 打包完成 -> $OUTPUT" 