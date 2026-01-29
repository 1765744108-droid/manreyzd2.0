# ArchiView-3D 部署指南

## 部署到 GitHub Pages

您的项目已经完成所有性能优化，现在需要部署到 GitHub Pages。

### 自动部署（推荐）

1. 运行部署脚本：
   ```bash
   ./deploy.sh
   ```

2. 部署完成后，您的应用将在以下地址可用：
   https://1765744108-droid.github.io/mryzdyt/

### 手动部署

如果您无法运行脚本，请按照以下步骤手动部署：

1. 确保所有更改都已提交：
   ```bash
   git add .
   git commit -m "chore: 更新项目优化"
   git push origin main
   ```

2. 构建项目：
   ```bash
   npm run build
   ```

3. 创建并切换到 gh-pages 分支：
   ```bash
   git checkout -b gh-pages
   ```

4. 清空分支内容并复制构建文件：
   ```bash
   git rm -rf .
   cp -r dist/* .
   ```

5. 提交并推送 gh-pages 分支：
   ```bash
   git add .
   git commit -m "chore: 部署到 gh-pages"
   git push origin gh-pages
   ```

6. 切换回 main 分支：
   ```bash
   git checkout main
   ```

### 配置 GitHub Pages

1. 访问 GitHub 仓库页面
2. 点击 "Settings" 标签
3. 向下滚动到 "Pages" 部分
4. 在 "Source" 部分选择 "Deploy from a branch"
5. 选择 "gh-pages" 分支和 "/root" 文件夹
6. 点击 "Save"

### 项目优化特性

部署版本包含以下优化：

- React.memo 比较函数优化，减少不必要的重渲染
- 材质设置缓存，提高渲染性能
- 模型预加载，加快首次渲染
- Gzip 和 Brotli 压缩，减小文件体积
- 内存泄漏修复，提升稳定性
- 类型安全改进，减少运行时错误
- 加载进度指示器，改善用户体验

### 访问您的应用

部署完成后，您的 3D 模型查看器将在以下地址可用：
https://1765744108-droid.github.io/mryzdyt/