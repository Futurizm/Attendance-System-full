const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  group: { type: String, required: true },
  course: { type: Number, required: true },
  specialty: { type: String, required: true },
  qr_code: { type: String, unique: true, required: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Student', studentSchema);