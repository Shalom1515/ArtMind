import multer from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';
import { zodFields } from './validate.js';

export function apiNotFound(req, res, next) {
  next(ApiError.notFound(`There is no API route for ${req.method} ${req.originalUrl.split('?')[0]}.`));
}

export function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof ZodError) {
    error = ApiError.badRequest(undefined, zodFields(err));
  } else if (err instanceof multer.MulterError) {
    error = err.code === 'LIMIT_FILE_SIZE' ? new ApiError(413, 'That file is too large.', 'TOO_LARGE') : ApiError.badRequest(err.message);
  } else if (err?.name === 'ValidationError' && err.errors) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([key, value]) => [key, value.message]));
    error = ApiError.badRequest(undefined, fields);
  } else if (err?.name === 'CastError') {
    error = ApiError.notFound();
  } else if (err?.code === 11000) {
    error = ApiError.conflict('That already exists.');
  } else if (err?.type === 'entity.too.large') {
    error = new ApiError(413, 'That request is too large.', 'TOO_LARGE');
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('The request body is not valid JSON.');
  } else if (!(err instanceof ApiError) && (err?.status === 404 || err?.statusCode === 404)) {
    error = ApiError.notFound('That file does not exist.');
  } else if (err?.name === 'MongooseServerSelectionError' || err?.name === 'MongoNotConnectedError') {
    error = new ApiError(503, 'The database is not connected. Check MONGODB_URI in server/.env.', 'DB_UNAVAILABLE');
  }

  const status = error.status || 500;
  if (status >= 500 && !(err instanceof ApiError)) console.error('[error]', err);

  if (res.headersSent) return res.end();
  res.status(status).json({
    error: {
      message: status === 500 && !config.isDev ? 'Something went wrong on our side.' : error.message,
      code: error.code || 'SERVER_ERROR',
      ...(error.fields ? { fields: error.fields } : {}),
    },
  });
}
