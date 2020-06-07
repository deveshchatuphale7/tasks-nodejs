const mongoose = require('mongoose');


email
:"dcdevesh3@gmail.com"
theme
:"default"
smsAlert
:true
emailAlert
:true

const UserDataSchema = new mongoose.Schema({
    email: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    required: true
  },
  smsAlert: {
    type: Boolean,
    required: true
  },
  emailAlert: {
    type: Boolean,
    required: true
  },
  tasks:{
    type : Array,
    default : []
  }
},{collection:'userdata'});

const userdata = mongoose.model('userdata', UserDataSchema);

module.exports = userdata;