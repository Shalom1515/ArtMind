import { fullPainting } from '../services/catalogue/index.js';
import { paintingDocx, paintingPdf, sendFile, TYPES } from '../services/documents/index.js';
import { ApiError } from '../utils/ApiError.js';

export async function downloadPainting(req, res) {
  const painting = await fullPainting({ slug: req.params.slug });
  if (!painting) throw ApiError.notFound('We could not find that painting.');
  const format = req.query.format;
  const buffer = format === 'docx' ? await paintingDocx(painting) : await paintingPdf(painting);
  sendFile(res, buffer, `${painting.slug}.${format}`, TYPES[format]);
}
