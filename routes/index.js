var express = require("express");
var router = express.Router();
const Attendance = require("../models/Attendance.js");
const Teacher = require("../models/teacher");

let studentData = {};
let teacherDataStorage = {};
const bcrypt = require("bcrypt");
const cors = require("cors");
/* GET home page. */
router.get("/", function (req, res) {
  res.send("This is express app and server is running absolutely right!!!");
});
// Submit the teacher signup form
router.post("/teacher-signup-form", async function (req, res) {
  console.log("Received request at /teacher-signup-form");
  try {
    const { firstName, lastName, username, teacherId, dob, email, password } =
      req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newTeacher = new Teacher({
      firstName,
      lastName,
      username,
      teacherId,
      dob,
      email,
      password: hashedPassword,
    });

    // Save the teacher to the database
    await newTeacher.save();

    res
      .status(201)
      .json({ message: "Teacher registered successfully!", teacherId });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Error registering teacher", error });
  }
});
//Login techer
router.post("/teacher-login-form", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  try {
    // Find the teacher by username or email
    const teacher = await Teacher.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    // Check if teacher was found
    if (!teacher) {
      return res
        .status(400)
        .json({ message: "Invalid username/email or password" });
    }

    // Compare the provided password with the stored password
    const isPasswordMatch = await bcrypt.compare(password, teacher.password);
    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ message: "Invalid username/email or password" });
    }
    const { password: _, ...userData } = teacher._doc;
    res.status(200).json({ message: "Login successful", userData });
    console.log(userData);
  } catch (error) {
    console.error("Error during login:", error);
    res
      .status(500)
      .json({ message: "Server error during login", error: error.message });
  }
});
//get all teacher data
router.get("/teacher-data", async function (req, res) {
  const teacherData = await Teacher.find();
  res.send(teacherData);
});
//attendance data from the teacher
let attendanceSessions = {};
router.post("/submit-teacher-data", async (req, res) => {
  try {
    const { classId, subject, teacherId, formattedDate } = req.body;

    teacherDataStorage = { classId, subject, teacherId, formattedDate };

    const durationInMinutes = 1;

    const endTime = new Date(Date.now() + durationInMinutes * 60000);
    console.log(endTime)
    attendanceSessions[classId] = {
      subject,
      teacherId,
      endTime,
    };

    res.status(200).json({ message: "Attendance session started", endTime });
    console.log("This is teacher Data ", teacherDataStorage);
  } catch (error) {
    res.json({ message: "Error storing teacher data" });
  }
});
router.post("/submit-student-data", async (req, res) => {
  try {
    const { name, rollNo, classId, subjectCode, formattedDate } = req.body;
    const session = attendanceSessions[classId];

    if (!session) {
      return res.status(404).json({ error: "Attendance session not found" });
    }

    if (new Date() > session.endTime) {
      return res.status(403).json({ error: "Attendance session has expired" });
    }

    console.log("Received student data:", {
      name,
      rollNo,
      classId,
      subjectCode,
      formattedDate,
    });
    console.log("Teacher data storage:", teacherDataStorage);

    // Validate required fields
    if (!name || !rollNo || !classId || !subjectCode || !formattedDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const studentData = { name, rollNo, classId, subjectCode, formattedDate };

    // Create new Attendance record
    const submitAttendance = new Attendance({
      Name: name,
      RollNo: rollNo,
      ClassId: classId,
      Subject: subjectCode,
      TeacherId: teacherDataStorage.teacherId,
      Date: teacherDataStorage.Date || formattedDate,
    });

    // Save attendance record to database
    await submitAttendance.save();
    console.log("Student data stored successfully:", studentData);
    res.json({ message: "Student data stored successfully" });
  } catch (error) {
    console.error("Error storing student data:", error);
    res.status(500).json({ message: "Error storing student data" });
  }
});
//get student attendance
router.get("/get-attendance", async (req, res) => {
  try {
    const { date, classId, subject } = req.query;

    if (!date || !classId || !subject) {
      return res
        .status(400)
        .json({
          message: "All fields are required: date, classId, and subject.",
        });
    }

    const studentAttendanceData = await Attendance.find({
      Date: date,
      ClassId: classId,
      Subject: subject,
    });

    if (studentAttendanceData.length > 0) {
      res.status(200).json(studentAttendanceData);
    } else {
      res.status(404).json({ message: "No attendance data found" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching attendance data" });
  }
});



module.exports = router;
