import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG with golden crown / geometric Kayan emblem with luxury dark gradient
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="30%" stop-color="#f59e0b" />
      <stop offset="70%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Subtle border -->
  <rect x="8" y="8" width="496" height="496" rx="104" stroke="url(#goldGrad)" stroke-width="4" stroke-opacity="0.35" fill="none" />

  <!-- Ambient Glow -->
  <circle cx="256" cy="220" r="160" fill="url(#glowGrad)" />

  <!-- Center Emblem Group -->
  <g filter="url(#shadow)">
    <!-- Golden Geometric Crown / Diamond / K shape -->
    <!-- Top central diamond -->
    <polygon points="256,90 286,130 256,160 226,130" fill="url(#goldGrad)" />
    
    <!-- Crown peaks -->
    <path d="M140,240 L170,140 L215,200 L256,120 L297,200 L342,140 L372,240 L340,270 L256,260 L172,270 Z" fill="url(#goldGrad)" />
    
    <!-- Base Platform & Wings -->
    <path d="M150,290 L256,275 L362,290 L380,335 L256,365 L132,335 Z" fill="url(#goldGrad)" opacity="0.95" />

    <!-- Typography "KAYAN" -->
    <text x="256" y="420" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="44" fill="url(#goldGrad)" letter-spacing="8">KAYAN</text>
    <text x="256" y="458" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="#94a3b8" letter-spacing="4">EVENTS &amp; TRIPS</text>
  </g>
</svg>
`;

// Save SVG
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);

  // 1. 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 2. 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 3. apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 4. favicon.png
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Created favicon.png');

  // 5. maskable icon 512x512 (with padding for Android mask)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 9, g: 13, b: 22, alpha: 1 },
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');
}

generate().catch(console.error);
