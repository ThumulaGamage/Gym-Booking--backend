// middleware/admin.js

module.exports = function(req, res, next) {
  // req.user is already set by auth middleware
  // req.user contains { id, role }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: "Access denied. Admin only." });
  }
  next();
};