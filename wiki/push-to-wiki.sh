#!/usr/bin/env bash
# 将 wiki/ 目录下的 Markdown 文件推送到 GitHub Wiki
# 使用前请先在 GitHub 仓库的 Wiki 页面点击 "Create the first page" 初始化 Wiki

set -e
REPO_WIKI="https://github.com/RSnew/xiaoerGame.wiki.git"
TMPDIR=$(mktemp -d)

echo "⏳ 克隆 Wiki 仓库..."
git clone "$REPO_WIKI" "$TMPDIR"

echo "📄 复制 Wiki 页面..."
cp -f "$(dirname "$0")"/*.md "$TMPDIR/"

cd "$TMPDIR"
git add -A
git commit -m "Update wiki: characters, enemies, cards, glossary" || echo "没有新更改"
git push

echo "✅ Wiki 已更新！访问: https://github.com/RSnew/xiaoerGame/wiki"
rm -rf "$TMPDIR"
