const express = require('express');
const cors = require('cors');
const RateLimit = require('express-rate-limit');
var schedule = require('node-schedule');
var moment = require('moment');
// const Nexmo = require('nexmo');
const bodyParser = require('body-parser');
const uuid = require('uuid');
// var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
// var ObjectId = require('mongodb').ObjectID;
const config = require('./config');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
// var nodemailer = require("nodemailer");
// var xoauth2 = require('xoauth2');
var passport = require('passport');
const jwt = require('jsonwebtoken');

//models
const User = require('./models/user');
const UserData = require('./models/userData');

const apiLimiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

var app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Api limiter to limit requests to endpoint
app.use(apiLimiter);

 // Passport middleware
require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://" + config.mongouser + ":" + config.mongopwd + "@firstcluster-gw5fe.mongodb.net/taskmanagement?retryWrites=true&w=majority",
    { useNewUrlParser: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// app.use('/retrivetasks', passport.authenticate('jwt', {session: false}), User);

/**
function sendSMS(contactNo, text) {
  nexmo.message.sendSms(from, contactNo, text);
}
 */

app.post('/complete', (req, res) => {

  UserData.updateOne({ "email": req.body.email, "tasks.uid": req.body.uid }, { $set: { "tasks.$.completed": req.body.flag, "tasks.$.completedOn": moment() } }, { upsert: true }, (err, doc)=> {
    if (err) {
      res.send({ statusCode: 200, msg: "Operation failed !" })
    }
    res.send({ statusCode: 200, msg: "SUCCESS !" });
  });

});

app.post('/delete', (req, res) => {
  UserData.updateOne({ "email": req.body.email, "tasks.uid": req.body.uid }, { $set: { "tasks.$.deleted": req.body.flag, "tasks.$.deletedOn": moment() } }, { upsert: true }, (err, doc)=> {
    if (err) {
      res.send({ statusCode: 200, msg: "Operation failed !" })
    }
    res.send({ statusCode: 200, msg: "SUCCESS !" });
  });
});

app.post('/savetask', (req, res) => {
  let reqData = req.body;
  // If task is new 
  if (reqData.task["uid"] == undefined) {
    reqData.task["uid"] = uuid.v1();
    reqData.task["createdOn"] = moment();
    reqData.task["completed"] = false;
    reqData.task["deleted"] = false;
    reqData.task["completedOn"] = undefined;
    reqData.task["deletedOn"] = undefined;

    UserData.updateOne({ "email": reqData.email }, { $push: { tasks: reqData.task } }, { upsert: true }, (err, doc) => {
      if (err) {
        res.send({ statusCode: 200, msg: "Operation failed !" })
      }
      res.send({ statusCode: 200, msg: "SUCCESS !" });
    });

  } else { //for  edited task
    UserData.updateOne({ "email": reqData.email, "tasks.uid": reqData.task.uid }, { $set: { "tasks.$.taskTitle": reqData.task.taskTitle, "tasks.$.taskDesc": reqData.task.taskDesc, "tasks.$.dueDate": reqData.task.dueDate, "tasks.$.tags": reqData.task.tags, "tasks.$.label": reqData.task.label } }, { upsert: true }, (err, doc)=> {
      res.send({ statusCode: 200, msg: "SUCCESS !" })
    });
  }
});

app.post('/retrivetasks', (req, res) => {
  UserData.find({ "email": req.body.email }).then(userData => {
    res.send({ "statusCode": 200, "data": userData });
  }).catch(err => {
    res.send({ "statusCode": 404, "data": "Not found" });
  });

});

// Resource for signin
app.post('/signin',
  passport.authenticate('local'),
   (req, res)=> {
    const token = jwt.sign({ "email": res.req.user.email }, '4xmG4jzfCbqVbmuE');
    res.send({ "statusCode": 200, "msg": { "firstName": res.req.user.firstName, "lastName": res.req.user.lastName, "email": res.req.user.email, "token": token } });
  });

// Resource for changing password  
  app.post('/updatepwd',(req,res)=>{
    User.findOne({ email: req.body.email }).then(user => {
      if (!user) {
        res.send({statusCode:200,msg:"User doent exist"});
      }

      bcrypt.compare(req.body.oldPassowrd, user.password, (err, isMatch) => {
        // if (err) throw err;
        if (isMatch) {

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.newPassword, salt, (err, hash) => {
              User.updateOne({ "email": req.body.email }, { $set: { password: hash } }, (err, doc) => {
                if(err){
                  res.send({statusCode:200,msg:"Please try again !"});  
                }
                res.send({statusCode:200,msg:"Passwod updated !"});    
              });
            });
          });

        } else {
          res.send({statusCode:200,msg:"Passwod incorrect"});
        }
      });
    });

  });

// Resource for sign up new user 
app.post('/signup', (req, res) => {
  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      res.send({ statusCode: 400, status: "error", msg: "User already exists !" })
    } else {
      let firstName = req.body.firstName;
      let lastName = req.body.lastName;
      let email = req.body.email;
      let contactNo = req.body.contactNo;
      let password = req.body.password;
      let active = false;

      const newUser = new User({
        firstName,
        lastName,
        email,
        contactNo,
        password,
        active
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;

          newUser.password = hash;
          newUser.save()
            .then(user => {

              let email = newUser.email;
              let theme = "default";
              let smsAlert = true;
              let emailAlert = true;
              let tasks = [];
              const userData = new UserData({
                email,
                theme,
                smsAlert,
                emailAlert,
                tasks
              });
              userData.save().then(data => {

                res.send({ statusCode: 200, msg: "SUCCESS !" });

              }).catch(err => res.send({ statusCode: 400, msg: err }));

            }).catch(err => res.send({ statusCode: 400, msg: err }));
        });
      });
    }
  });
});

//Resource to verify email of user
app.get('/verify', (req, res)=> {
  console.log(req.protocol + ":/" + req.get('host'));
  if ((req.protocol + "://" + req.get('host')) == ("http://" + host)) {
    console.log("Domain is matched. Information is from Authentic email");
    if (req.query.id == rand) {
      console.log("email is verified");
      res.end("<h1>Email " + mailOptions.to + " is been Successfully verified");
    }
    else {
      console.log("email is not verified");
      res.end("<h1>Bad Request</h1>");
    }
  }
  else {
    res.end("<h1>Request is from unknown source");
  }
});


app.post('/test',(req, res)=> {
  res.send('<h1>Working !</h1>');
});

app.get('/test', (req, res)=> {
  res.send('<h1>Working !</h1>');
});


 // Job to remove archived tasks for each user
 // Job will run everyday at 02AM & will remove tasks which are archived for more than 15 days

var rule = new schedule.RecurrenceRule();
rule.hour = 2;
var trackjob = schedule.scheduleJob(rule, () => {
  User.find().then(userData => {
    for (let i = 0; i < userData.length; i++) {
      UserData.find({ email: userData[i].email }).then(data => {
        let tasksAry = data[0].tasks;
        let newTasks = [];
        for (let x = 0; x < tasksAry.length; x++) {
          if (tasksAry[x].deletedOn != undefined || tasksAry[x].deletedOn != "undefined") {
            let today = moment();
            let deletedDate = moment(tasksAry[x].deletedOn);
            if (today.diff(deletedDate, 'days') > 15) {
              //Dont consider the tasks
            } else {
              newTasks.push(tasksAry[x]);
            }
          } else {
            newTasks.push(tasksAry[x]);
          }
        }

        UserData.updateOne({ "email": userData[i].email }, { $set: { tasks: newTasks } }, (err, doc) => {
        });
      });
    }
  });
});


app.listen(3000, (res) => {
  console.log('Listning on', 3000);
});