import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const MB = 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function imageKind(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function imageUpload(field, maxMb, label = 'image') {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * MB, files: 1, fields: 40 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) cb(null, true);
      else cb(ApiError.badRequest('Please choose a JPG, PNG or WEBP image.', { [field]: 'Please choose a JPG, PNG or WEBP image.' }));
    },
  }).single(field);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, `That ${label} is over ${maxMb} MB. Please choose a smaller one.`, 'TOO_LARGE'));
      }
      if (err instanceof multer.MulterError) return next(ApiError.badRequest(undefined, { [field]: 'Send one image in the right field.' }));
      if (err) return next(err);
      if (req.file && !imageKind(req.file.buffer)) {
        return next(ApiError.badRequest('That file is not a real JPG, PNG or WEBP image.', { [field]: 'That file is not a real JPG, PNG or WEBP image.' }));
      }
      next();
    });
  };
}

export const identifyUpload = imageUpload('image', 5);
export const avatarUpload = imageUpload('photo', 2, 'photo');
export const artistPhotoUpload = imageUpload('photo', 2, 'photo');
export const paintingUpload = imageUpload('image', 8);
