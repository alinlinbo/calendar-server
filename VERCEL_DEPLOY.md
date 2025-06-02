# Vercel 部署指南

## 准备工作

确保您已经安装了 Vercel CLI：
```bash
npm i -g vercel
```

## 部署步骤

### 1. 登录 Vercel
```bash
vercel login
```

### 2. 初始化项目
在项目根目录运行：
```bash
vercel
```

首次部署时，Vercel 会询问一些配置问题：
- **Set up and deploy?** → Yes
- **Which scope?** → 选择您的账户
- **Link to existing project?** → No
- **What's your project's name?** → calendar-pdf-server（或您喜欢的名称）
- **In which directory is your code located?** → ./

### 3. 后续部署
```bash
vercel --prod
```

## 重要注意事项

### Puppeteer 配置
本项目使用 Puppeteer 生成 PDF，在 Vercel 上需要特殊配置：

1. **环境变量已自动配置**：
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
   - `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`

2. **函数超时时间**：
   - 所有 API 函数的最大执行时间设置为 30 秒

### API 端点

部署后，您的 API 端点将变为：
- **健康检查**: `https://your-app.vercel.app/api/health`
- **生成 PDF**: `https://your-app.vercel.app/api/generate-calendar-pdf-html`
- **测试图片**: `https://your-app.vercel.app/api/test-html-to-image`

### 使用示例

```bash
# 测试健康检查
curl https://your-app.vercel.app/api/health

# 生成 PDF
curl -X POST https://your-app.vercel.app/api/generate-calendar-pdf-html \
  -H "Content-Type: application/json" \
  -d '{"title":"2024年日历","htmlTemplate":"<html><body><h1>日历</h1></body></html>","width":1200,"height":1600}'
```

## 故障排除

### 1. Puppeteer 内存问题
如果遇到内存不足错误，可以：
- 减少图片尺寸（width/height）
- 优化 HTML 模板，减少复杂度

### 2. 超时问题
- 确保 HTML 模板不会导致无限加载
- 检查外部资源是否可以正常访问

### 3. 查看日志
```bash
vercel logs
```

## 监控和维护

1. **查看部署状态**：
   ```bash
   vercel ls
   ```

2. **查看项目信息**：
   ```bash
   vercel inspect
   ```

3. **删除部署**：
   ```bash
   vercel remove
   ```

## 成本考虑

- Vercel 免费版有以下限制：
  - 函数执行时间：10 秒（Pro 版本：30 秒）
  - 带宽：100GB/月
  - 函数调用：100GB-hrs/月

- 由于 PDF 生成是计算密集型任务，建议升级到 Pro 版本以获得更好的性能。 