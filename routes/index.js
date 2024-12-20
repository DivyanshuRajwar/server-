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
//start attendance
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
//end attendance
router.post('/end-attendance', async (req, res) => {
  const { classId } = req.body;
  const session = attendanceSessions[classId];
  if (session) {
    session.endTime = new Date(); 
    res.send("end of the attendance");
  } else {
    res.status(404).json({ error: "Class ID not found or session does not exist." });
  }
});

router.post("/submit-student-data", async (req, res) => {
  try {
    const { name, rollNo, classId, subjectCode, formattedDate, studentId } = req.body;

    // Fetch the session for the given class
    const session = attendanceSessions[classId];

    // Check if the session exists
    if (!session) {
      return res.status(404).json({ error: "Attendance session not found" });
    }

    // Check if the session has expired
    if (new Date() > session.endTime) {
      delete attendanceSessions[classId]; // Remove the expired session
      return res.status(403).json({ error: "Attendance session has expired" });
    }

    // Validate required fields
    if (!name || !rollNo || !classId || !subjectCode || !formattedDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate subjectCode, formattedDate, and classId match teacher data
    if (
      subjectCode !== teacherDataStorage.subjectCode ||
      formattedDate !== teacherDataStorage.formattedDate ||
      classId !== teacherDataStorage.classId
    ) {
      return res.status(406).json({
        message: "Invalid classId, subjectCode, or formattedDate. Please check your inputs."
      });
    }

    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      TeacherId: teacherDataStorage.teacherId,
      ClassId: classId,
      subjectCode: subjectCode,
      RollNo: rollNo,
      Date: formattedDate,
    });

    if (existingAttendance) {
      return res.status(409).json({ message: "Attendance already submitted for this student." });
    }
    

    // Create new attendance entry
    const submitAttendance = new Attendance({
      fullName: name,
      RollNo: rollNo,
      studentId: studentId,
      ClassId: classId,
      subjectCode: subjectCode,
      TeacherId: teacherDataStorage.teacherId,
      Date: formattedDate,
    });

    // Save the attendance data to the database
    await submitAttendance.save();

    // Respond with success
    res.status(200).json({ message: "Student attendance submitted successfully." });
    
  } catch (error) {
    console.error("Error storing student data:", error);
    res.status(500).json({ message: "An error occurred while storing student data." });
  }
});

//get student attendance(teachers)
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
//get one student all attendance(students)
router.get("/get-today-attendance", async (req, res) => {
  try {
    const { studentId } = req.query;  // Change this to req.query
    console.log("The student id is ", studentId);

    if (!studentId) {
      return res.status(400).json({ message: "StudentId is required." });
    }

    // Get today's date and format it as DDMMYYYY (e.g., 12122024)
    const date = new Date();
    const formattedDate = `${date.getDate()}${date.getMonth() + 1}${date.getFullYear()}`;

    console.log("Today's Formatted Date:", formattedDate); // Log the formatted date

    // Fetch attendance records for today only based on the formattedDate
    const studentAttendanceData = await Attendance.find({
      studentId,
      Date:formattedDate
    });

    if (studentAttendanceData.length > 0) {
      res.status(200).json(studentAttendanceData);
    } else {
      res.status(404).json({ message: "No attendance data found for today." });
    }
  } catch (error) {
    console.error("Error fetching attendance data:", error);
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




module.exports = router;
