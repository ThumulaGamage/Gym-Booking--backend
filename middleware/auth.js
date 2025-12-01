// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    // log headers for debugging
    console.log('--- AUTH MIDDLEWARE ---');
    console.log('headers.authorization:', req.header('Authorization'));
    console.log("headers['x-auth-token']:", req.header('x-auth-token'));

    // accept either header form
    const authHeader = req.header('Authorization');
    let token = req.header('x-auth-token') || (authHeader && authHeader.split(' ')[1]);

    if (!token) {
      console.log('Auth failed: no token found');
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user; // expected shape: { id, role }
      console.log('Auth success: user id =', req.user?.id, 'role =', req.user?.role);
      return next();
    } catch (err) {
      console.log('Auth failed: token invalid or expired ->', err.message);
      return res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
  } catch (err) {
    console.error('Auth middleware unexpected error:', err);
    return res.status(500).json({ msg: 'Server error in auth middleware' });
  }
};
