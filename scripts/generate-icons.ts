import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Master SVG design for KAYAN Events - Sleek Gold & Obsidian Luxury Monogram Icon
const masterSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Deep Obsidian & Midnight Sapphire -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13" />
      <stop offset="50%" stop-color="#0d1424" />
      <stop offset="100%" stop-color="#151b2e" />
    </linearGradient>

    <!-- Luxury Pure Gold Gradient -->
    <linearGradient id="goldPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="65%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>

    <!-- Secondary Gold Shimmer -->
    <linearGradient id="goldSecondary" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>

    <!-- Soft Golden Ambient Glow -->
    <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.32" />
      <stop offset="60%" stop-color="#d97706" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Deep Drop Shadow -->
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.75" />
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#b45309" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- 100% Solid Full-Bleed Background - NO transparency, NO rounded rect to eliminate Android white plates -->
  <rect width="512" height="512" fill="url(#bgGradient)" />

  <!-- Ambient Golden Core Glow -->
  <circle cx="256" cy="256" r="210" fill="url(#ambientGlow)" />

  <!-- Subtle Outer Accent Ring (Safe Zone) -->
  <circle cx="256" cy="256" r="236" stroke="url(#goldPrimary)" stroke-width="2.5" stroke-opacity="0.22" fill="none" />

  <!-- Master Center Emblem: Futuristic Geometric 'K' & Crown Sovereign Monogram -->
  <g filter="url(#iconShadow)">
    <!-- Top Floating Diamond Star -->
    <polygon points="256,92 284,126 256,160 228,126" fill="url(#goldPrimary)" />

    <!-- Left Vertical Pillar of 'K' / Scepter -->
    <path d="M152,168 L196,168 L196,344 L152,344 Z" fill="url(#goldPrimary)" rx="6" />
    
    <!-- Top-Right Dynamic Diagonal Wing of 'K' -->
    <path d="M214,242 L318,146 C326,138 340,144 340,156 L340,188 C340,196 336,204 328,212 L256,278 L214,242 Z" fill="url(#goldPrimary)" />

    <!-- Bottom-Right Dynamic Diagonal Leg of 'K' -->
    <path d="M246,268 L328,348 C336,356 340,364 340,372 L340,396 C340,408 326,414 318,406 L214,304 L246,268 Z" fill="url(#goldSecondary)" />

    <!-- Crown Diadem Arc connecting the structure -->
    <path d="M196,204 L256,164 L316,204 L296,220 L256,192 L216,220 Z" fill="url(#goldPrimary)" opacity="0.95" />

    <!-- Central Energy Core -->
    <polygon points="256,238 274,256 256,274 238,256" fill="#fffbeb" opacity="0.9" />
  </g>
</svg>`;

// Maskable version with extra safe zone padding for Android adaptive circular / squircle icons
const maskableSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradientMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13" />
      <stop offset="50%" stop-color="#0d1424" />
      <stop offset="100%" stop-color="#151b2e" />
    </linearGradient>
    <linearGradient id="goldPrimaryMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="65%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="goldSecondaryMask" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>
    <radialGradient id="ambientGlowMask" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#d97706" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="iconShadowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- 100% Solid Full-Bleed Background for Adaptive Icons -->
  <rect width="512" height="512" fill="url(#bgGradientMask)" />

  <!-- Centered scaled emblem inside 75% safe-zone -->
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <circle cx="256" cy="256" r="210" fill="url(#ambientGlowMask)" />
    <circle cx="256" cy="256" r="236" stroke="url(#goldPrimaryMask)" stroke-width="2.5" stroke-opacity="0.25" fill="none" />

    <g filter="url(#iconShadowMask)">
      <polygon points="256,92 284,126 256,160 228,126" fill="url(#goldPrimaryMask)" />
      <path d="M152,168 L196,168 L196,344 L152,344 Z" fill="url(#goldPrimaryMask)" rx="6" />
      <path d="M214,242 L318,146 C326,138 340,144 340,156 L340,188 C340,196 336,204 328,212 L256,278 L214,242 Z" fill="url(#goldPrimaryMask)" />
      <path d="M246,268 L328,348 C336,356 340,364 340,372 L340,396 C340,408 326,414 318,406 L214,304 L246,268 Z" fill="url(#goldSecondaryMask)" />
      <path d="M196,204 L256,164 L316,204 L296,220 L256,192 L216,220 Z" fill="url(#goldPrimaryMask)" opacity="0.95" />
      <polygon points="256,238 274,256 256,274 238,256" fill="#fffbeb" opacity="0.9" />
    </g>
  </g>
</svg>`;

async function generateIcons() {
  const publicDir = path.resolve('public');
  
  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterSvg);
  console.log('Saved favicon.svg');

  // Generate standard 512x512 PNG
  await sharp(Buffer.from(masterSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // Generate standard 192x192 PNG
  await sharp(Buffer.from(masterSvg))
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // Generate apple-touch-icon 180x180 PNG
  await sharp(Buffer.from(masterSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate favicon 64x64 PNG
  await sharp(Buffer.from(masterSvg))
    .resize(64, 64)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // Generate Maskable 512x512 PNG for Android adaptive launcher
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // Generate Maskable 192x192 PNG for Android adaptive launcher
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-192x192.png'));
  console.log('Generated pwa-maskable-192x192.png');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
