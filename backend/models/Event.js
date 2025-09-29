const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  description: { type: String },
  is_active: { type: Boolean, default: false },
});

module.exports = mongoose.model('Event', eventSchema);