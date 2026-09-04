import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function buildEmbeddedImages() {
  const imgDir = path.resolve('src/assets/images');
  
  const logoBuf = await sharp(path.join(imgDir, 'kayan_logo_1785354886047.jpg'))
    .resize(900, null, { withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  
  const badgeBuf = await sharp(path.join(imgDir, 'kayan_badge_1785354902221.jpg'))
    .resize(250, 250, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const eventsLogoBuf = await sharp(path.join(imgDir, 'kayan_events_logo_1787933987535.jpg'))
    .resize(500, null, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const logoBase64 = `data:image/jpeg;base64,${logoBuf.toString('base64')}`;
  const badgeBase64 = `data:image/jpeg;base64,${badgeBuf.toString('base64')}`;
  const eventsLogoBase64 = `data:image/jpeg;base64,${eventsLogoBuf.toString('base64')}`;

  const tsContent = `// Auto-generated embedded base64 assets to guarantee 100% offline and CORS-safe PDF/Image generation on Vercel and all hosts
export const KAYAN_LOGO_BASE64 = "${logoBase64}";
export const KAYAN_BADGE_BASE64 = "${badgeBase64}";
export const KAYAN_EVENTS_LOGO_BASE64 = "${eventsLogoBase64}";
`;

  fs.writeFileSync(path.join(imgDir, 'embeddedImages.ts'), tsContent);
  console.log('Successfully generated src/assets/images/embeddedImages.ts!');
}

buildEmbeddedImages().catch(err => {
  console.error(err);
  process.exit(1);
});
