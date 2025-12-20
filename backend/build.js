const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const distDir = path.join(__dirname, '..', 'frontend', 'dist');

async function readText(filePath) {
  try {
    return await fsp.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

(async () => {
  await fsp.mkdir(distDir, { recursive: true });

  // 1. Obfuscate JavaScript
  const jsCode = await fsp.readFile(path.join(publicDir, 'script.js'), 'utf8');
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
  await fsp.writeFile(path.join(distDir, 'script.js'), obfuscated.getObfuscatedCode());

  // 2. Minify CSS
  const cssCode = await fsp.readFile(path.join(publicDir, 'styles.css'), 'utf8');
  const minifiedCSS = new CleanCSS().minify(cssCode).styles;
  await fsp.writeFile(path.join(distDir, 'styles.css'), minifiedCSS);

  // 3. Minify HTML (index)
  const htmlCode = await fsp.readFile(path.join(publicDir, 'index.html'), 'utf8');
  const minIndex = await minifyHTML(htmlCode, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true
  });
  await fsp.writeFile(path.join(distDir, 'index.html'), minIndex);

  // 3b. Minify HTML (404) - optional
  const notFoundPath = path.join(publicDir, '404.html');
  const html404 = await readText(notFoundPath);
  if (html404) {
    const min404 = await minifyHTML(html404, {
      collapseWhitespace: true,
      removeComments: true,
      minifyJS: true,
      minifyCSS: true
    });
    await fsp.writeFile(path.join(distDir, '404.html'), min404);
  } else {
    console.log('ℹ️ 404.html not found; skipping.');
  }

  // 4. Copy fonts and images
  for (const folder of ['fonts', 'images']) {
    const src = path.join(publicDir, folder);
    const dest = path.join(distDir, folder);

    if (fs.existsSync(src)) {
      await fsp.mkdir(dest, { recursive: true });
      const files = await fsp.readdir(src);
      for (const file of files) {
        await fsp.copyFile(path.join(src, file), path.join(dest, file));
      }
    }
  }

  console.log(`[DEBUG][build.js][${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Build complete! Files in dist/`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
