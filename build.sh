#!/bin/bash
# 构建脚本：将 public 目录内容复制到输出目录

echo "📦 开始构建静态站点..."

# 创建输出目录（如果不存在）
mkdir -p dist

# 复制 public 目录的所有内容到 dist
cp -r public/* dist/

# 复制 public 目录的隐藏文件（如果有）
cp -r public/.??* dist/ 2>/dev/null || true

echo "✅ 构建完成！"
ls -la dist/
