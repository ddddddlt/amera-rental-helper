# GitHub 推送详细指南

## 前置检查

✅ 项目已有 git 仓库
✅ 工作区是干净的
❌ 还没有配置远程仓库

## 完整步骤

### 第一步：在 GitHub 创建仓库

1. 访问 https://github.com 并登录
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - Repository name: `camera-rental-helper`
   - Description: `相机排租助手 - 专业的相机租赁管理应用`
   - 选择 Public 或 Private
   - **不要**勾选任何初始化选项
4. 点击 "Create repository"

### 第二步：复制仓库地址

创建成功后，GitHub 会显示一个页面，找到类似这样的地址：

```
https://github.com/你的用户名/camera-rental-helper.git
```

或者如果使用 SSH：

```
git@github.com:你的用户名/camera-rental-helper.git
```

### 第三步：在终端执行命令

将下面的 `你的用户名` 替换为您实际的 GitHub 用户名，然后执行：

```bash
cd /workspace/projects

# 添加远程仓库（使用 HTTPS）
git remote add origin https://github.com/你的用户名/camera-rental-helper.git

# 或者使用 SSH（如果您配置了 SSH key）
# git remote add origin git@github.com:你的用户名/camera-rental-helper.git

# 查看远程仓库是否添加成功
git remote -v

# 推送到 GitHub
git push -u origin main
```

### 如果遇到问题

#### 问题1：提示 "remote origin already exists"
解决方法：
```bash
# 先删除旧的 remote
git remote remove origin

# 再重新添加
git remote add origin https://github.com/你的用户名/camera-rental-helper.git
```

#### 问题2：提示需要登录
解决方法：
- 使用 HTTPS 方式时，输入 GitHub 用户名和密码（或 Personal Access Token）
- 建议配置 SSH key 避免每次输入密码

#### 问题3：分支名称不是 main
如果您的默认分支是 `master` 而不是 `main`：
```bash
# 推送到 master 分支
git push -u origin master

# 或者重命名分支为 main
git branch -M main
git push -u origin main
```

### 验证推送成功

1. 刷新您的 GitHub 仓库页面
2. 应该能看到所有的代码文件
3. 包括 `public/` 目录、`vercel.json`、`netlify.toml` 等

### 下一步：部署到 Vercel

代码推送到 GitHub 后，就可以部署了：

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 选择您的 `camera-rental-helper` 仓库
4. 配置：
   - Output Directory: `public`
   - 其他保持默认
5. 点击 "Deploy"
6. 等待 1-2 分钟，获得永久链接！

## 快速命令参考

```bash
# 查看当前状态
git status

# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin <你的仓库地址>

# 推送代码
git push -u origin main

# 如果有新的更改需要提交
git add .
git commit -m "更新描述"
git push
```

## 获取帮助

如果遇到任何问题，可以：
1. 查看 GitHub 官方文档：https://docs.github.com
2. 检查 git 错误信息，根据提示解决
3. 使用 `git --help` 查看命令帮助
