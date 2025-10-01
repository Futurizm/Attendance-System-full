const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  is_active: { type: Boolean, default: false },
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

eventSchema.index({ school_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);