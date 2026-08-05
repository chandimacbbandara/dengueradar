export const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied: insufficient role' });
  }
  if (req.user.role === 'moh_officer' && !req.user.isApproved) {
    return res.status(403).json({ success: false, message: 'Account pending admin approval' });
  }
  next();
};
