const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // unique глобально; если нужно per-school, используйте compound index
  date: { type: Date, required: true },
  description: { type: String },
  is_active: { type: Boolean, default: false },
  school_id: {  // ← Добавьте это поле
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  }
}, {
  timestamps: true  // ← Опционально: добавит createdAt/updatedAt автоматически
});

module.exports = mongoose.model('Event', eventSchema);