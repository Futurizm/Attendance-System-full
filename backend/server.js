require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Student = require('./models/Student');
const Event = require('./models/Event');
const AttendanceRecord = require('./models/AttendanceRecord');
const User = require('./models/User');
const School = require('./models/School'); // Импортируем модель School

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role middleware
const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email, role }).populate('school_id');
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role, school_id: user.school_id?._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, role: user.role, school_id: user.school_id?._id });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Register route
app.post('/api/auth/register', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  const { email, password, role, school_id } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'User already exists' });

    if (role === 'school_admin' && !school_id) {
      return res.status(400).json({ error: 'School ID required for school_admin' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword, role, school_id });
    await user.save();

    res.json({ message: 'User registered' });
  } catch (err) {
    console.error('Register error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Seed demo user and school on startup
(async () => {
  const demoEmail = 'admin@education.gov';
  const existingUser = await User.findOne({ email: demoEmail });
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const demoUser = new User({ email: demoEmail, password: hashedPassword, role: 'main_admin' });
    await demoUser.save();
    console.log('Demo main_admin user created');
  }

  const defaultSchool = await School.findOne({ name: 'Default School' });
  if (!defaultSchool) {
    const school = new School({ name: 'Default School', created_at: new Date() });
    await school.save();
    console.log('Default school created:', school);
  }
})();

// Schools routes
app.get('/api/schools', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const schools = await School.find().sort({ created_at: -1 });
    console.log('Fetched schools:', schools);
    res.json(schools);
  } catch (err) {
    console.error('Error fetching schools:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching schools', details: err.message });
  }
});

app.post('/api/schools', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'School name required' });
    const school = new School({ name, created_at: new Date() });
    await school.save();
    console.log('School added:', school);
    res.json(school);
  } catch (err) {
    console.error('Error adding school:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding school', details: err.message });
  }
});

app.put('/api/schools/:id', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'School name required' });
    const school = await School.findByIdAndUpdate(
      req.params.id,
      { name, updated_at: new Date() },
      { new: true }
    );
    if (!school) return res.status(404).json({ error: 'School not found' });
    console.log('School updated:', school);
    res.json(school);
  } catch (err) {
    console.error('Error updating school:', err.message, err.stack);
    res.status(500).json({ error: 'Error updating school', details: err.message });
  }
});

app.delete('/api/schools/:id', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) return res.status(404).json({ error: 'School not found' });
    console.log('School deleted:', school);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting school:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting school', details: err.message });
  }
});

// Users routes
app.get('/api/users', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const users = await User.find().populate('school_id', 'name').sort({ created_at: -1 });
    console.log('Fetched users:', users);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching users', details: err.message });
  }
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log('User deleted:', user);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting user', details: err.message });
  }
});

// Students routes
app.get('/students', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { school_id: req.user.school_id } : {};
    const students = await Student.find(query).sort({ created_at: -1 });
    console.log('Fetched students:', students);
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching students', details: err.message });
  }
});

app.get('/students/:id', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const student = await Student.findOne(query);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Fetched student:', student);
    res.json(student);
  } catch (err) {
    console.error('Error fetching student:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching student', details: err.message });
  }
});

app.get('/students/qr/:qrCode', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { qr_code: req.params.qrCode, school_id: req.user.school_id } : { qr_code: req.params.qrCode };
    const student = await Student.findOne(query);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Fetched student by QR:', student);
    res.json(student);
  } catch (err) {
    console.error('Error fetching student by QR:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching student by QR', details: err.message });
  }
});

app.post('/students', authMiddleware, roleMiddleware(['school_admin', 'main_admin']), async (req, res) => {
  try {
    console.log('Received POST /students with body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    if (req.user.role === 'school_admin') {
      if (!req.user.school_id) {
        console.log('School ID missing for school_admin');
        return res.status(400).json({ error: 'School ID missing for school_admin user' });
      }
      req.body.school_id = req.user.school_id; // Set school_id for school_admin
      console.log('Set school_id for school_admin:', req.body.school_id);
    } 
    const school = await School.findById(req.body.school_id);
  
    console.log('Found school:', school);
    const student = new Student(req.body);
    await student.save();
    console.log('Student saved:', student);
    res.json(student);
  } catch (err) {
    console.error('Error adding student:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding student', details: err.message });
  }
});

app.put('/students/:id', authMiddleware, roleMiddleware(['school_admin', 'main_admin']), async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    if (req.body.school_id && !mongoose.isValidObjectId(req.body.school_id)) {
      return res.status(400).json({ error: 'Invalid school_id' });
    }
    if (req.body.school_id) {
      const school = await School.findById(req.body.school_id);
      if (!school) return res.status(400).json({ error: 'School not found' });
    }
    const student = await Student.findOneAndUpdate(query, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Updated student:', student);
    res.json(student);
  } catch (err) {
    console.error('Error updating student:', err.message, err.stack);
    res.status(500).json({ error: 'Error updating student', details: err.message });
  }
});

app.delete('/students/:id', authMiddleware, roleMiddleware(['school_admin', 'main_admin']), async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const student = await Student.findOneAndDelete(query);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    console.log('Deleted student:', student);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting student:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting student', details: err.message });
  }
});

// Events routes
app.get('/events', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { school_id: req.user.school_id } : {};
    const events = await Event.find(query).sort({ date: -1 });
    console.log('Fetched events:', events);
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching events', details: err.message });
  }
});

app.get('/events/active', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { is_active: true, school_id: req.user.school_id } : { is_active: true };
    const events = await Event.find(query).sort({ date: -1 });
    console.log('Fetched active events:', events);
    res.json(events);
  } catch (err) {
    console.error('Error fetching active events:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching active events', details: err.message });
  }
});

app.get('/events/:id', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const event = await Event.findOne(query);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    console.log('Fetched event:', event);
    res.json(event);
  } catch (err) {
    console.error('Error fetching event:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching event', details: err.message });
  }
});

app.post('/events', authMiddleware, roleMiddleware(['teacher', 'school_admin', 'main_admin']), async (req, res) => {
  try {
    console.log('Received POST /events with body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    
    const school = await School.findById(req.body.school_id);
    const event = new Event(req.body);
    await event.save();
    console.log('Event saved:', event);
    res.json(event);
  } catch (err) {
    console.error('Error adding event:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding event', details: err.message });
  }
});

app.put('/events/:id/toggle-active', authMiddleware, roleMiddleware(['teacher', 'school_admin', 'main_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log(`Invalid ObjectId: ${req.params.id}`);
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    console.log(`Received PUT /events/${req.params.id}/toggle-active with body:`, req.body);
    const query = req.user.role === 'school_admin' ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const event = await Event.findOneAndUpdate(
      query,
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
app.get('/attendance', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin' ? { student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } } : {};
    const records = await AttendanceRecord.find(query)
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

app.get('/attendance/event/:eventName', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin'
      ? { event_name: req.params.eventName, student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } }
      : { event_name: req.params.eventName };
    const records = await AttendanceRecord.find(query)
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

app.get('/attendance/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === 'school_admin'
      ? { student_id: req.params.studentId, student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } }
      : { student_id: req.params.studentId };
    const records = await AttendanceRecord.find(query)
      .populate('student_id', 'name')
      .sort({ timestamp: -1 });
    res.json(records.map(record => ({
      ...record.toObject(),
      studentName: record.student_id.name,
    })));
  } catch (err) {
    console.error('Error fetching attendance by student:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching attendance by student', details: err.message });
  }
});

app.post('/attendance', authMiddleware, roleMiddleware(['teacher']), async (req, res) => {
  try {
    console.log('Received POST /attendance with body:', req.body);
    const student = await Student.findById(req.body.student_id);
    if (!student) return res.status(400).json({ error: 'Student not found' });
    if (req.user.role === 'school_admin' && student.school_id.toString() !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }
    const record = new AttendanceRecord(req.body);
    await record.save();
    const populated = await AttendanceRecord.findById(record._id).populate('student_id', 'name');
    res.json({
      ...populated.toObject(),
      studentName: populated.student_id.name,
    });
  } catch (err) {
    console.error('Error adding attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding attendance', details: err.message });
  }
});

app.get('/attendance/check', authMiddleware, async (req, res) => {
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
    const query = req.user.role === 'school_admin'
      ? { student_id: studentId, event_name: eventName, student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } }
      : { student_id: studentId, event_name: eventName };
    const exists = await AttendanceRecord.exists(query);
    console.log(`Attendance check result: ${exists}`);
    res.json(!!exists);
  } catch (err) {
    console.error('Error checking attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error checking attendance', details: err.message });
  }
});

app.delete('/attendance/:id', authMiddleware, roleMiddleware(['school_admin', 'main_admin']), async (req, res) => {
  try {
    const query = req.user.role === 'school_admin'
      ? { _id: req.params.id, student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } }
      : { _id: req.params.id };
    const record = await AttendanceRecord.findOneAndDelete(query);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error deleting attendance', details: err.message });
  }
});

// Analytics route
app.get('/api/analytics', authMiddleware, roleMiddleware(['main_admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByRole = {
      teachers: await User.countDocuments({ role: 'teacher' }),
      parents: await User.countDocuments({ role: 'parent' }),
      students: await User.countDocuments({ role: 'student' }),
      schoolAdmins: await User.find({ role: 'school_admin' }).populate('school_id', 'name').then(admins =>
        admins.map(admin => ({
          _id: admin._id,
          email: admin.email,
          school: admin.school_id ? admin.school_id.name : null,
        }))
      ),
      mainAdmins: await User.countDocuments({ role: 'main_admin' }),
    };
    const totalSchools = await School.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAttendance = await AttendanceRecord.countDocuments();
    const attendanceBySchool = await AttendanceRecord.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'schools',
          localField: 'student.school_id',
          foreignField: '_id',
          as: 'school',
        },
      },
      { $unwind: '$school' },
      {
        $group: {
          _id: '$school.name',
          attendanceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          school: '$_id',
          attendanceCount: 1,
          _id: 0,
        },
      },
    ]);

    res.json({
      totalUsers,
      usersByRole,
      totalSchools,
      totalStudents,
      totalEvents,
      totalAttendance,
      attendanceBySchool,
    });
  } catch (err) {
    console.error('Error fetching analytics:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching analytics', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));