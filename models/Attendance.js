const mongoose = require('mongoose');

// Define the schema
const attendanceSchema = new mongoose.Schema({
  fullName: { 
    type: String,
    required: true,
  },
  RollNo: {
    type: String,
    required: true,
  },
  studentId: {
    type: String,
    required: true,
  },
  ClassId: {
    type: String,
    required: true,
  },
  subjectCode: { 
    type: String,
    required: true,
  },
  TeacherId: {
    type: String,
    required: true,
  },
  Date: {
    type: String,
    required: true,
    default: () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
    },
  },
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
