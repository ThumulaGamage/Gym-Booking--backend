require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Register routes FIRST
app.use('/api/auth', require('./routes/auth'));
app.use("/api/bookings", require("./routes/booking"));

app.use('/api/admin', require('./routes/admin'));
app.use('/api/qr', require('./routes/qr'));

// Then test route
app.get('/', (req, res) => res.send('Gym Management API running'));

// Start server LAST
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

