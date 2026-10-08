import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');
const brandingDir = path.join(publicDir, 'branding');
const splashDir = path.join(publicDir, 'splash');

// Ensure directories exist
for (const dir of [publicDir, iconsDir, brandingDir, splashDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Base App Icon SVG (High-res 1024x1024 for sharp rasterization)
const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0E3D78" />
      <stop offset="60%" stopColor="#0A2F5E" />
      <stop offset="100%" stopColor="#061F40" />
    </linearGradient>
    <filter id="iconShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)" />
  <g transform="translate(100, 96)" filter="url(#iconShadow)">
    <path 
      d="M 120 185 C 120 220 135 250 160 270 C 180 286 210 292 235 272" 
      stroke="#144A8C" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
    <path 
      d="M 28 40 L 140 40 C 185 40 225 72 225 118 C 225 160 190 192 145 192 C 100 192 70 225 70 270 C 70 295 90 315 115 315" 
      stroke="#33C7C7" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
    <path d="M 205 95 C 190 95 175 95 155 95" stroke="#33C7C7" stroke-width="6" stroke-linecap="round" />
    <circle cx="205" cy="95" r="7" fill="#33C7C7" />
    <g transform="translate(145, 55)">
      <path d="M 16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 44 16 44 C 16 44 32 27 32 16 C 32 7.2 24.8 0 16 0 Z" fill="#061F40" stroke="#33C7C7" stroke-width="2" />
      <circle cx="16" cy="15" r="5" fill="#FFFFFF" />
    </g>
    <g transform="translate(208, 185)">
      <path d="M 20 0 C 9 0 0 9 0 20 C 0 34 20 54 20 54 C 20 54 40 34 40 20 C 40 9 31 0 20 0 Z" fill="#C8A14D" />
      <circle cx="20" cy="19" r="8" fill="#FFFFFF" fill-opacity="0.35" />
      <circle cx="23" cy="18" r="6.5" fill="#C8A14D" />
    </g>
  </g>
</svg>
`;

// 2. Maskable Icon SVG (Contains safe area border padding for Android adaptive icons)
const maskableIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0E3D78" />
      <stop offset="60%" stopColor="#0A2F5E" />
      <stop offset="100%" stopColor="#061F40" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGradMask)" />
  <!-- Scaled down to 75% for 15% safe area buffer -->
  <g transform="translate(136, 132) scale(0.76)">
    <path 
      d="M 120 185 C 120 220 135 250 160 270 C 180 286 210 292 235 272" 
      stroke="#144A8C" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
    <path 
      d="M 28 40 L 140 40 C 185 40 225 72 225 118 C 225 160 190 192 145 192 C 100 192 70 225 70 270 C 70 295 90 315 115 315" 
      stroke="#33C7C7" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
    <path d="M 205 95 C 190 95 175 95 155 95" stroke="#33C7C7" stroke-width="6" stroke-linecap="round" />
    <circle cx="205" cy="95" r="7" fill="#33C7C7" />
    <g transform="translate(145, 55)">
      <path d="M 16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 44 16 44 C 16 44 32 27 32 16 C 32 7.2 24.8 0 16 0 Z" fill="#061F40" stroke="#33C7C7" stroke-width="2" />
      <circle cx="16" cy="15" r="5" fill="#FFFFFF" />
    </g>
    <g transform="translate(208, 185)">
      <path d="M 20 0 C 9 0 0 9 0 20 C 0 34 20 54 20 54 C 20 54 40 34 40 20 C 40 9 31 0 20 0 Z" fill="#C8A14D" />
      <circle cx="20" cy="19" r="8" fill="#FFFFFF" fill-opacity="0.35" />
      <circle cx="23" cy="18" r="6.5" fill="#C8A14D" />
    </g>
  </g>
</svg>
`;

// 3. 2D Logo with Wordmark SVG
const logo2dSvg = fs.readFileSync(path.join(brandingDir, 'rumbio-logo-2d.svg'));
const logo3dSvg = fs.readFileSync(path.join(brandingDir, 'rumbio-logo-3d.svg'));

async function generateAll() {
  console.log('[Rumbio Asset Generator] Generating pixel-perfect PWA and brand icons...');

  // Standard sizes
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const s of sizes) {
    await sharp(Buffer.from(appIconSvg))
      .resize(s, s)
      .png()
      .toFile(path.join(iconsDir, `icon-${s}.png`));
  }

  // Maskable sizes
  for (const s of [192, 512]) {
    await sharp(Buffer.from(maskableIconSvg))
      .resize(s, s)
      .png()
      .toFile(path.join(iconsDir, `icon-${s}-maskable.png`));
  }

  // Apple Touch Icon (180x180)
  await sharp(Buffer.from(appIconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  // Favicon PNG (64x64)
  await sharp(Buffer.from(appIconSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(iconsDir, 'favicon.png'));

  // Branding PNGs
  await sharp(logo2dSvg)
    .resize(800, 960)
    .png()
    .toFile(path.join(brandingDir, 'rumbio-logo-2d.png'));

  await sharp(logo3dSvg)
    .resize(800, 960)
    .png()
    .toFile(path.join(brandingDir, 'rumbio-logo-3d.png'));

  // Splash Screens
  // Dark splash (1242x2688 typical iPhone portrait)
  const splashDarkSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2688" width="1242" height="2688">
    <defs>
      <radialGradient id="splashGlow" cx="50%" cy="45%" r="40%">
        <stop offset="0%" stopColor="#0E3D78" stop-opacity="0.8" />
        <stop offset="60%" stopColor="#0A2F5E" stop-opacity="0.4" />
        <stop offset="100%" stopColor="#050811" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1242" height="2688" fill="#050811" />
    <circle cx="621" cy="1200" r="500" fill="url(#splashGlow)" />
  </svg>
  `;
  await sharp(Buffer.from(splashDarkSvg))
    .png()
    .toFile(path.join(splashDir, 'splash-dark.png'));

  // Light splash
  const splashLightSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2688" width="1242" height="2688">
    <rect width="1242" height="2688" fill="#F8FAFC" />
  </svg>
  `;
  await sharp(Buffer.from(splashLightSvg))
    .png()
    .toFile(path.join(splashDir, 'splash-light.png'));

  console.log('[Rumbio Asset Generator] All PWA & brand assets created successfully in /public!');
}

generateAll().catch(err => {
  console.error('[Rumbio Asset Generator Error]:', err);
  process.exit(1);
});
