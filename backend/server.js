require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("./models/Student");
const Event = require("./models/Event");
const AttendanceRecord = require("./models/AttendanceRecord");
const User = require("./models/User");
const School = require("./models/School");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));
app.use(morgan("dev"));

console.log("MongoDB URI:", process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Role middleware
const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

// Login route
app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email, role }).populate("school_id");
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role, school_id: user.school_id?._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.json({ token, role: user.role, school_id: user.school_id?._id });
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Register route for users (teachers, parents, school_admins)
app.post("/api/auth/register", authMiddleware, roleMiddleware(["school_admin", "main_admin"]), async (req, res) => {
  const { email, password, role, school_id, name } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User already exists" });

    if (role !== "main_admin" && !school_id) {
      return res.status(400).json({ error: "School ID required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword, role, school_id, name });
    await user.save();

    res.json({ message: "User registered" });
  } catch (err) {
    console.error("Register error:", err.message, err.stack);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Seed demo user and school on startup
(async () => {
  const demoEmail = "admin@education.gov";
  const existingUser = await User.findOne({ email: demoEmail });
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);
    const demoUser = new User({ email: demoEmail, password: hashedPassword, role: "main_admin" });
    await demoUser.save();
    console.log("Demo main_admin user created");
  }

  const defaultSchool = await School.findOne({ name: "Default School" });
  if (!defaultSchool) {
    const school = new School({ name: "Default School", created_at: new Date() });
    await school.save();
    console.log("Default school created:", school);
  }
})();

// Add child to parent
app.put("/api/users/:id/add-child", authMiddleware, roleMiddleware(["school_admin", "main_admin"]), async (req, res) => {
  try {
    const { student_id } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "parent") return res.status(400).json({ error: "Not a parent" });

    if (req.user.role === "school_admin" && user.school_id.toString() !== req.user.school_id) return res.status(403).json({ error: "Access denied" });

    const student = await Student.findById(student_id);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (req.user.role === "school_admin" && student.school_id.toString() !== req.user.school_id) return res.status(403).json({ error: "Access denied" });

    if (!user.children.includes(student_id)) {
      user.children.push(student_id);
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error("Error adding child:", err.message, err.stack);
    res.status(500).json({ error: "Error adding child", details: err.message });
  }
});

// Get my children for parent
app.get("/api/my-children", authMiddleware, roleMiddleware(["parent"]), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("children");
    res.json(user.children);
  } catch (err) {
    console.error("Error fetching children:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching children", details: err.message });
  }
});

// Get my student data for student role
app.get("/api/my-student", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user.userId }).populate("school_id");
    if (!student) return res.status(404).json({ error: "Student data not found" });
    res.json(student);
  } catch (err) {
    console.error("Error fetching my student:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching my student", details: err.message });
  }
});

// Schools routes
app.get("/api/schools", authMiddleware, roleMiddleware(["main_admin"]), async (req, res) => {
  try {
    const schools = await School.find().sort({ created_at: -1 });
    console.log("Fetched schools:", schools);
    res.json(schools);
  } catch (err) {
    console.error("Error fetching schools:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching schools", details: err.message });
  }
});

app.post("/api/schools", authMiddleware, roleMiddleware(["main_admin"]), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "School name required" });
    const school = new School({ name, created_at: new Date() });
    await school.save();
    console.log("School added:", school);
    res.json(school);
  } catch (err) {
    console.error("Error adding school:", err.message, err.stack);
    res.status(500).json({ error: "Error adding school", details: err.message });
  }
});

app.put("/api/schools/:id", authMiddleware, roleMiddleware(["main_admin"]), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "School name required" });
    const school = await School.findByIdAndUpdate(req.params.id, { name, updated_at: new Date() }, { new: true });
    if (!school) return res.status(404).json({ error: "School not found" });
    console.log("School updated:", school);
    res.json(school);
  } catch (err) {
    console.error("Error updating school:", err.message, err.stack);
    res.status(500).json({ error: "Error updating school", details: err.message });
  }
});

app.delete("/api/schools/:id", authMiddleware, roleMiddleware(["main_admin"]), async (req, res) => {
  try {
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) return res.status(404).json({ error: "School not found" });
    console.log("School deleted:", school);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting school:", err.message, err.stack);
    res.status(500).json({ error: "Error deleting school", details: err.message });
  }
});

app.get('/api/schools/:id', authMiddleware, roleMiddleware(['main_admin', 'school_admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const schoolId = req.params.id;
    // Restrict school_admin, teacher, and parent to their own school
    if (req.user.role === 'school_admin' || req.user.role === 'teacher' || req.user.role === 'parent') {
      if (req.user.school_id.toString() !== schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    console.error('Error fetching school:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching school', details: err.message });
  }
});

// Users routes
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "school_admin") {
      query = { school_id: req.user.school_id };
    } else if (req.query.school_id) {
      query = { school_id: req.query.school_id };
    }
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query)
      .populate('school_id', 'name')
      .populate('children', 'name group course') // Добавляем популяцию поля children
      .sort({ created_at: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching users', details: err.message });
  }
});

app.delete("/api/users/:id", authMiddleware, roleMiddleware(["main_admin", "school_admin"]), async (req, res) => {
  try {
    const query = req.user.role === "school_admin" ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const user = await User.findOneAndDelete(query);
    if (!user) return res.status(404).json({ error: "User not found" });
    console.log("User deleted:", user);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting user:", err.message, err.stack);
    res.status(500).json({ error: "Error deleting user", details: err.message });
  }
});

// Students routes
app.get('/students', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'school_admin') {
      query = { school_id: req.user.school_id };
    } else if (req.query.school_id) {
      query = { school_id: req.query.school_id };
    }
    const students = await Student.find(query).sort({ created_at: -1 });
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching students', details: err.message });
  }
});

app.get("/students/:id", authMiddleware, async (req, res) => {
  try {
    const query =
      req.user.role === "school_admin" ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const student = await Student.findOne(query);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error("Error fetching student:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching student", details: err.message });
  }
});

app.get(
  "/students/qr/:qrCode",
  authMiddleware,
  roleMiddleware(["teacher", "school_admin", "main_admin"]),
  async (req, res) => {
    try {
      const query =
        req.user.role === "school_admin"
          ? { qr_code: req.params.qrCode, school_id: req.user.school_id }
          : { qr_code: req.params.qrCode };
      const student = await Student.findOne(query);
      if (!student) return res.status(404).json({ error: "Student not found" });
      res.json(student);
    } catch (err) {
      console.error("Error fetching student by QR:", err.message, err.stack);
      res.status(500).json({ error: "Error fetching student by QR", details: err.message });
    }
  },
);

app.post('/students', authMiddleware, roleMiddleware(['school_admin', 'main_admin']), async (req, res) => {
  try {
    const { name, group, course, specialty, email, password, enrolled_events = [], qr_code: providedQrCode } = req.body;
    let school_id = req.body.school_id;
    if (req.user.role === 'school_admin') {
      school_id = req.user.school_id;
    }
    if (!school_id) return res.status(400).json({ error: 'School ID required' });

    const school = await School.findById(school_id);
    if (!school) return res.status(400).json({ error: 'School not found' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User already exists" });

    if (!password) return res.status(400).json({ error: "Password required" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword, role: "student", school_id, name });
    await user.save();

    const qr_code = providedQrCode || uuidv4();

    const student = new Student({ name, group, course, specialty, qr_code, school_id, user_id: user._id, enrolled_events });
    await student.save();

    res.json(student);
  } catch (err) {
    console.error('Error adding student:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding student', details: err.message });
  }
});

app.put("/students/:id", authMiddleware, roleMiddleware(["school_admin", "main_admin"]), async (req, res) => {
  try {
    const query =
      req.user.role === "school_admin" ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    if (req.body.school_id && !mongoose.isValidObjectId(req.body.school_id)) {
      return res.status(400).json({ error: "Invalid school_id" });
    }
    if (req.body.school_id) {
      const school = await School.findById(req.body.school_id);
      if (!school) return res.status(400).json({ error: "School not found" });
    }
    const student = await Student.findOneAndUpdate(query, req.body, { new: true });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error("Error updating student:", err.message, err.stack);
    res.status(500).json({ error: "Error updating student", details: err.message });
  }
});

app.delete("/students/:id", authMiddleware, roleMiddleware(["school_admin", "main_admin"]), async (req, res) => {
  try {
    const query =
      req.user.role === "school_admin" ? { _id: req.params.id, school_id: req.user.school_id } : { _id: req.params.id };
    const student = await Student.findOneAndDelete(query);
    if (!student) return res.status(404).json({ error: "Student not found" });
    if (student.user_id) await User.findByIdAndDelete(student.user_id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting student:", err.message, err.stack);
    res.status(500).json({ error: "Error deleting student", details: err.message });
  }
});

// Events routes
app.get('/events', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query = { teacher_id: req.user.userId, school_id: req.user.school_id };
    } else if (req.user.role === 'school_admin') {
      query = { school_id: req.user.school_id };
    } else if (req.query.school_id) {
      query = { school_id: req.query.school_id };
    }
    const events = await Event.find(query).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching events', details: err.message });
  }
});

app.get("/events/active", authMiddleware, async (req, res) => {
  try {
    let query = { is_active: true };
    if (req.user.role === "teacher") {
      query.teacher_id = req.user.userId;
      query.school_id = req.user.school_id;
    } else if (req.user.role === "school_admin") {
      query.school_id = req.user.school_id;
    }
    const events = await Event.find(query).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error("Error fetching active events:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching active events", details: err.message });
  }
});

app.get("/events/:id", authMiddleware, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === "teacher") {
      query.teacher_id = req.user.userId;
      query.school_id = req.user.school_id;
    } else if (req.user.role === "school_admin") {
      query.school_id = req.user.school_id;
    }
    const event = await Event.findOne(query);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("Error fetching event:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching event", details: err.message });
  }
});

app.post('/events', authMiddleware, roleMiddleware(['teacher', 'school_admin', 'main_admin']), async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      req.body.teacher_id = req.user.userId;
      req.body.school_id = req.user.school_id;
    } else if (req.user.role === 'school_admin') {
      req.body.school_id = req.user.school_id;
    }
    if (!req.body.school_id || !req.body.teacher_id) return res.status(400).json({ error: 'School ID and Teacher ID required' });
    const teacher = await User.findById(req.body.teacher_id);
    if (!teacher || teacher.role !== 'teacher' || teacher.school_id.toString() !== req.body.school_id) return res.status(400).json({ error: 'Invalid teacher' });
    const school = await School.findById(req.body.school_id);
    if (!school) return res.status(400).json({ error: 'School not found' });
    const event = new Event(req.body);
    await event.save();
    res.json(event);
  } catch (err) {
    console.error('Error adding event:', err.message, err.stack);
    res.status(500).json({ error: 'Error adding event', details: err.message });
  }
});

app.put(
  "/events/:id/toggle-active",
  authMiddleware,
  roleMiddleware(["teacher", "school_admin", "main_admin"]),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      let query = { _id: req.params.id };
      if (req.user.role === "teacher") {
        query.teacher_id = req.user.userId;
        query.school_id = req.user.school_id;
      } else if (req.user.role === "school_admin") {
        query.school_id = req.user.school_id;
      }
      const event = await Event.findOneAndUpdate(query, { is_active: req.body.is_active }, { new: true });
      if (!event) return res.status(404).json({ error: "Event not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("Error toggling event:", err.message, err.stack);
      res.status(500).json({ error: "Error toggling event", details: err.message });
    }
  },
);

app.put("/events/:id", authMiddleware, roleMiddleware(["teacher", "school_admin", "main_admin"]), async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === "teacher") {
      query.teacher_id = req.user.userId;
      query.school_id = req.user.school_id;
    } else if (req.user.role === "school_admin") {
      query.school_id = req.user.school_id;
    }
    if (req.body.school_id) {
      const school = await School.findById(req.body.school_id);
      if (!school) return res.status(400).json({ error: "School not found" });
    }
    if (req.body.teacher_id) {
      const teacher = await User.findById(req.body.teacher_id);
      if (!teacher || teacher.role !== "teacher" || (req.body.school_id && teacher.school_id.toString() !== req.body.school_id)) {
        return res.status(400).json({ error: "Invalid teacher" });
      }
    }
    const event = await Event.findOneAndUpdate(query, req.body, { new: true });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("Error updating event:", err.message, err.stack);
    res.status(500).json({ error: "Error updating event", details: err.message });
  }
});

// Attendance routes
app.get('/attendance', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'school_admin') {
      query = { student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map(s => s._id) } };
    } else if (req.user.role === 'main_admin' && !req.query.school_id) {
      query = {};
    } else if (req.query.school_id) {
      const schoolStudents = await Student.find({ school_id: req.query.school_id }).select('_id');
      query = { student_id: { $in: schoolStudents.map(s => s._id) } };
    }
    console.log('Attendance query:', query);
    const records = await AttendanceRecord.find(query)
      .populate('student_id', 'name')
      .sort({ timestamp: -1 });
    res.json(records.map(record => ({
      ...record.toObject(),
      studentName: record.student_id ? record.student_id.name : 'Unknown Student',
      student_id: record.student_id ? record.student_id._id : null,
    })));
  } catch (err) {
    console.error('Error fetching attendance:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching attendance', details: err.message });
  }
});

// Новый роут для событий конкретной школы
app.get('/api/events/school/:schoolId', authMiddleware, async (req, res) => {
  try {
    const { schoolId } = req.params;
    let query = { school_id: schoolId };
    if (req.user.role === 'school_admin' && req.user.school_id !== schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const events = await Event.find(query).sort({ date: -1 });
    console.log(`Fetched events for school ${schoolId}:`, events);
    res.json(events);
  } catch (err) {
    console.error('Error fetching events by school:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching events by school', details: err.message });
  }
});

app.get('/attendance/event/:eventName', authMiddleware, async (req, res) => {
  try {
    let query = { event_name: req.params.eventName };
    if (req.user.role === 'school_admin' || req.user.role === 'teacher') {
      const schoolStudents = await Student.find({ school_id: req.user.school_id }).select('_id');
      query.student_id = { $in: schoolStudents.map(s => s._id) };
    } else if (req.query.school_id) {
      const schoolStudents = await Student.find({ school_id: req.query.school_id }).select('_id');
      query.student_id = { $in: schoolStudents.map(s => s._id) };
    }
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
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'parent') {
      const user = await User.findById(req.user.userId);
      if (!user.children.map(c => c.toString()).includes(studentId)) return res.status(403).json({ error: 'Not your child' });
    } else if (req.user.role === 'student') {
      if (student.user_id.toString() !== req.user.userId) return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role === 'school_admin') {
      if (student.school_id.toString() !== req.user.school_id) return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role === 'teacher') {
      return res.status(403).json({ error: 'Access denied for teacher' });
    }

    const records = await AttendanceRecord.find({ student_id: studentId })
      .populate('student_id', 'name')
      .sort({ timestamp: -1 });
    res.json(records.map(record => ({
      ...record.toObject(),
      studentName: record.student_id ? record.student_id.name : 'Unknown Student',
    })));
  } catch (err) {
    console.error('Error fetching attendance by student:', err.message, err.stack);
    res.status(500).json({ error: 'Error fetching attendance by student', details: err.message });
  }
});

app.post("/attendance", authMiddleware, roleMiddleware(["teacher", "school_admin", "main_admin"]), async (req, res) => {
  try {
    const { student_id, event_name, timestamp, scanned_by, studentName } = req.body;

    if (!student_id || !event_name) {
      return res.status(400).json({ error: "Missing required fields: student_id and event_name" });
    }
    if (!mongoose.isValidObjectId(student_id)) {
      return res.status(400).json({ error: "Invalid student_id" });
    }

    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(400).json({ error: "Student not found" });
    }

    const event = await Event.findOne({ name: event_name });
    if (!event) {
      return res.status(400).json({ error: "Event not found" });
    }
    if (!event.is_active) {
      return res.status(400).json({ error: "Event is not active" });
    }

    if (req.user.role === "teacher" && event.teacher_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (req.user.role === "school_admin" && event.school_id.toString() !== req.user.school_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (student.school_id.toString() !== event.school_id.toString()) {
      return res.status(400).json({ error: "Student and event school mismatch" });
    }

    const record = new AttendanceRecord({
      student_id,
      event_name,
      timestamp: timestamp || new Date(),
      scanned_by: scanned_by || req.user.userId,
      studentName: studentName || student.name,
    });
    await record.save();

    const populated = await AttendanceRecord.findById(record._id).populate("student_id", "name");
    res.json({
      ...populated.toObject(),
      studentName: populated.student_id?.name || studentName || "Unknown",
    });
  } catch (err) {
    console.error("Error adding attendance:", err.message, err.stack);
    res.status(500).json({ error: "Error adding attendance", details: err.message });
  }
});

app.get("/attendance/check", authMiddleware, async (req, res) => {
  try {
    const { studentId, eventName } = req.query;
    console.log(`Checking attendance for studentId: ${studentId}, eventName: ${eventName}`);
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      console.log(`Invalid studentId: ${studentId}`);
      return res.status(400).json({ error: "Invalid student ID" });
    }
    if (!eventName) {
      console.log(`Invalid eventName: ${eventName}`);
      return res.status(400).json({ error: "Invalid event name" });
    }
    const query =
      req.user.role === "school_admin"
        ? {
            student_id: studentId,
            event_name: eventName,
            student_id: { $in: (await Student.find({ school_id: req.user.school_id })).map((s) => s._id) },
          }
        : { student_id: studentId, event_name: eventName };
    const exists = await AttendanceRecord.exists(query);
    console.log(`Attendance check result: ${exists}`);
    res.json(!!exists);
  } catch (err) {
    console.error("Error checking attendance:", err.message, err.stack);
    res.status(500).json({ error: "Error checking attendance", details: err.message });
  }
});

app.delete("/attendance/:id", authMiddleware, roleMiddleware(["school_admin", "main_admin"]), async (req, res) => {
  try {
    const record = await AttendanceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Attendance record not found" });
    if (req.user.role === "school_admin") {
      const student = await Student.findById(record.student_id);
      if (student.school_id.toString() !== req.user.school_id) return res.status(403).json({ error: "Access denied" });
    }
    await AttendanceRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting attendance:", err.message, err.stack);
    res.status(500).json({ error: "Error deleting attendance", details: err.message });
  }
});

// Analytics route
app.get("/api/analytics", authMiddleware, roleMiddleware(["main_admin"]), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByRole = {
      teachers: await User.countDocuments({ role: "teacher" }),
      parents: await User.countDocuments({ role: "parent" }),
      students: await User.countDocuments({ role: "student" }),
      schoolAdmins: await User.find({ role: "school_admin" })
        .populate("school_id", "name")
        .then((admins) =>
          admins.map((admin) => ({
            _id: admin._id,
            email: admin.email,
            school: admin.school_id ? admin.school_id.name : null,
          })),
        ),
      mainAdmins: await User.countDocuments({ role: "main_admin" }),
    };
    const totalSchools = await School.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAttendance = await AttendanceRecord.countDocuments();
    const attendanceBySchool = await AttendanceRecord.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "schools",
          localField: "student.school_id",
          foreignField: "_id",
          as: "school",
        },
      },
      { $unwind: "$school" },
      {
        $group: {
          _id: "$school.name",
          attendanceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          school: "$_id",
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
    console.error("Error fetching analytics:", err.message, err.stack);
    res.status(500).json({ error: "Error fetching analytics", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));