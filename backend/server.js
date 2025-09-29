require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const Student = require('./models/Student');
const Event = require('./models/Event');
const AttendanceRecord = require('./models/AttendanceRecord');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Students routes
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ created_at: -1 });
    console.log('Fetched students:', students);
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching students', details: err.message });
  }
});

app.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Fetched student:', student);
    res.json(student);
  } catch (err) {
    console.error('Error fetching student:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching student', details: err.message });
  }
});

app.get('/students/qr/:qrCode', async (req, res) => {
  try {
    const student = await Student.findOne({ qr_code: req.params.qrCode });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Fetched student by QR:', student);
    res.json(student);
  } catch (err) {
    console.error('Error fetching student by QR:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching student by QR', details: err.message });
  }
});

app.post('/students', async (req, res) => {
  try {
    console.log('Received POST /students with body:', req.body);
    const student = new Student(req.body);
    await student.save();
    console.log('Student saved:', student);
    res.json(student);
  } catch (err) {
    console.error('Error adding student:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding student', details: err.message });
  }
});

app.put('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Updated student:', student);
    res.json(student);
  } catch (err) {
    console.error('Error updating student:', err.message, err.stack);
    res.status(500).json({ error: 'Error updating student', details: err.message });
  }
});

app.delete('/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting student:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting student', details: err.message });
  }
});

// Events routes
app.get('/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    console.log('Fetched events:', events);
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching events', details: err.message });
  }
});

app.get('/events/active', async (req, res) => {
  try {
    const events = await Event.find({ is_active: true }).sort({ date: -1 });
    console.log('Fetched active events:', events);
    res.json(events);
  } catch (err) {
    console.error('Error fetching active events:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching active events', details: err.message });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    console.log('Fetched event:', event);
    res.json(event);
  } catch (err) {
    console.error('Error fetching event:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching event', details: err.message });
  }
});

app.post('/events', async (req, res) => {
  try {
    console.log('Received POST /events with body:', req.body);
    const event = new Event(req.body);
    await event.save();
    console.log('Event saved:', event);
    res.json(event);
  } catch (err) {
    console.error('Error adding event:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding event', details: err.message });
  }
});

app.put('/events/:id/toggle-active', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log(`Invalid ObjectId: ${req.params.id}`);
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    console.log(`Received PUT /events/${req.params.id}/toggle-active with body:`, req.body);
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { is_active: req.body.is_active },
      { new: true }
    );
    if (!event) {
      console.log(`Event with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Event not found' });
    }
    console.log('Event updated:', event);
    res.json({ success: true });
  } catch (err) {
    console.error('Error toggling event:', err.message, err.stack);
    res.status(500).json({ error: 'Error toggling event', details: err.message });
  }
});

// Attendance routes
app.get('/attendance', async (req, res) => {
  try {
    const records = await AttendanceRecord.find()
      .populate('student_id', 'name')
      .sort({ timestamp: -1 });
    res.json(records.map(record => ({
      ...record.toObject(),
      studentName: record.student_id.name,
      student_id: record.student_id._id,
    })));
  } catch (err) {
    console.error('Error fetching attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching attendance', details: err.message });
  }
});

app.get('/attendance/event/:eventName', async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ event_name: req.params.eventName })
      .populate('student_id', 'name group course')
      .sort({ timestamp: -1 });
    res.json(records.map(record => ({
      ...record.toObject(),
      studentName: record.student_id.name,
    })));
  } catch (err) {
    console.error('Error fetching attendance by event:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching attendance by event', details: err.message });
  }
});

app.post('/attendance', async (req, res) => {
  try {
    console.log('Received POST /attendance with body:', req.body);
    const record = new AttendanceRecord(req.body);
    await record.save();
    const populated = await AttendanceRecord.findById(record._id).populate('student_id', 'name');
    res.json({
      ...populated.toObject(),
      studentName: populated.student_id.name,
    });
  } catch (err) {
    console.error('Error adding attendance:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Error adding attendance', details: err.message });
  }
});

app.get('/attendance/check', async (req, res) => {
  try {
    const { studentId, eventName } = req.query;
    console.log(`Checking attendance for studentId: ${studentId}, eventName: ${eventName}`);
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      console.log(`Invalid studentId: ${studentId}`);
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    if (!eventName) {
      console.log(`Invalid eventName: ${eventName}`);
      return res.status(400).json({ error: 'Invalid event name' });
    }
    const exists = await AttendanceRecord.exists({ student_id: studentId, event_name: eventName });
    console.log(`Attendance check result: ${exists}`);
    res.json(!!exists);
  } catch (err) {
    console.error('Error checking attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error checking attendance', details: err.message });
  }
});

app.delete('/attendance/:id', async (req, res) => {
  try {
    await AttendanceRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting attendance', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));