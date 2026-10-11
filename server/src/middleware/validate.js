import { ApiError } from '../utils/ApiError.js';
import { setQuery } from './sanitize.js';

export function zodFields(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function parse(schema, value) {
  const result = schema.safeParse(value ?? {});
  if (!result.success) throw ApiError.badRequest(undefined, zodFields(result.error));
  return result.data;
}

export function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (params) req.params = parse(params, req.params);
      if (query) setQuery(req, parse(query, req.query));
      if (body) req.body = parse(body, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
