const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  studentId: {
    type: String, 
    ref: 'Students',
    required: true,
  },
  deviceId: {
    type: String, 
    required: true,
    unique: true, 
  },
});

module.exports = mongoose.model('Device', DeviceSchema);
