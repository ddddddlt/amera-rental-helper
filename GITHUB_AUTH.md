# GitHub 身份验证指南

## 问题说明

GitHub 不再支持密码验证，需要使用 Personal Access Token 或 SSH Key。

## 方案一：使用 Personal Access Token（推荐，最简单）

### 步骤：

1. **创建 Personal Access Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 填写：
     - Note: `Camera Rental Helper`
     - Expiration: 选择 `No expiration`（或按需要选择）
     - Scopes: 勾选 `repo`（完整仓库访问权限）
   - 点击 "Generate token"
   - **重要**：立即复制生成的 token（类似 `ghp_xxxxxxxxxxxx`），只显示一次！

2. **使用 Token 推送**

#### 方法 A：在 URL 中包含 Token（临时）

```bash
cd /workspace/projects

# 先移除旧的 remote
git remote remove origin

# 添加新的 remote，包含 token
# 将下面的 YOUR_TOKEN 替换为刚才复制的 token
git remote add origin https://YOUR_TOKEN@github.com/ddddddlt/amera-rental-helper.git

# 推送
git push -u origin main
```

#### 方法 B：使用 credential helper（推荐，更安全）

```bash
cd /workspace/projects

# 配置 credential helper
git config --global credential.helper store

# 推送时输入用户名和 token
git push -u origin main
# Username: 您的 GitHub 用户名
# Password: 粘贴您的 Personal Access Token
```

---

## 方案二：使用 SSH Key（更安全，长期使用）

### 步骤：

1. **生成 SSH Key**
```bash
# 生成 SSH Key（一路回车即可）
ssh-keygen -t ed25519 -C "your-email@example.com"

# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加私钥
ssh-add ~/.ssh/id_ed25519
```

2. **添加公钥到 GitHub**
```bash
# 复制公钥
cat ~/.ssh/id_ed25519.pub
```
   - 访问：https://github.com/settings/keys
   - 点击 "New SSH key"
   - Title: `Camera Rental Helper`
   - Key type: `Authentication Key`
   - Key: 粘贴刚才复制的公钥
   - 点击 "Add SSH key"

3. **使用 SSH 推送**
```bash
cd /workspace/projects

# 移除旧的 remote
git remote remove origin

# 添加 SSH remote
git remote add origin git@github.com:ddddddlt/amera-rental-helper.git

# 推送
git push -u origin main
```

---

## 方案三：使用 GitHub CLI（最简单，如果已安装）

如果安装了 GitHub CLI：

```bash
# 登录
gh auth login

# 按照提示选择：
# - GitHub.com
# - HTTPS
# - Login with a web browser

# 然后推送
git push -u origin main
```

---

## 推荐操作步骤

我推荐使用**方案一的方法 A**，最快最简单：

1. 去 https://github.com/settings/tokens 创建 token
2. 复制 token（以 `ghp_` 开头）
3. 执行以下命令（替换 YOUR_TOKEN）：

```bash
cd /workspace/projects
git remote remove origin
git remote add origin https://YOUR_TOKEN@github.com/ddddddlt/amera-rental-helper.git
git push -u origin main
```

---

## 推送成功后

代码推送到 GitHub 后，就可以去 Vercel 部署了：

1. 访问 https://vercel.com
2. New Project → 选择您的仓库
3. Output Directory 填 `public`
4. 点击 Deploy
5. 获得永久链接！

---

## 常见问题

**Q: Token 忘记保存了怎么办？**
A: 重新生成一个新的 token，旧的可以删除。

**Q: Token 安全吗？**
A: 只要不分享给别人就安全，可以随时在 GitHub 设置中撤销 token。

**Q: 可以只给 token 设置过期时间吗？**
A: 可以，建议设置过期时间更安全，但过期后需要重新生成。
