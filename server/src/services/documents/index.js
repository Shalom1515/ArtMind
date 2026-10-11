import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { config } from '../../config/env.js';
import { findImage } from '../../config/storage.js';

const INK = '#1B1917';
const MUTED = '#77706A';
const RULE = '#D9D0C1';

let warnedLogo = false;

function logoPath() {
  const file = path.join(config.paths.brand, 'logo.png');
  if (existsSync(file)) return file;
  if (!warnedLogo) {
    console.warn('[documents] client/public/brand/logo.png is missing, so downloads show the ArtMind name instead of the logo.');
    warnedLogo = true;
  }
  return null;
}

const plain = (text = '') => String(text).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/×/g, 'x');

export const pageLink = (slug) => `${config.clientUrl}/paintings/${slug}`;

export function specRows(p) {
  return [
    ['Artist', p.artist?.name || ''],
    ['Year', String(p.year || '')],
    ['Category', p.category],
    ['Style', p.style],
    ['Medium', p.medium],
    ['Surface', p.surface],
    ['Size', p.widthCm && p.heightCm ? `${p.widthCm} x ${p.heightCm} cm` : ''],
    ['Mood', p.mood || ''],
    ['Colours', p.colours || ''],
  ].filter(([, value]) => value);
}

async function imageFor(slug, maxSide = 1200) {
  const file = findImage('paintings', slug);
  if (!file) return null;
  try {
    const { data, info } = await sharp(file).rotate().resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (err) {
    console.warn(`[documents] Could not read the image for ${slug}: ${err.message}`);
    return null;
  }
}

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function pdfHeader(doc) {
  const logo = logoPath();
  if (logo) doc.image(logo, 50, 40, { height: 28 });
  else doc.font('Times-Roman').fontSize(22).fillColor(INK).text('ArtMind', 50, 40);
  doc.moveTo(50, 78).lineTo(545, 78).strokeColor(RULE).lineWidth(1).stroke();
  doc.y = 92;
}

function heading(doc, text) {
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text(text.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.3).font('Helvetica').fontSize(10.5).fillColor(INK);
}

export async function paintingPdf(p) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: plain(p.title), Author: 'ArtMind' } });
  const done = collect(doc);
  pdfHeader(doc);

  const image = await imageFor(p.slug);
  if (image) {
    const maxW = 495;
    const maxH = 300;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    doc.image(image.data, 50 + (maxW - w) / 2, doc.y, { width: w, height: h });
    doc.y += h + 16;
  }

  doc.font('Times-Roman').fontSize(24).fillColor(INK).text(plain(p.title), 50);
  doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(plain(`${p.artist?.name || ''}, ${p.year || ''}`));

  heading(doc, 'Details');
  for (const [label, value] of specRows(p)) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED).text(label, 50, y, { width: 110 });
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(plain(value), 160, y, { width: 385 });
    doc.moveDown(0.25);
  }

  if (p.description) {
    heading(doc, 'Description');
    doc.text(plain(p.description), 50, doc.y, { width: 495, align: 'left' });
  }
  if (p.summary) {
    heading(doc, 'Summary');
    doc.text(plain(p.summary), 50, doc.y, { width: 495 });
  }

  const palette = p.palette?.length ? p.palette : p.tones || [];
  if (palette.length) {
    heading(doc, 'Palette');
    if (doc.y > 740) doc.addPage();
    const y = doc.y;
    palette.forEach((hex, i) => {
      doc.rect(50 + i * 70, y, 56, 28).fill(hex);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(hex, 50 + i * 70, y + 32, { width: 56, align: 'center' });
    });
    doc.y = y + 48;
    doc.fillColor(INK);
  }

  if (p.tags?.length) {
    heading(doc, 'Tags');
    doc.text(plain(p.tags.join(', ')), 50, doc.y, { width: 495 });
  }

  heading(doc, 'See it on ArtMind');
  doc.fillColor('#7A2E22').text(pageLink(p.slug), 50, doc.y, { link: pageLink(p.slug), underline: true });
  return done;
}

const cellBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9D0C1' }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

function docxHeading(text) {
  return new Paragraph({ spacing: { before: 280, after: 100 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: '77706A', characterSpacing: 30 })] });
}

export async function paintingDocx(p) {
  const children = [];
  const logo = logoPath();
  if (logo) {
    const meta = await sharp(logo).metadata();
    const height = 36;
    children.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: await sharp(logo).png().toBuffer(), transformation: { width: Math.round((meta.width / meta.height) * height), height } })] }));
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: 'ArtMind', font: 'Georgia', size: 40 })] }));
  }

  const image = await imageFor(p.slug, 1000);
  if (image) {
    const scale = Math.min(600 / image.width, 380 / image.height);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [new ImageRun({ type: 'jpg', data: image.data, transformation: { width: Math.round(image.width * scale), height: Math.round(image.height * scale) } })],
    }));
  }

  children.push(new Paragraph({ children: [new TextRun({ text: plain(p.title), font: 'Georgia', size: 48 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: plain(`${p.artist?.name || ''}, ${p.year || ''}`), color: '77706A', size: 22 })] }));

  children.push(docxHeading('Details'));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: specRows(p).map(([label, value]) => new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: '77706A', size: 20 })] })] }),
        new TableCell({ borders: cellBorders, width: { size: 75, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: plain(value), size: 20 })] })] }),
      ],
    })),
  }));

  if (p.description) children.push(docxHeading('Description'), new Paragraph({ children: [new TextRun({ text: plain(p.description), size: 21 })] }));
  if (p.summary) children.push(docxHeading('Summary'), new Paragraph({ children: [new TextRun({ text: plain(p.summary), size: 21 })] }));

  const palette = p.palette?.length ? p.palette : p.tones || [];
  if (palette.length) {
    children.push(docxHeading('Palette'));
    children.push(new Table({
      rows: [
        new TableRow({ height: { value: 500, rule: 'atLeast' }, children: palette.map((hex) => new TableCell({ width: { size: 1100, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: hex.slice(1) }, children: [new Paragraph('')] })) }),
        new TableRow({ children: palette.map((hex) => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hex, size: 16, color: '77706A' })] })] })) }),
      ],
    }));
  }

  if (p.tags?.length) children.push(docxHeading('Tags'), new Paragraph({ children: [new TextRun({ text: plain(p.tags.join(', ')), size: 21 })] }));
  children.push(docxHeading('See it on ArtMind'), new Paragraph({ children: [new ExternalHyperlink({ link: pageLink(p.slug), children: [new TextRun({ text: pageLink(p.slug), style: 'Hyperlink' })] })] }));

  const document = new Document({ creator: 'ArtMind', title: plain(p.title), sections: [{ children }] });
  return Packer.toBuffer(document);
}

export async function favouritesPdf(user, paintings) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${plain(user.name)}'s favourites`, Author: 'ArtMind' } });
  const done = collect(doc);
  pdfHeader(doc);
  doc.font('Times-Roman').fontSize(24).fillColor(INK).text(`${plain(user.name)}'s favourites`, 50);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(`${paintings.length} ${paintings.length === 1 ? 'painting' : 'paintings'}, exported ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  doc.moveDown(1);

  for (const p of paintings) {
    if (doc.y > 690) doc.addPage();
    const top = doc.y;
    const thumb = await imageFor(p.slug, 300);
    if (thumb) {
      const scale = Math.min(110 / thumb.width, 90 / thumb.height);
      doc.image(thumb.data, 50, top, { width: thumb.width * scale, height: thumb.height * scale });
    } else {
      const tones = p.tones?.length ? p.tones : ['#D9D0C1'];
      tones.forEach((hex, i) => doc.rect(50 + (i * 110) / tones.length, top, 110 / tones.length, 90).fill(hex));
    }
    doc.font('Times-Roman').fontSize(15).fillColor(INK).text(plain(p.title), 175, top, { width: 370 });
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text(plain(`${p.artist?.name || ''}, ${p.year}. ${p.category}, ${p.style}. ${p.medium} on ${String(p.surface).toLowerCase()}${p.widthCm ? `, ${p.widthCm} x ${p.heightCm} cm` : ''}.`), 175, doc.y + 2, { width: 370 });
    if (p.summary) doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(plain(p.summary), 175, doc.y + 4, { width: 370 });
    doc.fillColor('#7A2E22').fontSize(8.5).text(pageLink(p.slug), 175, doc.y + 4, { width: 370, link: pageLink(p.slug) });
    doc.y = Math.max(doc.y, top + 92) + 14;
    doc.moveTo(50, doc.y - 7).lineTo(545, doc.y - 7).strokeColor(RULE).lineWidth(0.5).stroke();
  }
  if (!paintings.length) doc.font('Helvetica').fontSize(11).fillColor(INK).text('No saved paintings yet.');
  return done;
}

export function sendFile(res, buffer, filename, type) {
  res.set({
    'Content-Type': type,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
  });
  res.send(buffer);
}

export const TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  json: 'application/json',
};
