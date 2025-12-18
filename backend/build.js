const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const distDir = path.join(__dirname,'..', 'frontend', 'dist');

// Create dist folder
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// 1. Obfuscate JavaScript
const jsCode = fs.readFileSync(path.join(publicDir, 'script.js'), 'utf8');
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
fs.writeFileSync(path.join(distDir, 'script.js'), obfuscated.getObfuscatedCode());

// 2. Minify CSS
const cssCode = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
const minifiedCSS = new CleanCSS().minify(cssCode).styles;
fs.writeFileSync(path.join(distDir, 'styles.css'), minifiedCSS);

// 3. Minify HTML
const htmlCode = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
minifyHTML(htmlCode, {
  collapseWhitespace: true,
  removeComments: true,
  minifyJS: true,
  minifyCSS: true
}).then(minified => {
  fs.writeFileSync(path.join(distDir, 'index.html'), minified);
  console.log('✅ Build complete! Files in dist/');
}).catch(err => console.error(err));

const htmlnotfoundCode = fs.readFileSync(path.join(publicDir, '404.html'), 'utf8');
minifyHTML(htmlnotfoundCode, {
  collapseWhitespace: true,
  removeComments: true,
  minifyJS: true,
  minifyCSS: true
}).then(minified => {
  fs.writeFileSync(path.join(distDir, '404.html'), minified);
  console.log('✅ Build complete for 404! Files in dist/');
}).catch(err => console.error(err));

// 4. Copy fonts and images
['fonts', 'images'].forEach(folder => {
  const src = path.join(publicDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    });
  }
});
