const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['owner', 'driver'], required: true },
  phone: { type: String, trim: true },
  vehicleInfo: {
    type: { type: String },
    number: { type: String },
    model: { type: String }
  },
  isAvailable: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  socketId: { type: String }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
