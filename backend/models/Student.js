const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  group: { type: String, required: true },
  course: { type: Number, required: true, min: 1, max: 4 },
  specialty: { type: String, required: true },
  qr_code: { type: String, required: true, unique: true },
  school_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School',  // Ссылка на модель School для populate
    required: true 
  },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Student', StudentSchema);