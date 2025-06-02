# Calendar PDF Server v2.0

一个基于Node.js + Express + PDFKit的日历PDF生成服务器，支持图片上传拼接模式。

## 🔄 架构升级

**v2.0 重大更新：**
- ❌ 移除Canvas渲染依赖，不再需要Linux环境
- ✅ 改为图片上传模式，前端生成图片，后端拼接PDF
- ✅ 支持跨平台运行（Linux/macOS/Windows）
- ✅ 更轻量级，更稳定

## 🏗️ 工作流程

1. **前端**: 使用Vue组件渲染12个月份的日历
2. **前端**: 将每个月份转换为图片（PNG/JPG）
3. **前端**: 通过multipart/form-data上传图片到后端
4. **后端**: 接收图片并拼接成A4格式的PDF
5. **前端**: 下载生成的PDF文件

## 🚀 快速开始

### 系统要求

- **Node.js**: >= 18.0.0
- **操作系统**: Linux/macOS/Windows (全平台支持)

### 安装和启动

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 开发模式
npm run dev
```

## 📋 API接口

### 健康检查
```http
GET /api/health
```

**响应示例:**
```json
{
  "status": "ok",
  "message": "Calendar PDF Server is running (Image Upload Mode)",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 单图片上传测试
```http
POST /api/test-upload
Content-Type: multipart/form-data

form-data:
  image: [文件]
```

**用途:** 测试图片上传功能是否正常

### 多图片上传生成PDF
```http
POST /api/generate-calendar-pdf
Content-Type: multipart/form-data

form-data:
  title: "我的2025年日历"
  images: [文件1, 文件2, ..., 文件12]
```

**参数说明:**
- `title` (可选): PDF标题
- `images`: 1-12张图片文件

**支持格式:** JPG, JPEG, PNG
**文件限制:** 每个文件最大10MB

## 🎨 功能特性

- ✅ **图片上传** - 支持多文件上传
- ✅ **PDF拼接** - A4尺寸，3x4布局
- ✅ **格式验证** - 自动验证图片格式
- ✅ **文件大小限制** - 防止过大文件上传
- ✅ **错误处理** - 完善的错误提示
- ✅ **跨平台** - 无平台限制

## 💻 前端集成示例

### JavaScript/FormData方式

```javascript
async function uploadCalendarImages(imageFiles, title = '我的日历') {
  const formData = new FormData();
  
  // 添加标题
  formData.append('title', title);
  
  // 添加图片文件
  imageFiles.forEach((file, index) => {
    formData.append('images', file, `month-${index + 1}.png`);
  });
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-calendar-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      // 下载PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calendar.pdf';
      a.click();
    }
  } catch (error) {
    console.error('上传失败:', error);
  }
}
```

### Vue.js集成示例

```vue
<template>
  <div>
    <button @click="generatePDF" :disabled="loading">
      {{ loading ? '生成中...' : '生成PDF' }}
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false
    }
  },
  methods: {
    async generatePDF() {
      this.loading = true;
      
      try {
        // 1. 生成12张月份图片
        const imageFiles = await this.generateMonthImages();
        
        // 2. 上传并生成PDF
        const formData = new FormData();
        formData.append('title', '我的2025年日历');
        
        imageFiles.forEach((file) => {
          formData.append('images', file);
        });
        
        const response = await this.$http.post('/api/generate-calendar-pdf', formData, {
          responseType: 'blob'
        });
        
        // 3. 下载PDF
        this.downloadBlob(response.data, 'calendar.pdf');
        
      } catch (error) {
        console.error('生成失败:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async generateMonthImages() {
      // 使用html2canvas或类似库将日历组件转换为图片
      const images = [];
      for (let month = 1; month <= 12; month++) {
        const canvas = await this.renderMonthToCanvas(month);
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        images.push(new File([blob], `month-${month}.png`, { type: 'image/png' }));
      }
      return images;
    }
  }
}
</script>
```

## 🛠️ 开发

### 项目结构
```
src/server/
├── app.js              # 主服务器文件
├── package.json        # 依赖配置
└── README.md           # 说明文档
```

### 测试上传

```bash
# 使用curl测试单文件上传
curl -X POST http://localhost:3000/api/test-upload \
  -F "image=@test.png"

# 使用curl测试多文件上传
curl -X POST http://localhost:3000/api/generate-calendar-pdf \
  -F "title=测试日历" \
  -F "images=@month1.png" \
  -F "images=@month2.png" \
  --output calendar.pdf
```

## 🔧 故障排除

### 端口占用
修改`app.js`中的`PORT`变量。

### 上传失败
检查文件格式和大小限制：
- 支持格式：JPG, JPEG, PNG
- 文件大小：≤ 10MB
- 文件数量：≤ 12张

### PDF生成失败
确保上传的图片格式正确且未损坏。

## 📦 依赖

### 运行时依赖
- `express` - Web服务器框架
- `cors` - 跨域支持
- `pdfkit` - PDF生成库
- `multer` - 文件上传中间件

### 开发依赖
- `nodemon` - 开发热重载

## 🌟 优势

- **轻量级**: 无需Canvas编译，启动更快
- **跨平台**: 支持所有主流操作系统
- **灵活性**: 前端完全控制渲染效果
- **稳定性**: 减少了服务器端渲染的复杂性
- **可扩展**: 易于添加新功能和定制

## �� 许可证

MIT License 