const fetch = require('node-fetch');

// 替换为您的 Vercel 应用 URL
const BASE_URL = 'https://your-app.vercel.app';

async function testAPI() {
  console.log('🧪 开始测试 API...\n');

  // 1. 测试健康检查
  try {
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查成功:', healthData);
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
  }

  console.log('\n');

  // 2. 测试 HTML 转图片
  try {
    console.log('2️⃣ 测试 HTML 转图片...');
    const htmlTemplate = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; text-align: center; }
          </style>
        </head>
        <body>
          <h1>测试日历</h1>
          <p>这是一个测试 HTML 模板</p>
        </body>
      </html>
    `;

    const imageResponse = await fetch(`${BASE_URL}/api/test-html-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        htmlTemplate,
        width: 800,
        height: 600
      })
    });

    if (imageResponse.ok) {
      console.log('✅ HTML 转图片成功 - 返回了图片数据');
    } else {
      const errorData = await imageResponse.text();
      console.error('❌ HTML 转图片失败:', errorData);
    }
  } catch (error) {
    console.error('❌ HTML 转图片测试失败:', error.message);
  }

  console.log('\n');

  // 3. 测试 PDF 生成
  try {
    console.log('3️⃣ 测试 PDF 生成...');
    const htmlTemplate = `
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            h1 { 
              text-align: center; 
              font-size: 48px;
              margin-bottom: 30px;
            }
            .calendar { 
              background: rgba(255,255,255,0.1);
              padding: 20px;
              border-radius: 10px;
            }
          </style>
        </head>
        <body>
          <h1>2024年日历</h1>
          <div class="calendar">
            <p>这是一个测试日历 PDF 生成功能</p>
            <p>生成时间: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const pdfResponse = await fetch(`${BASE_URL}/api/generate-calendar-pdf-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '测试日历',
        htmlTemplate,
        width: 1200,
        height: 1600
      })
    });

    if (pdfResponse.ok && pdfResponse.headers.get('content-type') === 'application/pdf') {
      console.log('✅ PDF 生成成功 - 返回了 PDF 数据');
    } else {
      const errorData = await pdfResponse.text();
      console.error('❌ PDF 生成失败:', errorData);
    }
  } catch (error) {
    console.error('❌ PDF 生成测试失败:', error.message);
  }

  console.log('\n🎉 API 测试完成！');
}

// 使用说明
console.log('📋 使用说明:');
console.log('1. 将 BASE_URL 替换为您的 Vercel 应用 URL');
console.log('2. 运行: node test-deployment.js');
console.log('3. 检查测试结果\n');

// 如果是直接运行这个文件，则执行测试
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 