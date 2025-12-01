//models/booking.js

const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  slot: {
    type: String,
    required: true
  },
  date: {
    type: String,   // example: "2025-01-20"
    required: true
  }
});

module.exports = mongoose.model("Booking", BookingSchema);
