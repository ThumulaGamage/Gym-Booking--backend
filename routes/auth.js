// server/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/user');

// @route   POST /api/auth/register
// @desc    Register a student/admin
// @access  Public
router.post('/register', async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ msg: 'Request body is missing' });

    const { name, email, password, role, registrationNo, indexNo, batch, telNo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists with this email' });

    // Check if registration number exists (if provided)
    if (registrationNo) {
      const regExists = await User.findOne({ registrationNo });
      if (regExists) {
        return res.status(400).json({ msg: 'Registration number already exists' });
      }
    }

    // Check if index number exists (if provided)
    if (indexNo) {
      const indexExists = await User.findOne({ indexNo });
      if (indexExists) {
        return res.status(400).json({ msg: 'Index number already exists' });
      }
    }

    user = new User({
      name,
      email,
      password,
      role: role || 'student',
      registrationNo: registrationNo || null,
      indexNo: indexNo || null,
      batch: batch || null,
      telNo: telNo || null
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        registrationNo: user.registrationNo,
        indexNo: user.indexNo,
        batch: user.batch,
        telNo: user.telNo
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ msg: 'Request body is missing' });

    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ msg: 'Please enter all fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        registrationNo: user.registrationNo,
        indexNo: user.indexNo,
        batch: user.batch,
        telNo: user.telNo
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/verify-admin
// @desc    Verify if user is admin
// @access  Private
router.get('/verify-admin', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    res.json({ isAdmin: user.role === 'admin' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;