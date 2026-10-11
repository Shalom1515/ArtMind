import { cardsInOrder } from '../services/catalogue/index.js';
import { recognise } from '../services/recognition/index.js';
import { ApiError } from '../utils/ApiError.js';

// The upload stays in memory and is dropped when the request ends.
export async function identify(req, res) {
  if (!req.file) throw ApiError.badRequest('Choose an image first.', { image: 'Choose an image first.' });
  let result;
  try {
    result = await recognise(req.file.buffer);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest('We could not read that image. Try another JPG, PNG or WEBP file.', { image: 'We could not read that image.' });
  }
  res.json({
    fileName: String(req.file.originalname || 'image.jpg').slice(0, 120),
    findings: result.findings,
    similar: await cardsInOrder(result.similar),
    searchQuery: result.searchQuery,
  });
}
