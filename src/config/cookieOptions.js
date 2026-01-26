/**
 * Cookie options for JWT storage
 * Ensures secure, HTTP-only cookies
 */
const getCookieOptions = () => {
  return {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

module.exports = getCookieOptions;
