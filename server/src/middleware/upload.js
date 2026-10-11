import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowed = ['image/jpeg', 'image/png', 'image/webp'];
const MB = 1024 * 1024;

function imageUpload(maxMb) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(ApiError.badRequest('Please choose a JPG, PNG or WEBP image.'));
    },
  });
}

export const identifyUpload = imageUpload(5).single('image');
export const avatarUpload = imageUpload(2).single('photo');
export const artistPhotoUpload = imageUpload(2).single('photo');
export const paintingUpload = imageUpload(8).single('image');
