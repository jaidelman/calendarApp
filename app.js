'use strict'

// C library API
const ffi = require('ffi');

// Express App (Routes)
const express = require("express");
const app     = express();
const path    = require("path");
const fileUpload = require('express-fileupload');
const mysql = require('mysql');

app.use(fileUpload());

// Minimization
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Important, pass in port as in `npm run dev 1234`, do not change
const portNum = process.argv[2];

// Send HTML at root, do not change
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/public/index.html'));
});

// Send Style, do not change
app.get('/style.css',function(req,res){
  //Feel free to change the contents of style.css to prettify your Web app
  res.sendFile(path.join(__dirname+'/public/style.css'));
});

// Send obfuscated JS, do not change
app.get('/index.js',function(req,res){
  fs.readFile(path.join(__dirname+'/public/index.js'), 'utf8', function(err, contents) {
    const minimizedContents = JavaScriptObfuscator.obfuscate(contents, {compact: true, controlFlowFlattening: true});
    res.contentType('application/javascript');
    res.send(minimizedContents._obfuscatedCode);
  });
});

var statusPanel = ''; //Store what's in the status panel on refresh

//Load in library
var libcal = ffi.Library('./libcal', {
  'icalToJSON' : ['string', ['string']],
  'eventListWrapper' : ['string', ['string']],
  'alarmListWrapper' : ['string', ['string', 'int']],
  'propListWrapper' : ['string', ['string', 'int']],
  'calendarForm' : ['bool', ['string', 'string', 'string', 'string', 'string', 'string', 'string']],
  'addEventToCal' : ['void', ['string', 'string', 'string', 'string', 'string']],
});

//Respond to POST requests that upload files to uploads/ directory
app.post('/upload', function(req, res) {
  if(!req.files) {
    return res.status(400).send('No files were uploaded.');
  }

  let uploadFile = req.files.uploadFile;

  //Make sure file exists
  if(uploadFile != null){
    // Use the mv() method to place the file somewhere on your server
    uploadFile.mv('uploads/' + uploadFile.name, function(err) {
      if(err) {
        return res.status(500).send(err);
      }

      var isValid = libcal.icalToJSON('./uploads/' + uploadFile.name);

      //If valid, succes!
      if(isValid != ""){
        statusPanel += '<h6>Successfully uploaded ' + uploadFile.name + '</h6>';
      }
      //Else tell user it's invalid
      else{
        statusPanel += '<h6>' + uploadFile.name + ' is an invalid calendar</h6>';
      }
  res.redirect('/');

    });


  }
  //If non existant, tell user no file was selected
  else{
    statusPanel += '<h6>No file selected</h6>';
    res.redirect('/');
  }


});

//Respond to GET requests for files in the uploads/ directory
app.get('/uploads/:name', function(req , res){
  fs.stat('uploads/' + req.params.name, function(err, stat) {
    console.log(err);
    if(err == null) {
      res.sendFile(path.join(__dirname+'/uploads/' + req.params.name));
    } else {
      res.send('');
    }
  });
});

//******************** Your code goes here ********************
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Add calendar file
app.post('/addCalendar', function(req, res){

  var filename = './uploads/' + req.body.filename;
  var version = req.body.version;
  var prodID = req.body.prodID;
  var eventUID = req.body.eventUID;
  var eventSummary = req.body.eventSummary;
  var date = req.body.date;
  var time = req.body.time;
  var isUTC = req.body.isUTC;

  //Get creation date
  var today = new Date();
  var year = today.getFullYear();
  var month = (today.getMonth()+1);
  var day = today.getDate();

  //Get creation time
  var hour = today.getHours();
  var minutes = today.getMinutes();
  var seconds = today.getSeconds();

  //Add 0 in front of month
  if(month < 10){
    month = '0' + month;
  }

  //Add 0 in front of day
  if(day < 10){
    day = '0' + day;
  }

  //Add 0 in front of hours
  if(hour < 10){
    hour = '0' + hour;
  }

  //Add 0 in front of minutes
  if(minutes < 10){
    minutes = '0' + minutes;
  }

  //Add 0 in front of seconds
  if(seconds < 10){
    seconds = '0' + seconds;
  }

  //Build string
  var startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  //If utc, add a Z
  if(isUTC == 'true'){
    startDT += 'Z';
  }

  //Build creation date
  var creationDT = year + month + day + 'T' + hour + minutes + seconds;

  //Create calendar
  libcal.calendarForm(filename, version, prodID, eventUID, eventSummary, startDT, creationDT);

  statusPanel += ('<h6>Successfully created ' + req.body.filename + '</h6>'); //Tell user on success

});

//Add event to file
app.post('/addEvent', function(req, res){

  var filename = './uploads/' + req.body.filename;
  var eventUID = req.body.eventUID;
  var eventSummary = req.body.eventSummary;
  var date = req.body.date;
  var time = req.body.time;
  var isUTC = req.body.isUTC;

  //Get creation date
  var today = new Date();
  var year = today.getFullYear();
  var month = (today.getMonth()+1);
  var day = today.getDate();

  //Get creation time
  var hour = today.getHours();
  var minutes = today.getMinutes();
  var seconds = today.getSeconds();

  //Add 0 in front of month
  if(month < 10){
    month = '0' + month;
  }

  //Add 0 in front of day
  if(day < 10){
    day = '0' + day;
  }

  //Add 0 in front of hours
  if(hour < 10){
    hour = '0' + hour;
  }

  //Add 0 in front of minutes
  if(minutes < 10){
    minutes = '0' + minutes;
  }

  //Add 0 in front of seconds
  if(seconds < 10){
    seconds = '0' + seconds;
  }

  //Build start date
  var startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  //Add Z if it is UTC
  if(isUTC == 'true'){
    startDT += 'Z';
  }

  //Build creationDT
  var creationDT = year + month + day + 'T' + hour + minutes + seconds;

  //Add event to cal
  libcal.addEventToCal(filename, eventUID, eventSummary, startDT, creationDT);

  //Add to status panel
  statusPanel += ('<h6>Successfully added event ' + eventUID + ' to ' + req.body.filename + '</h6>');

});

//Get status panel string
app.get('/getStatusPanel', function(req, res){
  res.send(statusPanel);
});

//Post status panel
app.post('/statusPanel', function(req, res){
  if(req.body.toAdd == "") statusPanel = "";
  statusPanel += req.body.toAdd;
  res.redirect('/');
});

//Get alarmList JSON
app.get('/getAlarmList', function(req, res){

  var alarmList;
  var filename = req.query.filename;
  var eventNum = req.query.eventNum;

  alarmList = libcal.alarmListWrapper('./uploads/' + filename, eventNum);

  res.send(alarmList);
});

//Get propertyList JSON
app.get('/getPropertyList', function(req, res){

  var propList;
  var filename = req.query.filename;
  var eventNum = req.query.eventNum;

  propList = libcal.propListWrapper('./uploads/' + filename, eventNum);

  res.send(propList);
});

//Get Event List JSON
app.get('/getEventList', function(req, res){

  var eventList;
  var filename = req.query.filename;

  eventList = libcal.eventListWrapper('./uploads/' + filename);

  res.send(eventList);

});

//Get Files from server
app.get('/getFiles', function(req, res){

  var files = fs.readdirSync(__dirname + '/uploads/');
  var toSend = '[';
  var invalidFile = '{\"version\":0,\"prodID\":\"Invalid File\",\"numProps\":0,\"numEvents\":0,\"filename\":\"';
  var fileToJSON;

  //Put JSONs in toSend
  for(var i = 0; i<files.length; i++){

    //Get JSON of file
    fileToJSON = libcal.icalToJSON('./uploads/' + files[i]);

    //If not null, add files to JSON we're returning
    if(fileToJSON != ""){
      toSend += fileToJSON;
      toSend = toSend.slice(0, toSend.length-1) + ',\"filename\":\"' + files[i] + '\"' + toSend.slice(toSend.length -1); //Add filename to JSON
      if(i != files.length - 1) toSend += ','; //If last file, don't put a comma
    }
    //Otherwise give it the default invalid file string
    else{
      toSend += invalidFile + files[i] + '\"}';
      if(i != files.length - 1) toSend += ',';
    }

  }
  toSend += (']');

  res.send(toSend);

});

app.post('/login', function(req, res){

  const connection = mysql.createConnection({
    host : 'dursley.socs.uoguelph.ca',
    user : req.query.username,
    password : req.query.password,
    database : req.query.dbName
  });

  //Connect to database
  connection.connect(function(err) {
    console.log("Connected!");
    var sql = "CREATE TABLE IF NOT EXISTS FILE(cal_id INT AUTO_INCREMENT PRIMARY KEY, file_Name VARCHAR(60) NOT NULL, version INT NOT NULL, prod_id VARCHAR(256) NOT NULL)";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      console.log('Created FILE');
    });
    sql = "CREATE TABLE IF NOT EXISTS EVENT(Event_id INT AUTO_INCREMENT PRIMARY KEY, summary VARCHAR(1024), start_time DATETIME NOT NULL, location VARCHAR(60), organizer VARCHAR(256), cal_file INT NOT NULL, FOREIGN KEY(cal_file) REFERENCES FILE(cal_id) ON DELETE CASCADE)";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      console.log('Created EVENT');
    });
    sql = "CREATE TABLE IF NOT EXISTS ALARM(alarm_id INT AUTO_INCREMENT PRIMARY KEY, action VARCHAR(256) NOT NULL, `trigger` VARCHAR(256) NOT NULL, event INT NOT NULL, FOREIGN KEY(event) REFERENCES EVENT(event_id) ON DELETE CASCADE)";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      console.log('Created ALARM');
    });
    connection.end();
  });

});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);
