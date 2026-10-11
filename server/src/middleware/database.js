import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

export function requireDb(req, res, next) {
  if (!isDbConnected()) {
    return next(new ApiError(503, 'The database is not connected. Check MONGODB_URI in server/.env.', 'DB_UNAVAILABLE'));
  }
  next();
}
