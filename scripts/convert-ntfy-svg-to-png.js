/*
 * Converts assets/icons/ntfy.svg to assets/icons/generators/ntfy.png (1024x1024)
 * for use as the ntfy app icon. Run after updating ntfy.svg.
 */
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const src = path.join(projectRoot, 'assets/icons/ntfy.svg');
const dest = path.join(projectRoot, 'assets/icons/generators/ntfy.png');

sharp(src)
  .resize(1024, 1024)
  .png()
  .toFile(dest)
  .then(() => console.log('ntfy.png generated from ntfy.svg'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
