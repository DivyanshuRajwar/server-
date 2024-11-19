var express = require("express");
var router = express.Router();
const Attendance = require("../models/Attendance.js");
const Teacher = require("../models/teacher");
const Student = require("../models/Student.js")
const DeviceModel = require("../models/DeviceModel.js")
let studentData = {};
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
let teacherDataStorage = {};
router.post("/submit-teacher-data", async (req, res) => {
  try {
    const { classId, subjectCode, teacherId, formattedDate } = req.body;

    // Store teacher data in global storage for reference in student route
    teacherDataStorage = { classId, subjectCode, teacherId, formattedDate };

    const durationInMinutes = 4;//set in min
    const endTime = new Date(Date.now() + durationInMinutes * 60000);

    // Store attendance session details for the class ID
    attendanceSessions[classId] = {
      subjectCode,
      teacherId,
      endTime,
    };

    console.log("Attendance session started:", { classId, endTime });
    res.status(200).json({ message: "Attendance session started", endTime });
  } catch (error) {
    console.error("Error storing teacher data:", error);
    res.status(500).json({ message: "Error storing teacher data" });
  }
});
router.post("/submit-student-data", async (req, res) => {
  try {
    const { name, rollNo, classId, subjectCode, formattedDate,studentId } = req.body;

    const session = attendanceSessions[classId];

    // Check if the session exists
    if (!session) {
      return res.status(404).json({ error: "Attendance session not found" });
    }

    // Check if the session has expired
    if (new Date() > session.endTime) {
      delete attendanceSessions[classId]; 
      return res.status(403).json({ error: "Attendance session has expired" });
    }

    console.log("Received student data:", {
      name,
      rollNo,
      classId,
      subjectCode,
      formattedDate,
    });
    
    if (!name || !rollNo || !classId || !subjectCode || !formattedDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const existingAttendance = await Attendance.findOne({
      TeacherId: teacherDataStorage.teacherId,
      ClassId: classId,
      subjectCode: subjectCode,
      RollNo: rollNo,
      Date: formattedDate,
    });

    if (existingAttendance) {
      return res.status(409).json({ message: "Attendance already submitted" });
    }
    // const studentData = { name, rollNo, classId, subjectCode, formattedDate };

    const submitAttendance = new Attendance({
      fullName: name,
      RollNo: rollNo,
      studentId:studentId,
      ClassId: classId,
      subjectCode: subjectCode,
      TeacherId: teacherDataStorage.teacherId,
      Date: formattedDate,
    });

    await submitAttendance.save();
    console.log("Student data stored successfully:", studentData);
    res.status(200).json({ message: "Student data stored successfully" });
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
      subjectCode: subject,
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
//get one student all attendance
router.get("/get-today-attendance", async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "StudentId is required." });
    }

    const studentAttendanceData = await Attendance.find({ studentId });

    if (studentAttendanceData.length > 0) {
      res.status(200).json(studentAttendanceData);
    } else {
      res.status(404).json({ message: "No attendance data found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching attendance data." });
  }
});

//Student (student-registration)
router.post('/student-registration',async (req,res)=>{
  try{
    const {studentId,
    name,
    course,
    password} = req.body
    console.log(name,course,password,studentId)
    const hashedPassword = await bcrypt.hash(password,10);
    const userData = new Student({
      fullName:name,
      studentId:studentId,
      course:course,
      password:hashedPassword
    })
    await userData.save();
    res
    .status(200)
    .json({ message: "Student registered successfully!", userData });
  }
  catch(error){
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Error registering teacher", error });
  }
})
//student (Login )
router.post('/student-login',async (req,res)=>{
  const {studentId,password} = req.body;
  try{
    const student = await Student.findOne({
      studentId:studentId
    });
    if(!student){
      return res
        .status(400)
        .json({ message: "Invalid studentId or password" });
    }
    const isPasswordMatch = await bcrypt.compare(password,student.password);
    if(!isPasswordMatch){
      return res
        .status(400)
        .json({ message: "Invalid studentId or password" });
    }
    const { password: _, ...userData } = student._doc;
    res.status(200).json({ message: "Login successful", userData });
    console.log(userData);
  }catch(error){

  }

})

//device data save
router.post('/save-device', async (req, res) => {
  const { studentId, deviceId } = req.body;

  try {
    // Check if the device is already registered
    const existingDevice = await DeviceModel.findOne({ deviceId });

    if (existingDevice) {
      // Compare ObjectId using `toString()` or `equals`
      if (existingDevice.studentId.toString() !== studentId) {
        return res.status(400).json({ message: 'This device is linked to another student.' });
      }
      return res.status(200).json({ message: 'Device already registered for this student.' });
    }

    // Save new device
    const newDevice = new DeviceModel({
      studentId,
      deviceId,
    });
    await newDevice.save();

    res.status(200).json({ message: 'Device registered successfully.' });
  } catch (error) {
    console.error('Error saving device:', error);
    res.status(500).json({ message: 'Failed to register device. Try again later.' });
  }
});
//remove device data
router.post('/remove-device', async (req, res) => {
  const { studentId, deviceId } = req.body;

  try {
    console.log("Received payload:", req.body);

    // Attempt to find and delete the device
    const device = await DeviceModel.findOneAndDelete({ studentId, deviceId });
    console.log("Query result:", device);

    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    res.status(200).json({ message: 'Device removed successfully.' });
  } catch (error) {
    console.error("Error while removing device:", error);
    res.status(500).json({ message: 'Failed to remove device. Try again later.' });
  }
});

module.exports = router;
