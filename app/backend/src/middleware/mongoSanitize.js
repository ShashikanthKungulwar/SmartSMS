import { sanitize } from 'express-mongo-sanitize';

// express-mongo-sanitize's default middleware does `req.query = sanitized`, but
// Express 5 defines req.query as a getter with no setter (it's recomputed fresh
// from req.url on every access), so that assignment throws on every request.
// req.body/req.params are still plain writable properties, so only req.query
// needs the defineProperty workaround (shadows the prototype getter with an
// own, sanitized value).
export default function mongoSanitizeMiddleware(req, res, next) {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: sanitize(req.query),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
}
