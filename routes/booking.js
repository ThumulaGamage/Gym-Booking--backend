// routes/booking.js

const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// Create booking
router.post("/", auth, async (req, res) => {
  try {
    const { slot, date } = req.body;
    if (!slot || !date) {
      return res.status(400).json({ msg: "Slot and date are required" });
    }

    // Check if slot date is in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ msg: "Cannot book slots in the past" });
    }

    // Check if user already booked same slot
    const exists = await Booking.findOne({
      user: req.user.id,
      date,
      slot
    });

    if (exists) {
      return res.status(400).json({ msg: "You already booked this slot" });
    }

    const booking = await Booking.create({
      user: req.user.id,
      slot,
      date
    });

    const populatedBooking = await Booking.findById(booking._id).populate('user', 'name email');
    res.json({ msg: "Booking success", booking: populatedBooking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's bookings - NEW ENDPOINT ADDED
router.get("/", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's own bookings
router.get("/my", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ date: 1, slot: 1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete/Cancel booking
router.delete("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    // Check if booking belongs to the user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Check slot availability for a specific date
router.get("/availability/:date", auth, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Get all bookings for this date
    const bookings = await Booking.find({ date });
    
    // Count bookings per slot (assuming max 10 per slot)
    const slotCounts = {};
    bookings.forEach(booking => {
      slotCounts[booking.slot] = (slotCounts[booking.slot] || 0) + 1;
    });

    res.json({ slotCounts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Admin: Get all bookings
router.get("/admin/all", [auth, admin], async (req, res) => {
  try {
    const { date, slot } = req.query;
    
    let query = {};
    if (date) query.date = date;
    if (slot) query.slot = slot;

    const bookings = await Booking.find(query)
      .populate('user', 'name email registrationNo indexNo batch telNo')
      .sort({ date: 1, slot: 1 });
    
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Admin: Delete any booking
router.delete("/admin/:id", [auth, admin], async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET: Gym Settings
const GymSettings = require("../models/GymSettings");

router.get("/settings", auth, async (req, res) => {
  try {
    let settings = await GymSettings.findOne();

    // If no settings exist, create default ones automatically
    if (!settings) {
      settings = await GymSettings.create({
        slots: [
          {
            name: "Morning Slot (6AM - 8AM)",
            startTime: "06:00",
            endTime: "08:00",
            capacity: 20,
            enabled: true
          },
          {
            name: "Evening Slot (5PM - 7PM)",
            startTime: "17:00",
            endTime: "19:00",
            capacity: 20,
            enabled: true
          }
        ],
        bookingEnabled: true,
        maxAdvanceBookingDays: 7,
        closedDates: [],
      });
    }

    res.json(settings);

  } catch (error) {
    console.error("Error loading gym settings:", error);
    res.status(500).json({ msg: "Server error loading settings" });
  }
});

module.exports = router;