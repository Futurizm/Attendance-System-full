const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['teacher', 'parent', 'student', 'school_admin', 'main_admin'] },
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  name: { type: String },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  created_at: { type: Date, default: Date.now },
});

// Add pre-save middleware to enforce `name` requirement for specific roles
UserSchema.pre('save', function (next) {
  if (['teacher', 'parent', 'school_admin'].includes(this.role) && !this.name) {
    return next(new Error('Name is required for teacher, parent, or school_admin roles'));
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);