const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');

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

module.exports = async (req, res) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}; 