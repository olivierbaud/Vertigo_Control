const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      integrator_id: user.id, // For integrators, id === integrator_id
      email: user.email,
      role: 'admin' // Can expand later
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token valid for 7 days
  );
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };