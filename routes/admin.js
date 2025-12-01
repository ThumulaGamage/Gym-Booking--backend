// routes/admin.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Booking = require('../models/booking');
const GymSettings = require('../models/GymSettings');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// ========== USER MANAGEMENT ==========

// Get all users
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add new user (Admin creates user)
router.post('/users', [auth, admin], async (req, res) => {
  try {
    const { name, email, password, role, registrationNo, indexNo, batch, telNo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

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

    res.json({
      msg: 'User created successfully',
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
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update user
router.put('/users/:id', [auth, admin], async (req, res) => {
  try {
    const { name, email, role, registrationNo, indexNo, batch, telNo } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if new registration number already exists
    if (registrationNo && registrationNo !== user.registrationNo) {
      const regExists = await User.findOne({ registrationNo, _id: { $ne: req.params.id } });
      if (regExists) {
        return res.status(400).json({ msg: 'Registration number already exists' });
      }
    }

    // Check if new index number already exists
    if (indexNo && indexNo !== user.indexNo) {
      const indexExists = await User.findOne({ indexNo, _id: { $ne: req.params.id } });
      if (indexExists) {
        return res.status(400).json({ msg: 'Index number already exists' });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (registrationNo !== undefined) user.registrationNo = registrationNo || null;
    if (indexNo !== undefined) user.indexNo = indexNo || null;
    if (batch !== undefined) user.batch = batch || null;
    if (telNo !== undefined) user.telNo = telNo || null;

    await user.save();

    res.json({
      msg: 'User updated successfully',
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
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Don't allow deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    // Delete all bookings of this user
    await Booking.deleteMany({ user: req.params.id });

    await User.findByIdAndDelete(req.params.id);

    res.json({ msg: 'User and their bookings deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== GYM SETTINGS MANAGEMENT ==========

// Get gym settings
router.get('/settings', [auth, admin], async (req, res) => {
  try {
    let settings = await GymSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await GymSettings.create({
        slots: [
          {
            name: '4:00 PM - 6:00 PM',
            startTime: '16:00',
            endTime: '18:00',
            capacity: 10,
            enabled: true
          },
          {
            name: '6:00 PM - 8:00 PM',
            startTime: '18:00',
            endTime: '20:00',
            capacity: 10,
            enabled: true
          }
        ],
        bookingEnabled: true,
        closedDates: [],
        maxAdvanceBookingDays: 7
      });
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update gym settings
router.put('/settings', [auth, admin], async (req, res) => {
  try {
    const { slots, bookingEnabled, closedDates, maxAdvanceBookingDays } = req.body;

    let settings = await GymSettings.findOne();

    if (!settings) {
      settings = new GymSettings();
    }

    // Update fields
    if (slots) settings.slots = slots;
    if (bookingEnabled !== undefined) settings.bookingEnabled = bookingEnabled;
    if (closedDates) settings.closedDates = closedDates;
    if (maxAdvanceBookingDays) settings.maxAdvanceBookingDays = maxAdvanceBookingDays;
    
    settings.lastUpdated = Date.now();
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({ msg: 'Settings updated successfully', settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Toggle booking system (Open/Close bookings)
router.post('/settings/toggle-booking', [auth, admin], async (req, res) => {
  try {
    let settings = await GymSettings.findOne();
    
    if (!settings) {
      return res.status(404).json({ msg: 'Settings not found' });
    }

    settings.bookingEnabled = !settings.bookingEnabled;
    settings.lastUpdated = Date.now();
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({
      msg: `Booking system ${settings.bookingEnabled ? 'opened' : 'closed'}`,
      bookingEnabled: settings.bookingEnabled
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add closed date
router.post('/settings/closed-dates', [auth, admin], async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ msg: 'Date is required' });
    }

    let settings = await GymSettings.findOne();
    if (!settings) {
      return res.status(404).json({ msg: 'Settings not found' });
    }

    // Check if date already closed
    const exists = settings.closedDates.find(d => d.date === date);
    if (exists) {
      return res.status(400).json({ msg: 'Date already marked as closed' });
    }

    settings.closedDates.push({ date, reason: reason || 'Closed' });
    settings.lastUpdated = Date.now();
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({ msg: 'Date marked as closed', settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Remove closed date
router.delete('/settings/closed-dates/:date', [auth, admin], async (req, res) => {
  try {
    let settings = await GymSettings.findOne();
    if (!settings) {
      return res.status(404).json({ msg: 'Settings not found' });
    }

    settings.closedDates = settings.closedDates.filter(
      d => d.date !== req.params.date
    );
    settings.lastUpdated = Date.now();
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({ msg: 'Closed date removed', settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== STATISTICS ==========

// Get detailed statistics
router.get('/statistics', [auth, admin], async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'student' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalBookings = await Booking.countDocuments();
    
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await Booking.countDocuments({ date: today });

    // Get bookings by slot
    const bookingsBySlot = await Booking.aggregate([
      {
        $group: {
          _id: '$slot',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalBookings,
      todayBookings,
      bookingsBySlot
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;