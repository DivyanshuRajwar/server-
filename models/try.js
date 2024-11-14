const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true,
    trim: true
  },
  RollNo: {
    type: String,
    required: true,
    trim: true
  }
});

const Example = mongoose.model('Example', exampleSchema);

module.exports = Example;