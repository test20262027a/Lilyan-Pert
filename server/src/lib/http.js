export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export const bad = (code, message) => new HttpError(400, code, message);
export const forbidden = (code = 'FORBIDDEN', message) => new HttpError(403, code, message);
export const notFound = (code = 'NOT_FOUND', message) => new HttpError(404, code, message);
export const conflict = (code, message) => new HttpError(409, code, message);

/** Wrap an async route handler so rejections reach the error middleware. */
export const ah = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Validates a uuid-ish identifier before it reaches a query. */
export const isUuid = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v, max = 500) =>
  v === null || v === undefined ? null : String(v).slice(0, max);
