const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName:{
        type: String,
        require: true,
    },
    studentId:{
        type: String,
        require: true
    },
    course:{
        type: String,
        require: true
    },
    password:{
    type: String,
    require: true,
    }
});
const Student = mongoose.model('Student',studentSchema);

module.exports = Student;