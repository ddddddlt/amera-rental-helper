# Fly.io 后端部署指南

## Fly.io 优势

- ✅ **完全免费**：3 个应用
- ✅ **全球边缘部署**：访问速度快
- ✅ **自动 HTTPS**：无需配置 SSL
- ✅ **支持 Docker**：环境一致

## 准备工作

### 1. 安装 flyctl（命令行工具）

在终端中运行：

**macOS:**
```bash
brew install flyctl
```

**Windows:**
```bash
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. 登录 Fly.io

```bash
fly auth login
```

会自动打开浏览器，用 GitHub 授权登录。

---

## 部署步骤（详细）

### 第一步：打开终端

在项目目录中运行：

```bash
cd /workspace/projects
```

### 第二步：创建 Fly.io 应用

```bash
fly launch
```

按提示操作：

```
? Choose an app name (leave blank to use your default) 
→ amera-rental-api

? Select region: 
→ iad (Virginia)  ← 选择离您最近的地区

? Would you like to set up a Postgresql database now? 
→ No

? Would you like to set up an Upstash Redis database now? 
→ No

? Would you like to deploy now? 
→ No  ← 选择 No，因为我们还需要配置
```

### 第三步：修改配置（已有配置文件）

我们已经在仓库中添加了 `fly.toml`，会自动使用。

### 第四步：部署应用

```bash
fly deploy
```

等待 3-5 分钟...

### 第五步：查看状态

```bash
fly status
```

### 第六步：获取应用 URL

```bash
fly info
```

或在 Fly.io Dashboard 查看：
https://fly.io/dashboard

---

## 常见问题

### 1. 安装 flyctl 失败

**问题**: `command not found: fly`

**解决**: 
```bash
# 重新安装
curl -L https://fly.io/install.sh | sh

# 或者手动添加路径
export PATH="$HOME/.fly/bin:$PATH"
```

### 2. 登录失败

**问题**: `fly auth login` 无反应

**解决**: 
1. 手动打开浏览器访问：https://fly.io/dashboard
2. 登录后返回终端重试

### 3. 部署超时

**问题**: `fly deploy` 超时

**解决**: 
```bash
fly deploy --no-cache
```

### 4. 应用启动失败

**问题**: `instance failed to wait for start`

**解决**: 
```bash
# 查看日志
fly logs

# 重启应用
fly restart
```

---

## 获取 API URL

部署成功后，运行：

```bash
fly info | grep "URL"
```

或者在浏览器打开：
https://fly.io/dashboard

找到应用 `amera-rental-api`，点击后可以看到 URL。

**URL 格式**:
```
https://amera-rental-api.fly.dev
```

---

## 测试 API

获取 URL 后，测试健康检查：

```bash
curl https://amera-rental-api.fly.dev/api/v1/health
```

应该返回：
```json
{"status":"ok"}
```

---

## 常用命令

```bash
# 查看日志
fly logs

# 重启应用
fly restart

# 扩展实例
fly scale count 1

# 删除应用
fly apps destroy amera-rental-api
```

---

## 部署完成

获得 API URL 后，发给我，我帮您配置前端让同步功能恢复正常！

URL 格式：`https://amera-rental-api.fly.dev`

---

## 完整流程图

```
1. 安装 flyctl
   ↓
2. fly auth login
   ↓
3. cd /workspace/projects
   ↓
4. fly launch (创建应用)
   ↓
5. fly deploy (部署)
   ↓
6. 等待 3-5 分钟
   ↓
7. fly info | grep "URL"
   ↓
8. 复制 URL 发给我！
```

---

## 技术细节

### Dockerfile 说明

我们创建了优化的 Docker 镜像：

1. **Build Stage**: 编译 TypeScript
2. **Production Stage**: 运行编译后的代码
3. **多阶段构建**：减小镜像大小

### fly.toml 配置

- **app name**: amera-rental-api
- **region**: iad (Virginia)
- **port**: 8080
- **auto HTTPS**: 启用

### 环境变量

- `NODE_ENV=production`
- `PORT=8080`

---

## 遇到问题？

常见问题解决方案：

1. **flyctl 安装失败** → 使用管理员权限或 sudo
2. **登录失败** → 检查网络，或使用 VPN
3. **部署失败** → 查看日志 `fly logs`
4. **URL 打不开** → 等待 1-2 分钟让服务完全启动

---

部署成功后，把您的 URL 发给我：
```
https://amera-rental-api.fly.dev
```

我会立即帮您配置前端！😊
