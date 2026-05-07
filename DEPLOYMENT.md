# 部署指南

本页面支持多种静态托管平台部署，以下是详细的部署步骤。

## 前置准备

确保您的项目已经推送到 GitHub、GitLab 或 Bitbucket 等代码托管平台。

## 方案一：Vercel 部署（推荐）

### 步骤：

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择您的相机排租助手仓库
   - 点击 "Import"

3. **配置项目**
   - Project Name: `camera-rental-website`（或自定义名称）
   - Framework Preset: `Other`
   - Root Directory: 保持默认
   - Build Command: 留空
   - Output Directory: `public`

4. **部署**
   - 点击 "Deploy"
   - 等待 1-2 分钟
   - 部署完成后会获得一个类似 `https://xxx.vercel.app` 的链接

### 优势：
- ✅ 完全免费
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 推送代码自动部署
- ✅ 无限域名

---

## 方案二：Netlify 部署

### 步骤：

1. **访问 Netlify**
   - 打开 https://netlify.com
   - 使用 GitHub 账号登录

2. **添加新站点**
   - 点击 "Add new site" → "Import an existing project"
   - 选择 GitHub
   - 授权并选择您的仓库

3. **配置部署**
   - Branch to deploy: `main` 或 `master`
   - Base directory: 留空
   - Build command: 留空
   - Publish directory: `public`

4. **部署**
   - 点击 "Deploy site"
   - 等待部署完成
   - 会获得一个类似 `https://xxx.netlify.app` 的链接

### 优势：
- ✅ 完全免费
- ✅ 拖拽部署（可选）
- ✅ 表单处理
- ✅ A/B 测试
- ✅ 自动 HTTPS

---

## 方案三：GitHub Pages

### 步骤：

1. **启用 GitHub Pages**
   - 进入您的 GitHub 仓库
   - 点击 "Settings"
   - 左侧菜单选择 "Pages"

2. **配置源**
   - Source: `Deploy from a branch`
   - Branch: 选择 `main` 或 `master`
   - Folder: 选择 `/ (root)` 或 `/docs`

3. **保存并等待**
   - 点击 "Save"
   - 等待 1-2 分钟
   - 刷新页面查看部署状态

4. **获取链接**
   - 部署成功后会显示访问链接
   - 格式：`https://your-username.github.io/repo-name/`

### 注意事项：
- ⚠️ 需要将 `public` 目录内容移动到根目录或 `docs` 目录
- ⚠️ 域名路径可能包含仓库名

---

## 方案四：Cloudflare Pages

### 步骤：

1. **访问 Cloudflare Pages**
   - 打开 https://pages.cloudflare.com
   - 登录 Cloudflare 账号

2. **创建项目**
   - 点击 "Create a project" → "Connect to Git"
   - 选择 GitHub 并授权
   - 选择您的仓库

3. **配置构建**
   - Project name: 自定义名称
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `public`

4. **部署**
   - 点击 "Save and Deploy"
   - 等待部署完成

### 优势：
- ✅ 完全免费
- ✅ Cloudflare 全球网络
- ✅ 无限带宽
- ✅ DDoS 防护

---

## 自定义域名

所有平台都支持绑定自定义域名：

### Vercel:
1. 进入项目 Settings → Domains
2. 输入您的域名
3. 按照提示配置 DNS

### Netlify:
1. 进入 Site settings → Domain management
2. 点击 "Add custom domain"
3. 按照提示配置 DNS

---

## 本地预览

在部署前，您可以在本地预览页面：

### 方法一：使用 Python
```bash
cd public
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

### 方法二：使用 Node.js
```bash
npx serve public
# 然后访问显示的地址
```

### 方法三：使用 VS Code
安装 "Live Server" 扩展，右键 `public/index.html` → "Open with Live Server"

---

## 文件结构说明

```
/workspace/projects/
├── public/
│   └── index.html          # 主页面文件
├── vercel.json             # Vercel 配置
├── netlify.toml            # Netlify 配置
└── DEPLOYMENT.md           # 本文件
```

---

## 常见问题

### Q: 部署后页面空白？
A: 检查 `public` 目录是否正确配置为输出目录。

### Q: 如何更新页面？
A: 推送代码到 GitHub，平台会自动重新部署。

### Q: 可以部署到多个平台吗？
A: 可以！同一个仓库可以同时部署到 Vercel、Netlify 等多个平台。

### Q: 部署的网站是永久的吗？
A: 是的，只要您的仓库存在，部署就会一直有效。

---

## 推荐选择

- **最简单**：Vercel（一键部署，体验最好）
- **功能最多**：Netlify（表单、A/B测试等）
- **最稳定**：Cloudflare Pages（Cloudflare 网络加持）

选择任意一个都可以，都能获得永久的访问链接！
