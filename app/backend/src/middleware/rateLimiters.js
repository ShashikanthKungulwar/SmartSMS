import rateLimit from 'express-rate-limit';

// Aggressive limit for auth endpoints (login/register/google/refresh) — these
// are the routes credential-stuffing / brute-force attacks target.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Looser limit for general authenticated routes.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
