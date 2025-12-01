// server/models/user.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student','admin'], 
    default: 'student' 
  },
  
  // New fields for student details
  registrationNo: {
    type: String,
    trim: true,
    sparse: true,  // Allows null but must be unique if provided
    default: null
  },
  indexNo: {
    type: String,
    trim: true,
    sparse: true,
    default: null
  },
  batch: {
    type: String,
    trim: true,
    default: null
  },
  telNo: {
    type: String,
    trim: true,
    default: null
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add index for registration number (unique if not null)
UserSchema.index({ registrationNo: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { registrationNo: { $type: 'string' } }
});

// Add index for index number (unique if not null)
UserSchema.index({ indexNo: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { indexNo: { $type: 'string' } }
});

module.exports = mongoose.model('User', UserSchema);