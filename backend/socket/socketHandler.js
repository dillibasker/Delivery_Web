const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ride = require('../models/Ride');

module.exports = (io) => {
  // Authenticate socket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ ${socket.user.name} (${socket.user.role}) connected - ${socket.id}`);

    // Save socket ID to user
    await User.findByIdAndUpdate(socket.user._id, { socketId: socket.id });

    // Driver: join their own room to receive ride requests
    if (socket.user.role === 'driver') {
      socket.join('drivers_room');

      // Set driver available
      socket.on('driver:setAvailable', async (available) => {
        await User.findByIdAndUpdate(socket.user._id, { isAvailable: available });
        socket.emit('driver:availabilityUpdated', available);
      });

      // Driver sends location update
      socket.on('driver:locationUpdate', async ({ lat, lng, rideId }) => {
        await User.findByIdAndUpdate(socket.user._id, { currentLocation: { lat, lng } });
        if (rideId) {
          // Emit to ride room so owner sees it
          io.to(`ride_${rideId}`).emit('driver:moved', { lat, lng, driverId: socket.user._id });
        }
      });

      // Driver accepts ride
      socket.on('driver:acceptRide', async ({ rideId }) => {
        try {
          const ride = await Ride.findById(rideId);
          if (!ride || ride.status !== 'pending') {
            return socket.emit('error', { message: 'Ride not available' });
          }
          ride.driver = socket.user._id;
          ride.status = 'accepted';
          await ride.save();

          const populated = await ride.populate([
            { path: 'driver', select: 'name phone vehicleInfo currentLocation' },
            { path: 'owner', select: 'name phone' }
          ]);

          // Driver joins ride room
          socket.join(`ride_${rideId}`);

          // Notify owner in ride room
          io.to(`ride_${rideId}`).emit('ride:accepted', { ride: populated });

          // Notify all drivers that ride is taken
          io.to('drivers_room').emit('ride:taken', { rideId });

          socket.emit('driver:rideAccepted', { ride: populated });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      // Driver starts ride
      socket.on('driver:startRide', async ({ rideId }) => {
        await Ride.findByIdAndUpdate(rideId, { status: 'in_progress' });
        io.to(`ride_${rideId}`).emit('ride:started', { rideId });
      });

      // Driver completes ride
      socket.on('driver:completeRide', async ({ rideId }) => {
        await Ride.findByIdAndUpdate(rideId, { status: 'completed' });
        io.to(`ride_${rideId}`).emit('ride:completed', { rideId });
        socket.leave(`ride_${rideId}`);
      });
    }

    // Owner: join ride room to track
    if (socket.user.role === 'owner') {
      socket.on('owner:joinRide', async ({ rideId }) => {
        socket.join(`ride_${rideId}`);
        console.log(`Owner ${socket.user.name} joined ride room: ride_${rideId}`);
      });

      socket.on('owner:bookRide', async (rideData) => {
        try {
          const { pickup, drop, fare, distance } = rideData;
          const rideRoom = `ride_${Date.now()}_${socket.user._id}`;
          const ride = await Ride.create({
            owner: socket.user._id,
            pickup, drop, fare, distance, rideRoom
          });
          const populated = await ride.populate('owner', 'name phone');

          // Owner joins ride room
          socket.join(`ride_${ride._id}`);

          // Broadcast to all drivers
          io.to('drivers_room').emit('ride:newRequest', { ride: populated });

          socket.emit('ride:booked', { ride: populated });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('owner:cancelRide', async ({ rideId }) => {
        await Ride.findByIdAndUpdate(rideId, { status: 'cancelled' });
        io.to(`ride_${rideId}`).emit('ride:cancelled', { rideId });
        socket.leave(`ride_${rideId}`);
        io.to('drivers_room').emit('ride:taken', { rideId }); // remove from driver list
      });
    }

    socket.on('disconnect', async () => {
      console.log(`❌ ${socket.user.name} disconnected`);
      await User.findByIdAndUpdate(socket.user._id, { socketId: null, isAvailable: false });
    });
  });
};
