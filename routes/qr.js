// routes/qr.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance');
const Booking = require('../models/booking');
const User = require('../models/user');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Generate QR code data for student
router.get('/generate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Create QR data payload
    const qrData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      registrationNo: user.registrationNo,
      indexNo: user.indexNo,
      timestamp: Date.now(),
      expiresIn: 300000 // 5 minutes validity
    };

    // Sign the QR data
    const token = jwt.sign(qrData, process.env.JWT_SECRET, { expiresIn: '5m' });

    res.json({
      qrToken: token,
      userData: {
        name: user.name,
        email: user.email,
        registrationNo: user.registrationNo,
        indexNo: user.indexNo
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Verify and scan QR code (Admin only)
router.post('/scan', [auth, admin], async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ msg: 'QR token is required' });
    }

    // Verify QR token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ msg: 'QR code expired. Please generate a new one.' });
      }
      return res.status(400).json({ msg: 'Invalid QR code' });
    }

    const userId = decoded.userId;
    const today = new Date().toISOString().split('T')[0];

    // Find today's booking for this user
    const booking = await Booking.findOne({
      user: userId,
      date: today
    }).populate('user', 'name email registrationNo indexNo batch');

    if (!booking) {
      return res.status(404).json({ 
        msg: 'No booking found for today',
        userName: decoded.name
      });
    }

    // Check if already checked in
    const existingAttendance = await Attendance.findOne({
      user: userId,
      booking: booking._id
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        msg: 'Already checked in',
        attendance: existingAttendance,
        booking: booking
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      user: userId,
      booking: booking._id,
      date: today,
      slot: booking.slot,
      scannedBy: req.user.id,
      status: 'present'
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email registrationNo indexNo batch')
      .populate('scannedBy', 'name');

    res.json({
      msg: 'Check-in successful',
      attendance: populatedAttendance,
      booking: booking
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get attendance records (Admin)
router.get('/attendance', [auth, admin], async (req, res) => {
  try {
    const { date, slot } = req.query;

    let query = {};
    if (date) query.date = date;
    if (slot) query.slot = slot;

    const attendances = await Attendance.find(query)
      .populate('user', 'name email registrationNo indexNo batch')
      .populate('booking')
      .populate('scannedBy', 'name')
      .sort({ checkInTime: -1 });

    res.json(attendances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get my attendance history
router.get('/my-attendance', auth, async (req, res) => {
  try {
    const attendances = await Attendance.find({ user: req.user.id })
      .populate('scannedBy', 'name')
      .sort({ checkInTime: -1 });

    res.json(attendances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get attendance statistics (Admin)
router.get('/statistics', [auth, admin], async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalAttendances = await Attendance.countDocuments();
    const todayAttendances = await Attendance.countDocuments({ date: today });
    
    // Get bookings vs attendance ratio
    const todayBookings = await Booking.countDocuments({ date: today });
    const attendanceRate = todayBookings > 0 
      ? ((todayAttendances / todayBookings) * 100).toFixed(1) 
      : 0;

    res.json({
      totalAttendances,
      todayAttendances,
      todayBookings,
      attendanceRate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;