export class ApiError extends Error {
  constructor(status, message, code, fields) {
    super(message);
    this.status = status;
    this.code = code || codeFor(status);
    if (fields) this.fields = fields;
  }

  static badRequest(message = 'Please check the highlighted fields.', fields) {
    return new ApiError(400, message, 'VALIDATION', fields);
  }

  static unauthenticated(message = 'Please log in to continue.') {
    return new ApiError(401, message, 'UNAUTHENTICATED');
  }

  static forbidden(message = 'You are not allowed to do that.', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'We could not find that.') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message) {
    return new ApiError(409, message, 'CONFLICT');
  }

  static notBuilt() {
    return new ApiError(501, 'This part of the API is not built yet.', 'NOT_BUILT');
  }
}

function codeFor(status) {
  const codes = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'TOO_LARGE', 429: 'RATE_LIMITED', 501: 'NOT_BUILT' };
  return codes[status] || 'SERVER_ERROR';
}
