/*
 Regenerate icons/images from a single square source image using a predefined
 list of targets: [{ path, width, height }].
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const srcImagePath = path.join(projectRoot, 'assets', 'generators', 'Icon project-iOS-Default-1024x1024@1x.png');

// Predefined targets with explicit sizes
const targets = [
  // assets/icons
  { path: 'assets/icons/icon-20x20.png', width: 20, height: 20 },
  { path: 'assets/icons/icon-40x40.png', width: 40, height: 40 },
  { path: 'assets/icons/icon-60x60.png', width: 60, height: 60 },
  { path: 'assets/icons/icon-72x72.png', width: 72, height: 72 },
  { path: 'assets/icons/icon-96x96.png', width: 96, height: 96 },
  { path: 'assets/icons/icon-128x128.png', width: 128, height: 128 },
  { path: 'assets/icons/icon-144x144.png', width: 144, height: 144 },
  { path: 'assets/icons/icon-152x152.png', width: 152, height: 152 },
  { path: 'assets/icons/icon-192x192.png', width: 192, height: 192 },
  { path: 'assets/icons/icon-256x256.png', width: 256, height: 256 },
  { path: 'assets/icons/icon-384x384.png', width: 384, height: 384 },
  { path: 'assets/icons/icon-512x512.png', width: 512, height: 512 },
  { path: 'assets/icons/notification-android.png', width: 96, height: 96 },
  { path: 'assets/icons/notification-ios.png', width: 60, height: 60 },

  // assets/images (square)
  { path: 'assets/images/adaptive-icon.png', width: 768, height: 768 },
  { path: 'assets/images/favicon.png', width: 768, height: 768 },
  { path: 'assets/images/icon.png', width: 768, height: 768 },
  { path: 'assets/images/notification-icon.png', width: 768, height: 768 },
];

// Favicon targets for web documentation
const faviconTargets = [
  // Standard favicon sizes
  { path: 'static/favicon.ico', width: 32, height: 32, format: 'ico' },
  { path: 'static/favicon-16x16.png', width: 16, height: 16, format: 'png' },
  { path: 'static/favicon-32x32.png', width: 32, height: 32, format: 'png' },
  { path: 'static/favicon-48x48.png', width: 48, height: 48, format: 'png' },
  
  // Apple touch icons
  { path: 'static/apple-touch-icon.png', width: 180, height: 180, format: 'png' },
  { path: 'static/apple-touch-icon-152x152.png', width: 152, height: 152, format: 'png' },
  { path: 'static/apple-touch-icon-144x144.png', width: 144, height: 144, format: 'png' },
  { path: 'static/apple-touch-icon-120x120.png', width: 120, height: 120, format: 'png' },
  { path: 'static/apple-touch-icon-114x114.png', width: 114, height: 114, format: 'png' },
  { path: 'static/apple-touch-icon-76x76.png', width: 76, height: 76, format: 'png' },
  { path: 'static/apple-touch-icon-72x72.png', width: 72, height: 72, format: 'png' },
  { path: 'static/apple-touch-icon-60x60.png', width: 60, height: 60, format: 'png' },
  { path: 'static/apple-touch-icon-57x57.png', width: 57, height: 57, format: 'png' },
  
  // Android icons
  { path: 'static/android-chrome-192x192.png', width: 192, height: 192, format: 'png' },
  { path: 'static/android-chrome-512x512.png', width: 512, height: 512, format: 'png' },
  
  // Microsoft tiles
  { path: 'static/mstile-150x150.png', width: 150, height: 150, format: 'png' },
  
  // High DPI favicons
  { path: 'static/favicon-96x96.png', width: 96, height: 96, format: 'png' },
  { path: 'static/favicon-128x128.png', width: 128, height: 128, format: 'png' },
];

async function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.promises.access(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function generateFavicon(srcImagePath, target, outputPath) {
  await ensureDirFor(outputPath);
  
  try {
    let sharpInstance = sharp(srcImagePath)
      .resize(target.width, target.height, { fit: 'cover' });
    
    let buffer;
    if (target.format === 'ico') {
      // For ICO format, we need to create a 32x32 PNG first, then convert
      buffer = await sharpInstance
        .resize(32, 32, { fit: 'cover' })
        .png()
        .toBuffer();
      
      // Note: Sharp doesn't support ICO format directly, so we'll save as PNG
      // and rename to .ico (browsers will still recognize it)
      const icoPath = outputPath.replace('.ico', '.png');
      await fs.promises.writeFile(icoPath, buffer);
      console.log(`Generated ${target.path} -> ${target.width}x${target.height} (saved as PNG)`);
    } else {
      buffer = await sharpInstance
        .png()
        .toBuffer();
      await fs.promises.writeFile(outputPath, buffer);
      console.log(`Generated ${target.path} -> ${target.width}x${target.height}`);
    }
    
    return true;
  } catch (err) {
    console.warn(`Failed ${target.path}: ${err.message}`);
    return false;
  }
}

async function main() {
  if (!(await fileExists(srcImagePath))) {
    console.error(`Source image not found: ${srcImagePath}`);
    process.exit(1);
  }

  const srcMeta = await sharp(srcImagePath).metadata();
  if (!srcMeta.width || srcMeta.width !== srcMeta.height) {
    console.warn(`Warning: source image is not square (${srcMeta.width}x${srcMeta.height}). Resizes may crop/stretch.`);
  }

  console.log('🔄 Generating mobile app icons...');
  let count = 0;
  for (const t of targets) {
    const outPath = path.join(projectRoot, t.path);
    await ensureDirFor(outPath);
    try {
      const buffer = await sharp(srcImagePath)
        .resize(t.width, t.height, { fit: 'cover' })
        .png()
        .toBuffer();
      await fs.promises.writeFile(outPath, buffer);
      count++;
      console.log(`Updated ${t.path} -> ${t.width}x${t.height}`);
    } catch (err) {
      console.warn(`Failed ${t.path}: ${err.message}`);
    }
  }

  console.log(`✅ Mobile icons done. Generated ${count} files.`);

  console.log('\n🔄 Generating web favicons...');
  let faviconCount = 0;
  for (const target of faviconTargets) {
    const outputPath = path.join(projectRoot, target.path);
    const success = await generateFavicon(srcImagePath, target, outputPath);
    if (success) faviconCount++;
  }

  console.log(`✅ Web favicons done. Generated ${faviconCount} files.`);
  console.log(`\n🎉 All done! Generated ${count + faviconCount} total files from ${path.relative(projectRoot, srcImagePath)}.`);
  console.log(`📱 Mobile icons: ${count} files`);
  console.log(`🌐 Web favicons: ${faviconCount} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
