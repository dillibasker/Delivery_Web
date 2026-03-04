const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const { protect, requireRole } = require('../middleware/auth');

// Owner: Book a ride
router.post('/book', protect, requireRole('owner'), async (req, res) => {
  try {
    const { pickup, drop, fare, distance } = req.body;
    const rideRoom = `ride_${Date.now()}_${req.user._id}`;
    const ride = await Ride.create({
      owner: req.user._id,
      pickup,
      drop,
      fare,
      distance,
      rideRoom
    });
    res.status(201).json({ ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Owner: Get my rides
router.get('/my-rides', protect, requireRole('owner'), async (req, res) => {
  try {
    const rides = await Ride.find({ owner: req.user._id }).populate('driver', 'name phone vehicleInfo').sort('-createdAt');
    res.json({ rides });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Owner: Get active ride
router.get('/active', protect, requireRole('owner'), async (req, res) => {
  try {
    const ride = await Ride.findOne({
      owner: req.user._id,
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    }).populate('driver', 'name phone vehicleInfo currentLocation');
    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: Get pending rides
router.get('/pending', protect, requireRole('driver'), async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'pending' }).populate('owner', 'name phone').sort('-createdAt');
    res.json({ rides });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: Get my accepted/active ride
router.get('/driver-active', protect, requireRole('driver'), async (req, res) => {
  try {
    const ride = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ['accepted', 'in_progress'] }
    }).populate('owner', 'name phone');
    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: Accept a ride
router.patch('/:rideId/accept', protect, requireRole('driver'), async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'pending') return res.status(400).json({ message: 'Ride no longer available' });

    ride.driver = req.user._id;
    ride.status = 'accepted';
    await ride.save();

    const populated = await ride.populate('driver', 'name phone vehicleInfo currentLocation');
    res.json({ ride: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: Update ride status
router.patch('/:rideId/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = status;
    await ride.save();
    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel ride
router.patch('/:rideId/cancel', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = 'cancelled';
    await ride.save();
    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
