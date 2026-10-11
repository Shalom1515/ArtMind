import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(serverRoot, '..');
const p = (...parts) => path.join(projectRoot, ...parts);

const LONGEST_SIDE = 1600;
const QUALITY = 82;

const folders = [
  p('server', 'data', 'images', 'paintings'),
  p('server', 'data', 'images', 'artists'),
  p('client', 'public', 'images', 'about'),
  p('client', 'public', 'images', 'home'),
  p('client', 'public', 'images', 'room'),
  p('client', 'public', 'images', 'states'),
  p('client', 'public', 'images', 'team'),
  p('docs', 'test_images'),
];

const copies = [
  ['quiet-geometry', 'categories', 'abstract'],
  ['the-long-road-home', 'categories', 'landscape'],
  ['peonies-in-a-blue-jar', 'categories', 'flower'],
  ['heron-in-the-reeds', 'categories', 'nature'],
  ['woman-reading-by-the-window', 'categories', 'figurative'],
  ['annunciation-in-gold', 'categories', 'religious'],
  ['dancer-resting', 'auth', 'login'],
  ['dahlias-in-september', 'auth', 'register'],
  ['hills-after-rain', 'auth', 'verify_email'],
  ['harbour-haze', 'auth', 'forgot_password'],
  ['blue-ascension', 'auth', 'reset_password'],
];

const siteImages = [
  'room/wall', 'home/cta_gallery', 'about/studio', 'about/feature_search', 'about/feature_recommend',
  'about/feature_recognise', 'about/feature_assistant', 'states/empty_frame', 'states/not_found',
  'team/stanley', 'team/amanda', 'team/shalom',
];

const testImages = ['test_impressionist_landscape', 'test_abstract', 'test_religious_panel', 'test_watercolour_flowers', 'test_charcoal_portrait'];

async function isUpToDate(source, target) {
  if (!existsSync(target)) return false;
  const [s, t] = await Promise.all([stat(source), stat(target)]);
  return t.mtimeMs >= s.mtimeMs;
}

async function convertFolder(folder) {
  if (!existsSync(folder)) return { converted: 0, skipped: 0 };
  const files = (await readdir(folder)).filter((f) => f.toLowerCase().endsWith('.png'));
  let converted = 0;
  let skipped = 0;
  for (const file of files) {
    const source = path.join(folder, file);
    const target = path.join(folder, file.replace(/\.png$/i, '.jpg'));
    if (await isUpToDate(source, target)) {
      skipped += 1;
      continue;
    }
    await sharp(source)
      .rotate()
      .resize({ width: LONGEST_SIDE, height: LONGEST_SIDE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#F8F5EF' })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(target);
    converted += 1;
  }
  return { converted, skipped };
}

async function makeCopies() {
  let made = 0;
  const missing = [];
  for (const [slug, folder, name] of copies) {
    const source = p('server', 'data', 'images', 'paintings', `${slug}.jpg`);
    const target = p('client', 'public', 'images', folder, `${name}.jpg`);
    if (!existsSync(source)) {
      missing.push(`${slug}.jpg (for ${folder}/${name}.jpg)`);
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    if (!(await isUpToDate(source, target))) {
      await copyFile(source, target);
      made += 1;
    }
  }
  return { made, missing };
}

async function trimBrand() {
  const pairs = [['logo.png', 'header_logo.png'], ['logo_light.png', 'header_logo_light.png']];
  let made = 0;
  for (const [source, target] of pairs) {
    const from = p('client', 'public', 'brand', source);
    const to = p('client', 'public', 'brand', target);
    if (!existsSync(from) || (await isUpToDate(from, to))) continue;
    await sharp(from).trim({ threshold: 10 }).resize({ height: 120, withoutEnlargement: true }).png().toFile(to);
    made += 1;
  }
  return made;
}

function listMissing(folder, names) {
  return names.filter((name) => !existsSync(path.join(folder, `${name}.jpg`)));
}

async function main() {
  console.log('Converting .png images to .jpg ...');
  for (const folder of folders) {
    const { converted, skipped } = await convertFolder(folder);
    if (converted || skipped) console.log(`  ${path.relative(projectRoot, folder)}: ${converted} converted, ${skipped} already done`);
  }

  const { made, missing: copyMissing } = await makeCopies();
  console.log(`Copies for categories and auth pages: ${made} made`);
  console.log(`Trimmed header logos: ${await trimBrand()} made`);

  const paintings = JSON.parse(await readFile(path.join(serverRoot, 'data', 'seed', 'paintings.json'), 'utf8'));
  const artists = JSON.parse(await readFile(path.join(serverRoot, 'data', 'seed', 'artists.json'), 'utf8'));
  const report = [
    ['paintings', listMissing(p('server', 'data', 'images', 'paintings'), paintings.map((x) => x.slug))],
    ['artist portraits', listMissing(p('server', 'data', 'images', 'artists'), artists.map((x) => x.slug))],
    ['site images', siteImages.filter((name) => !existsSync(p('client', 'public', 'images', `${name}.jpg`)))],
    ['test images', listMissing(p('docs', 'test_images'), testImages)],
  ];

  let allThere = copyMissing.length === 0;
  for (const [label, missing] of report) {
    if (missing.length) {
      allThere = false;
      console.log(`Still missing ${missing.length} ${label}: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    }
  }
  console.log(allThere ? 'All images are in place.' : 'The site shows a soft placeholder wherever an image is missing.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
