function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  if (!req.user.isAdmin || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }
    
    // Check if user has specific permission
    // This could be expanded based on granular permissions
    const allowedPermissions = [
      'user_management',
      'payment_management', 
      'signal_management',
      'dashboard_access'
    ];
    
    if (!allowedPermissions.includes(permission)) {
      return res.status(403).json({
        error: `Permission ${permission} required`
      });
    }
    
    next();
  };
}

module.exports = { 
  requireAdmin, 
  requirePermission 
};