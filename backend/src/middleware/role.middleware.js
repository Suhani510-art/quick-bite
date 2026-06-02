// ── Factory: returns a middleware that allows only specified roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

// Named exports for clean usage in routes
export const sellerOnly = requireRole('seller');
export const buyerOnly  = requireRole('buyer');
export const anyRole    = requireRole('seller', 'buyer');