const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * 将 HTML 字符串渲染为图片Buffer
 * @param {string} htmlString 要渲染的 HTML 字符串。
 * @param {number} viewportWidth 视口宽度，用于截图。
 * @param {number} viewportHeight 视口高度，用于截图。
 * @returns {Promise<Buffer>} 返回PNG图片Buffer。
 * @throws {Error} 如果过程中发生错误。
 */
async function htmlToImageBuffer(htmlString, viewportWidth = 800, viewportHeight = 600) {
  console.log('[DEBUG] HTML转图片开始执行...');
  let browser;
  try {
    console.log('[DEBUG] 启动 Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--disable-font-subpixel-positioning',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      dumpio: false, // 减少日志输出
    });
    console.log('[DEBUG] Puppeteer 浏览器已启动');

    const page = await browser.newPage();
    console.log('[DEBUG] 新页面已创建');

    // 错误处理
    page.on('error', err => {
        console.error('[DEBUG] 页面错误:', err);
    });
    page.on('pageerror', pageErr => {
        console.error('[DEBUG] 页面JS错误:', pageErr);
    });

    console.log(`[DEBUG] 设置视口: ${viewportWidth}x${viewportHeight}`);
    await page.setViewport({ width: viewportWidth, height: viewportHeight });

    console.log('[DEBUG] 加载HTML内容...');
    await page.setContent(htmlString, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('[DEBUG] HTML内容加载完成');

    // 等待字体加载完成
    console.log('[DEBUG] 等待字体加载...');
    await page.evaluate(() => {
      return document.fonts.ready;
    });
    console.log('[DEBUG] 字体加载完成');

    console.log('[DEBUG] 页面截图...');
    const imageBuffer = await page.screenshot({
      type: 'png',
      timeout: 30000,
      fullPage: false // 只截取视口大小
    });
    console.log('[DEBUG] 截图完成');

    console.log('[DEBUG] 关闭浏览器...');
    await browser.close();
    browser = null;
    console.log('[DEBUG] 浏览器已关闭');

    return imageBuffer;

  } catch (error) {
    console.error('[DEBUG] htmlToImageBuffer错误:', error);
    if (browser) {
      try {
        await browser.close();
        console.log('[DEBUG] 错误时浏览器已关闭');
      } catch (closeError) {
        console.error('[DEBUG] 关闭浏览器失败:', closeError);
      }
    }
    throw error;
  }
}

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Calendar PDF Server is running (HTML Template Mode)',
    timestamp: new Date().toISOString()
  });
});

// HTML模板生成PDF接口
app.post('/api/generate-calendar-pdf-html', async (req, res) => {
  try {
    const { title, htmlTemplate, width = 1200, height = 1600 } = req.body;
    
    console.log('🎯 接收到HTML模板PDF生成请求:');
    console.log('- 标题:', title);
    console.log('- HTML模板长度:', htmlTemplate ? htmlTemplate.length : 0, '字符');
    console.log('- 图片尺寸:', `${width}x${height}`);
    
    if (!htmlTemplate || typeof htmlTemplate !== 'string') {
      return res.status(400).json({ 
        error: 'No HTML template provided',
        message: '请提供HTML模板字符串'
      });
    }
    
    if (htmlTemplate.length === 0) {
      return res.status(400).json({ 
        error: 'Empty HTML template',
        message: 'HTML模板不能为空'
      });
    }
    
    console.log('- HTML模板验证通过');
    
    // 创建PDF文档
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // 设置响应头
    const year = new Date().getFullYear();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}.pdf"`);
    
    // 将PDF流输出到响应
    doc.pipe(res);
    
    console.log('- 开始渲染HTML为图片...');
    
    try {
      // 将HTML转换为图片Buffer
      const imageBuffer = await htmlToImageBuffer(htmlTemplate, width, height);
      
      console.log('✅ HTML渲染成功');
      
      // PDF页面尺寸（A4）
      const pageWidth = doc.page.width - 100; // 减去边距
      const pageHeight = doc.page.height - 100;
      
      console.log(`- PDF页面尺寸: ${pageWidth}x${pageHeight}`);
      
      // 将图片添加到PDF（居中显示，自适应大小）
      doc.image(imageBuffer, 50, 50, { 
        width: pageWidth,
        height: pageHeight,
        fit: [pageWidth, pageHeight],
        align: 'center',
        valign: 'center'
      });
      
      console.log('- 图片已添加到PDF');
      
      // 移除标题页，只保留日历图片
      // doc.addPage();
      // doc.fontSize(24)
      //    .fillColor('#333333')
      //    .text(title || `${year}年日历`, { align: 'center' });
      // 
      // doc.moveDown();
      // doc.fontSize(12)
      //    .fillColor('#666666')
      //    .text(`生成时间: ${new Date().toLocaleString()}`, { align: 'center' });
      // 
      // doc.moveDown();
      // doc.fontSize(10)
      //    .fillColor('#999999')
      //    .text(`图片尺寸: ${width}x${height}`, { align: 'center' });
      
    } catch (renderError) {
      console.error('❌ HTML渲染失败:', renderError);
      
      // 如果渲染失败，添加错误页面
      doc.fontSize(16)
         .fillColor('#ff0000')
         .text('HTML渲染失败', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#666666')
         .text(`错误信息: ${renderError.message}`, { align: 'center' });
    }
    
    // 结束PDF文档
    doc.end();
    
    console.log('✅ HTML模板PDF生成完成');
    
  } catch (error) {
    console.error('❌ HTML模板PDF生成失败:', error);
    
    // 如果PDF已经开始生成，确保结束
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'HTML template PDF generation failed', 
        message: error.message 
      });
    }
  }
});

// 测试HTML转图片接口
app.post('/api/test-html-to-image', async (req, res) => {
  try {
    const { htmlTemplate, width = 800, height = 600 } = req.body;
    
    if (!htmlTemplate) {
      return res.status(400).json({ 
        error: 'No HTML template provided',
        message: '请提供HTML模板字符串'
      });
    }
    
    console.log('📸 接收到HTML转图片测试请求:');
    console.log('- HTML长度:', htmlTemplate.length, '字符');
    console.log('- 图片尺寸:', `${width}x${height}`);
    
    // 将HTML转换为图片Buffer
    const imageBuffer = await htmlToImageBuffer(htmlTemplate, width, height);
    
    // 返回图片
    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
    
    console.log('✅ HTML转图片测试成功');
    
  } catch (error) {
    console.error('❌ HTML转图片测试失败:', error);
    res.status(500).json({ 
      error: 'HTML to image test failed', 
      message: error.message 
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Calendar PDF Server 启动成功! (HTML模板模式)`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📋 可用接口:');
  console.log('  GET  /api/health                           - 健康检查');
  console.log('  POST /api/test-html-to-image               - HTML转图片测试');
  console.log('  POST /api/generate-calendar-pdf-html       - HTML模板生成PDF (主要功能)');
  console.log('');
  console.log('💡 HTML模板模式使用说明:');
  console.log('  - 前端发送包含12个月日历的HTML字符串');
  console.log('  - 后端使用Puppeteer渲染HTML为一张大图片');
  console.log('  - 自动生成PDF并返回');
  console.log('  - 请求体格式: { title: "标题", htmlTemplate: "<html>...</html>", width: 1200, height: 1600 }');
  console.log('');
  console.log('🎯 主要接口: POST /api/generate-calendar-pdf-html');
  console.log('   - title: PDF标题 (可选)');
  console.log('   - htmlTemplate: 包含完整日历的HTML字符串 (必需)');
  console.log('   - width: 图片宽度 (可选，默认1200)');
  console.log('   - height: 图片高度 (可选，默认1600)');
  console.log('');
  console.log('📝 使用示例:');
  console.log('   curl -X POST http://localhost:3000/api/generate-calendar-pdf-html \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"title":"2024年日历","htmlTemplate":"<html>...</html>"}\'');
  console.log('');
});

module.exports = app; 