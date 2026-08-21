/**
 * Role-Based Access Control Middleware
 * @param {Array<string>} allowedRoles 
 */
function requireRole(allowedRoles = []) {
  const normalized = allowedRoles.map(r => r.toUpperCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
    }

    // ADMIN has universal override privileges
    if (req.user.role === 'ADMIN' || normalized.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: ${normalized.join(', ')}`
    });
  };
}

module.exports = { requireRole };
