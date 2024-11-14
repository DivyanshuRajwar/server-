const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true,
  },
  RollNo: {
    type: String,
    required: true,
  },
  ClassId: {
    type: String,
    required: true,
  },
  Subject: {
    type: String,
    required: true,
  },
  TeacherId: {
    type: String,
    required: true,
  },
  Date: {
    type: String,
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
