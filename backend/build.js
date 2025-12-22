'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const Logger = require('./utils/logger');

const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const distDir = path.join(__dirname, '..', 'frontend', 'dist');

/* =========================
   Helpers
========================= */

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function copyFileSafe(src, dest) {
  await ensureDir(path.dirname(dest));
  await fsp.copyFile(src, dest);
}

async function processHTML(file) {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);

  const html = await fsp.readFile(srcPath, 'utf8');
  const minified = await minifyHTML(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true
  });

  await ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, minified);
}

async function processJS(file) {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);

  const jsCode = await fsp.readFile(srcPath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(jsCode, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    stringArray: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    rotateStringArray: true
  });

  await ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, obfuscated.getObfuscatedCode());
}

async function processCSS(file) {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);

  const css = await fsp.readFile(srcPath, 'utf8');
  const minified = new CleanCSS().minify(css).styles;

  await ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, minified);
}

/* =========================
   Recursive Directory Walk
========================= */

async function walk(dir, base = '') {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(await walk(fullPath, relPath));
    } else {
      files.push(relPath);
    }
  }

  return files;
}

/* =========================
   Build Process
========================= */

(async () => {
  await ensureDir(distDir);

  const files = await walk(publicDir);

  for (const file of files) {
    const ext = path.extname(file);

    try {
      if (ext === '.html') {
        await processHTML(file);
      } else if (ext === '.js') {
        await processJS(file);
      } else if (ext === '.css') {
        await processCSS(file);
      } else {
        // Images, fonts, favicon, etc.
        await copyFileSafe(
          path.join(publicDir, file),
          path.join(distDir, file)
        );
      }
    } catch (err) {
      Logger.error('Build file failed', { file, error: err.message });
      throw err;
    }
  }

  Logger.build('Frontend build completed', {
    outputDir: 'dist',
    filesProcessed: files.length
  });

})().catch((err) => {
  Logger.error('Build process failed', { error: err.message });
  process.exit(1);
});
