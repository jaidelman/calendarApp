'use strict'

// C library API
const ffi = require('ffi');

// Express App (Routes)
const express = require("express");
const app     = express();
const path    = require("path");
const fileUpload = require('express-fileupload');

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

  if(uploadFile != null){
    // Use the mv() method to place the file somewhere on your server
    uploadFile.mv('uploads/' + uploadFile.name, function(err) {
      if(err) {
        return res.status(500).send(err);
      }

      var isValid = libcal.icalToJSON('./uploads/' + uploadFile.name);

      if(isValid != ""){
        statusPanel += '<h6>Successfully uploaded ' + uploadFile.name + '</h6>';
      }
      else{
        statusPanel += '<h6>' + uploadFile.name + ' is an invalid calendar</h6>';
      }
  res.redirect('/');

    });


  }
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

  var startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  if(isUTC == 'true'){
    startDT += 'Z';
  }

  var creationDT = year + month + day + 'T' + hour + minutes + seconds;

  libcal.calendarForm(filename, version, prodID, eventUID, eventSummary, startDT, creationDT);

  statusPanel += ('<h6>Successfully created ' + req.body.filename + '</h6>');

});

//Add event file
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

  var startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  if(isUTC == 'true'){
    startDT += 'Z';
  }

  var creationDT = year + month + day + 'T' + hour + minutes + seconds;

  libcal.addEventToCal(filename, eventUID, eventSummary, startDT, creationDT);

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

//Get alarmJSON
app.get('/getAlarmList', function(req, res){

  var alarmList;
  var filename = req.query.filename;
  var eventNum = req.query.eventNum;

  alarmList = libcal.alarmListWrapper('./uploads/' + filename, eventNum);

  res.send(alarmList);
});

//Get alarmJSON
app.get('/getPropertyList', function(req, res){

  var propList;
  var filename = req.query.filename;
  var eventNum = req.query.eventNum;

  propList = libcal.propListWrapper('./uploads/' + filename, eventNum);

  res.send(propList);
});

//Get Event List
app.get('/getEventList', function(req, res){

  var eventList;
  var filename = req.query.filename;

  eventList = libcal.eventListWrapper('./uploads/' + filename);

  res.send(eventList);

});

//Get Files
app.get('/getFiles', function(req, res){

  var files = fs.readdirSync(__dirname + '/uploads/');
  var toSend = '[';
  var invalidFile = '{\"version\":0,\"prodID\":\"Invalid File\",\"numProps\":0,\"numEvents\":0,\"filename\":\"';
  var fileToJSON;

  //Put JSONs in toSend
  for(var i = 0; i<files.length; i++){

    fileToJSON = libcal.icalToJSON('./uploads/' + files[i]);

    if(fileToJSON != ""){
      toSend += fileToJSON;
      toSend = toSend.slice(0, toSend.length-1) + ',\"filename\":\"' + files[i] + '\"' + toSend.slice(toSend.length -1); //Add filename to JSON
      if(i != files.length - 1) toSend += ',';
    }
    else{
      toSend += invalidFile + files[i] + '\"}';
      if(i != files.length - 1) toSend += ',';
    }

  }
  toSend += (']');

  res.send(toSend);

});

//Sample endpoint
app.get('/someendpoint', function(req , res){
  res.send({
    foo: "bar"
  });
});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);
