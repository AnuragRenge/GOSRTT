const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generatePdfFromHtml(templateName, data) {
  const templatePath = path.join(__dirname, '..', 'templates', templateName);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders {{key}}
  for (const key in data) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key] || '');
  }

  // Replace {{year}} automatically
  html = html.replace(/{{year}}/g, new Date().getFullYear());

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return pdfBuffer;
}

module.exports = { generatePdfFromHtml };
