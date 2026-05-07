# Render 部署指南

## 简介

Render 是一个现代化的云平台，提供免费的 Node.js、Python、Go 等后端服务部署。本指南将帮助您将相机排租助手的后端 API 部署到 Render。

## 部署步骤

### 第一步：注册 Render 账号

1. 访问 https://render.com
2. 点击 **"Get Started"** 或 **"Sign Up"**
3. 选择 **"GitHub"** 登录（推荐）
4. 授权 Render 访问您的 GitHub 账号

### 第二步：创建 Web Service

1. 登录后，点击 **"New +"**
2. 选择 **"Web Service"**

### 第三步：连接 GitHub 仓库

1. 在 "Connect a repository" 页面
2. 找到并选择 **`amera-rental-helper`** 仓库
3. 如果需要，点击 **"Install Render"** 授权访问

### 第四步：配置 Web Service

在配置页面填写以下信息：

```
Name:
[ camera-rental-api                    ]  ← 服务名称

Language:
[ Node                                ]  ← 选择 Node

Region:
[ Oregon (US West)                    ]  ← 选择离您近的区域

Branch:
[ main                                ]  ← main 分支

Root Directory:
[ server                              ]  ← 重要！填写 server

Instance Type:
[ Free                                ]  ← 免费实例

```

### 第五步：设置构建和启动命令

```
Build Command:
[ npm install                         ]  ← 构建命令

Start Command:
[ npm start                           ]  ← 启动命令
```

### 第六步：环境变量（可选）

点击 **"Advanced"**，然后 **"Add Environment Variable"**：

```
NODE_ENV:
[ production                          ]
```

### 第七步：创建服务

1. 配置完成后，点击 **"Create Web Service"**
2. 等待几分钟让 Render 构建和部署...
3. 完成后会显示服务 URL，如：
   ```
   https://camera-rental-api.onrender.com
   ```

---

## 部署成功后的操作

### 第一步：获取 API 地址

部署成功后，Render 会显示您的 API 地址，类似：
```
https://camera-rental-api.onrender.com
```

**复制这个地址！**

### 第二步：更新前端配置

在浏览器中打开这个地址，确认后端运行正常：
```
https://camera-rental-api.onrender.com/api/v1/health
```

应该返回：
```json
{"status":"ok","timestamp":"..."}
```

### 第三步：更新前端 API 地址

我会在代码中更新 API 地址为您的新 Render URL。

---

## API 端点

您的后端 API 提供以下端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/health` | GET | 健康检查 |
| `/api/v1/devices` | GET/POST | 设备管理 |
| `/api/v1/tenants` | GET/POST | 租客管理 |
| `/api/v1/orders` | GET/POST | 订单管理 |
| `/api/v1/sync` | GET/POST/DELETE | 数据同步 |

---

## 常见问题

### Q: Render 免费版有什么限制？

A: 
- 每月 750 小时免费（足够个人使用）
- 闲置 15 分钟后会自动休眠
- 首次访问会唤醒（需要等待几秒）
- 休眠后重新部署需要约 30 秒

### Q: 如何保持服务常驻？

A: 免费版会自动休眠。您可以：
1. 升级到付费版（$7/月）
2. 使用 UptimeRobot 等监控服务定期 ping
3. 接受首次访问需要等待 30 秒

### Q: 如何查看日志？

A: 
1. 在 Render Dashboard 点击您的服务
2. 点击 **"Logs"** 标签
3. 可以看到实时的构建和运行日志

---

## 重要提示

- Render 免费版的实例会在 15 分钟无活动后休眠
- 休眠后首次访问需要约 30 秒唤醒
- 数据同步功能在服务器休眠时无法使用
- 建议定期使用应用保持服务活跃

---

## 下一步

部署成功后，请告诉我您的 Render API 地址，我会帮您更新前端配置！

示例：
```
https://camera-rental-api.onrender.com
```

祝部署成功！🎉
