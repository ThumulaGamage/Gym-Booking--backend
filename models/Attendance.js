// models/Attendance.js

const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  date: {
    type: String,   // YYYY-MM-DD
    required: true
  },
  slot: {
    type: String,
    required: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Admin who scanned
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present'
  },
  notes: {
    type: String,
    default: ''
  }
});

// Compound index to prevent duplicate check-ins
AttendanceSchema.index({ user: 1, booking: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);