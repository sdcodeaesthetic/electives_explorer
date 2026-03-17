const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  email:    { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'student'], default: 'student' },
  name:     { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
