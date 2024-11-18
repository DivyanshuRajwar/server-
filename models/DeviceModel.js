const mongoose = require('mongoose');

// Define the schema for the device
const DeviceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.studentId, // Keeps consistency with MongoDB's native ObjectId
    ref: 'Student', // Reference to the Student collection
    required: true,
  },
  deviceId: {
    type: String, // Unique identifier for the device (e.g., fingerprintJS ID)
    required: true,
    unique: true, // Ensures no duplicate devices
  },
});

// Export the model
module.exports = mongoose.model('Device', DeviceSchema);
