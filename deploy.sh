#!/bin/bash

# ArchiView-3D 项目部署脚本
# 用于将优化后的项目部署到 GitHub Pages

echo "🚀 开始部署 ArchiView-3D 项目到 manreyzd2.0 仓库..."

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json，确保在项目根目录中"
    exit 1
fi

# 构建项目
echo "🏗️  正在构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请修复错误后再试"
    exit 1
fi

echo "✅ 构建成功"

# 检查是否已经连接到正确的远程仓库
REMOTE_URL=$(git remote get-url origin)
TARGET_REPO="https://github.com/1765744108-droid/manreyzd2.0.git"

if [ "$REMOTE_URL" != "$TARGET_REPO" ]; then
    echo "🔧 更改远程仓库地址到 $TARGET_REPO"
    git remote set-url origin $TARGET_REPO
    if [ $? -ne 0 ]; then
        echo "❌ 无法更改远程仓库地址，请检查权限"
        exit 1
    fi
fi

echo "🔧 确保仓库是最新的"
git pull origin main --no-edit

# 检查 gh-pages 分支是否存在
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "🔄 gh-pages 分支已存在，更新该分支..."
else
    echo "🆕 创建 gh-pages 分支..."
    git checkout --orphan gh-pages
    git reset --hard
    git commit --allow-empty -m "Initial gh-pages commit"
    git checkout main
fi

# 保存当前分支名称
CURRENT_BRANCH=$(git branch --show-current)

# 提交当前更改
echo "📝 提交当前更改到 main 分支..."
git add .
if [ -n "$(git status --porcelain)" ]; then
    git commit -m "chore: 更新项目优化"
fi

# 推送 main 分支
echo "📤 推送 main 分支到远程仓库..."
git push origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
    echo "❌ 推送 main 分支失败，请检查认证设置"
    exit 1
fi

# 构建项目
npm run build

# 切换到 gh-pages 分支
echo "🔄 切换到 gh-pages 分支..."
git checkout gh-pages

# 清空当前内容
git rm -rf .

# 复制构建内容
cp -r dist/* .

# 添加 CNAME 文件（如果您有自己的域名）
# echo "your-domain.com" > CNAME

# 添加所有文件
git add .

# 提交更改
git commit -m "chore: 部署 $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程 gh-pages 分支
echo "📤 推送构建内容到 gh-pages 分支..."
git push origin gh-pages

if [ $? -eq 0 ]; then
    # 切回原来的分支
    git checkout "$CURRENT_BRANCH"
    
    echo "🎉 部署成功!"
    echo ""
    echo "您的应用将在以下地址可用:"
    echo "https://1765744108-droid.github.io/manreyzd2.0/"
    echo ""
    echo "💡 如果页面没有立即更新，请等待几分钟或强制刷新浏览器"
else
    echo "❌ 推送 gh-pages 分支失败"
    echo "请确保您有向该仓库推送的权限"
    git checkout "$CURRENT_BRANCH"
    exit 1
fi