/**
 * Role-based Access Control Middleware
 * Restricts access based on user role
 * Must be used AFTER authMiddleware
 * 
 * @param {string} requiredRole - Role required to access the route
 * @returns {Function} Express middleware function
 */
const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    // Check if user exists on request (should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Check if user has the required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${requiredRole} role required.`,
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
