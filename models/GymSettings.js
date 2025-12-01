// models/GymSettings.js

const mongoose = require('mongoose');

const GymSettingsSchema = new mongoose.Schema({
  // Slot configuration
  slots: [{
    name: String,        // e.g., "Morning Slot"
    startTime: String,   // e.g., "06:00"
    endTime: String,     // e.g., "08:00"
    capacity: Number,    // max users per slot
    enabled: Boolean     // can be temporarily disabled
  }],
  
  // Booking control
  bookingEnabled: {
    type: Boolean,
    default: true
  },
  
  // Date-specific closures
  closedDates: [{
    date: String,        // YYYY-MM-DD format
    reason: String       // e.g., "Holiday", "Maintenance"
  }],
  
  // Booking rules
  maxAdvanceBookingDays: {
    type: Number,
    default: 7           // Users can book 7 days in advance
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('GymSettings', GymSettingsSchema);