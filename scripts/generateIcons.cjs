const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoLib = require('png-to-ico');
const pngToIco = pngToIcoLib.default || pngToIcoLib;

async function generate() {
  const svgPath = path.join(__dirname, '../icons/Asset 3.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const buildDir = path.join(__dirname, '../build');
  const extIconsDir = path.join(__dirname, '../extension/icons');
  const publicDir = path.join(__dirname, '../public');

  [buildDir, extIconsDir, publicDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();

    if (size === 512) {
      fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuf);
    }
    if (size === 256) {
      fs.writeFileSync(path.join(buildDir, 'icon-256.png'), pngBuf);
      fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuf);
    }
    if ([16, 32, 48, 128].includes(size)) {
      fs.writeFileSync(path.join(extIconsDir, `icon${size}.png`), pngBuf);
    }
    if ([16, 32, 48, 64, 128, 256].includes(size)) {
      pngBuffers.push(pngBuf);
    }
  }

  // Generate multi-size Windows .ico file
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

  // Also copy SVG to public and assets
  fs.copyFileSync(svgPath, path.join(publicDir, 'icon.svg'));

  console.log('Successfully generated icon.ico and PNG assets across all resolutions!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
