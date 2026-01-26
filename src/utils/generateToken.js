const jwt = require('jsonwebtoken');

/**
 * Generate JWT token with user information
 * @param {string} userId - User's MongoDB ID
 * @param {string} role - User's role (admin/user)
 * @returns {string} JWT token
 */
const generateToken = (userId, role) => {
  const payload = {
    userId,
    role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });

  return token;
};

module.exports = generateToken;
