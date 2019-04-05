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

let statusPanel = ''; //Store what's in the status panel on refresh

//Store db info
let dbUsername = 'jaidelma';
let dbPassword = '1000139';
let dbName = 'jaidelma';
let isLoggedIn = true;

//Load in library
let libcal = ffi.Library('./libcal', {
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

      let isValid = libcal.icalToJSON('./uploads/' + uploadFile.name);

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
let bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Add calendar file
app.post('/addCalendar', function(req, res){

  let filename = './uploads/' + req.body.filename;
  let version = req.body.version;
  let prodID = req.body.prodID;
  let eventUID = req.body.eventUID;
  let eventSummary = req.body.eventSummary;
  let date = req.body.date;
  let time = req.body.time;
  let isUTC = req.body.isUTC;

  //Get creation date
  let today = new Date();
  let year = today.getFullYear();
  let month = (today.getMonth()+1);
  let day = today.getDate();

  //Get creation time
  let hour = today.getHours();
  let minutes = today.getMinutes();
  let seconds = today.getSeconds();

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
  let startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  //If utc, add a Z
  if(isUTC == 'true'){
    startDT += 'Z';
  }

  //Build creation date
  let creationDT = year + month + day + 'T' + hour + minutes + seconds;

  //Create calendar
  libcal.calendarForm(filename, version, prodID, eventUID, eventSummary, startDT, creationDT);

  statusPanel += ('<h6>Successfully created ' + req.body.filename + '</h6>'); //Tell user on success

});

//Add event to file
app.post('/addEvent', function(req, res){

  let filename = './uploads/' + req.body.filename;
  let eventUID = req.body.eventUID;
  let eventSummary = req.body.eventSummary;
  let date = req.body.date;
  let time = req.body.time;
  let isUTC = req.body.isUTC;

  //Get creation date
  let today = new Date();
  let year = today.getFullYear();
  let month = (today.getMonth()+1);
  let day = today.getDate();

  //Get creation time
  let hour = today.getHours();
  let minutes = today.getMinutes();
  let seconds = today.getSeconds();

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
  let startDT = date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10) + 'T' + time.slice(0, 2) + time.slice(3, 5) + time.slice(6, 8);

  //Add Z if it is UTC
  if(isUTC == 'true'){
    startDT += 'Z';
  }

  //Build creationDT
  let creationDT = year + month + day + 'T' + hour + minutes + seconds;

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

  let alarmList;
  let filename = req.query.filename;
  let eventNum = req.query.eventNum;

  alarmList = libcal.alarmListWrapper('./uploads/' + filename, eventNum);

  res.send(alarmList);
});

//Get propertyList JSON
app.get('/getPropertyList', function(req, res){

  let propList;
  let filename = req.query.filename;
  let eventNum = req.query.eventNum;

  propList = libcal.propListWrapper('./uploads/' + filename, eventNum);

  res.send(propList);
});

//Get Event List JSON
app.get('/getEventList', function(req, res){

  let eventList;
  let filename = req.query.filename;

  eventList = libcal.eventListWrapper('./uploads/' + filename);

  res.send(eventList);

});

//Get Files from server
app.get('/getFiles', function(req, res){

  let files = fs.readdirSync(__dirname + '/uploads/');
  let toSend = '[';
  let invalidFile = '{\"version\":0,\"prodID\":\"Invalid File\",\"numProps\":0,\"numEvents\":0,\"filename\":\"';
  let fileToJSON;

  //Put JSONs in toSend
  for(let i = 0; i<files.length; i++){

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

app.post('/storeFiles', function(req, res){

  //Array of files and current filename
  let files = fs.readdirSync(__dirname + '/uploads/');
  let filename;

  //All List JSONS
  let fileJSON;
  let eventListJSON;
  let propListJSON;
  let alarmListJSON;

  //All objects
  let fileObject;
  let eventObject;
  let propObject;
  let dtObject;
  let alarmObject;

  //File header/data for SQL Insert
  let fileHeader = '(file_Name, version, prod_id)';
  let fileData;

  //letiables for event data for SQL insert
  let eventData;
  let startTime;
  let location;
  let organizer;

  let alarmData;

  let count = 0; //See which file we are one (in case of invalid files)
  let totalEvents = 0;

  //Connect to database
  const connection = mysql.createConnection({
    host : 'dursley.socs.uoguelph.ca',
    user : dbUsername,
    password : dbPassword,
    database : dbName
  });

  //Check for empty table
  if(files.length == 0){
    statusPanel += '<h6>No Files To Store</h6>';
  }

  connection.connect(function(err){

    //Empty database to ensure no duplicates
    let sql = "DELETE FROM FILE;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for file
    sql = "ALTER TABLE FILE AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for event
    sql = "ALTER TABLE EVENT AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for alarm
    sql = "ALTER TABLE ALARM AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Loop through all files
    for(let i = 0; i<files.length; i++){

      //Get JSON of file
      fileJSON = libcal.icalToJSON('./uploads/' + files[i]);

      //If valid file
      if(fileJSON != ""){

        fileObject = JSON.parse(fileJSON);

        //Set up data
        fileData = "(\'" + files[i] + '\',\'' + fileObject.version + '\',\'' + fileObject.prodID + '\');';

        filename = files[i];

        //Connect and add to file database
        sql = "INSERT INTO FILE " + fileHeader + " VALUES " + fileData;

        (function(filename, count){

          connection.query(sql, [filename, count], function (err, result){

            if(err){}
            else{
              let eventHeader = '(summary, start_time, location, organizer, cal_file)';

              //Add events
              eventListJSON = libcal.eventListWrapper('./uploads/' + filename);
              eventObject = JSON.parse(eventListJSON);

              for(let j = 0; j < eventObject.length; j++){

                propListJSON = libcal.propListWrapper('./uploads/' + filename, j+1);
                propObject = JSON.parse(propListJSON);

                location = null;
                organizer = null;
                for(let k = 0; k < propObject.length; k++){
                  if(propObject[k].propName === 'LOCATION' || propObject[k].propName === 'location') location = propObject[k].propDescr;
                  if(propObject[k].propName === 'ORGANIZER' || propObject[k].propName === 'organizer') organizer = propObject[k].propDescr;
                }

                dtObject = eventObject[j].startDT;
                if(!eventObject[j].summary){
                  eventObject[j].summary = null;
                }

                let date = dtObject.date;
                let time = dtObject.time;

                startTime = date.slice(0, 4) + '-' + date.slice(4,6) + '-' + date.slice(6,8) + ' ' + time.slice(0,2) + ':' + time.slice(2,4) + ':' + time.slice(4,6);

                if(location) eventData = "(\'" + eventObject[j].summary + '\',\'' + startTime + '\',\'' + location + '\',\'' + organizer + '\',\'' + (count+1) + '\');';
                else eventData = "(\'" + eventObject[j].summary + '\',\'' + startTime + '\',' + location + ',\'' + organizer + '\',\'' + (count+1) + '\');';

                sql = "INSERT INTO EVENT " + eventHeader + " VALUES " + eventData;

                (function(filename, totalEvents){
                  connection.query(sql, function(err, result){

                    if(err){}
                    else{

                      let alarmHeader = "(action, `trigger`, event)";
                      alarmListJSON = libcal.alarmListWrapper('./uploads/' + filename, j+1);
                      alarmObject = JSON.parse(alarmListJSON);

                      for(let f = 0; f<alarmObject.length; f++){
                        alarmData = "(\'" + alarmObject[f].action + '\',\'' + alarmObject[f].trigger + '\',\'' + (totalEvents+1) + '\');';
                        sql = "INSERT INTO ALARM " + alarmHeader + " VALUES " + alarmData;

                        (function(){
                          connection.query(sql, function(err, result){
                            if(err){console.log(err);}
                          });
                        })();
                      }
                    }
                  });
                })(filename, totalEvents);
                totalEvents++; //Increment total events
              }
            }
          });
        })(filename, count);
        count++; //Increment count
      }
    }

    if(isLoggedIn && files.length != 0) statusPanel += '<h6>Uploaded files to database</h6>';
    else if(!isLoggedIn) statusPanel += '<h6>Error uploading files, you are not logged in!</h6>';

  });
  res.redirect('/');
});

//Remove files from db request
app.post('/removeFiles', function(req, res){

  const connection = mysql.createConnection({
    host : 'dursley.socs.uoguelph.ca',
    user : dbUsername,
    password : dbPassword,
    database : dbName
  });

  if(!isLoggedIn){
    statusPanel += "<h6>You are not logged in!</h6>";
  }
  else if(req.body.confirmed){
    //Empty database to ensure no duplicates
    let sql = "DELETE FROM FILE;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for file
    sql = "ALTER TABLE FILE AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for event
    sql = "ALTER TABLE EVENT AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    //Reset auto-increment for alarm
    sql = "ALTER TABLE ALARM AUTO_INCREMENT = 1;";
    connection.query(sql, function(err, result){
      if(err){};
    });

    statusPanel += "<h6>Removed all files from Database</h6>";
  }


});

//Get Files from database
app.get('/getDbFiles', function(req, res){

  const connection = mysql.createConnection({
    host : 'dursley.socs.uoguelph.ca',
    user : dbUsername,
    password : dbPassword,
    database : dbName
  });

  if(!isLoggedIn){
    res.send('[]');
  }
  else{

    connection.connect(function(err){

      let sql = 'SELECT * FROM FILE;';
      connection.query(sql, function(err, result){

        if(err){res.send('[]');}
        else{
          res.send(result);
        }
      });
    });

  }

});

//Database status request
app.get('/dbStatus', function(req, res){

  let toReturn = '';
  //If not logged in
  if(!isLoggedIn){
    statusPanel += '<h6>You are not logged in!</h6>';
  }
  else{

    const connection = mysql.createConnection({
      host : 'dursley.socs.uoguelph.ca',
      user : dbUsername,
      password : dbPassword,
      database : dbName
    });

    connection.connect(function(err){

      let sql = "SELECT * FROM FILE";
      connection.query(sql, function(err, rows){
        if(err){}
        else{

          toReturn += '<h6>Database has ' + rows.length + ' files, ';

          sql = "SELECT * FROM EVENT";
          connection.query(sql, function(err, rows){
            if(err){}
            else{

              toReturn += rows.length + ' events, and ';

              sql = "SELECT * FROM ALARM";
              connection.query(sql, function(err, rows){
                if(err){}
                else{
                  toReturn += rows.length + ' alarms</h6>';

                  statusPanel += toReturn;
                  res.redirect('/');
                }
              });
            }
          });
        }
      });
    });
  }

});

//Get events ajax call
app.get('/getEventsStartTime', function(req, res){

  let toReturn;
  if(!isLoggedIn) statusPanel += '<h6>You are not logged in!</h6>';
  else{

    const connection = mysql.createConnection({
      host : 'dursley.socs.uoguelph.ca',
      user : dbUsername,
      password : dbPassword,
      database : dbName
    });

    //Connect to database
    connection.connect(function(err) {

      let sql = "SELECT * FROM EVENT ORDER BY start_time;";
      connection.query(sql, function(err, result){
        if(err){}
        else{
          res.json(result);
        }
      });
    });
  }
});

//Get conflicting events
app.get('/getConflicting', function(req, res){

  let toReturn;
  if(!isLoggedIn) statusPanel += '<h6>You are not logged in!</h6>';
  else{

    const connection = mysql.createConnection({
      host : 'dursley.socs.uoguelph.ca',
      user : dbUsername,
      password : dbPassword,
      database : dbName
    });

    //Connect to database
    connection.connect(function(err) {

      let sql = "SELECT * FROM EVENT e1 WHERE EXISTS(SELECT 1 FROM EVENT e2 WHERE e1.start_time = e2.start_time AND e1.event_id <> e2.event_id);";
      connection.query(sql, function(err, result){
        if(err){console.log(err);}
        else{
          res.json(result);
        }
      });
    });
  }
});

//Get events with same location
app.get('/getEventsSameLocation', function(req, res){

  let toReturn;
  if(!isLoggedIn) statusPanel += '<h6>You are not logged in!</h6>';
  else{

    const connection = mysql.createConnection({
      host : 'dursley.socs.uoguelph.ca',
      user : dbUsername,
      password : dbPassword,
      database : dbName
    });

    //Connect to database
    connection.connect(function(err) {

        let sql = "SELECT * FROM EVENT e1 WHERE EXISTS(SELECT * FROM EVENT e2 WHERE e1.location IS NOT NULL AND e1.location = e2.location AND e1.event_id <> e2.event_id);";
      connection.query(sql, function(err, result){
        if(err){console.log(err);}
        else{
          res.json(result);
        }
      });
    });
  }
});

app.get('/getAllEvents', function(req, res){

    let filename = req.query.filename;

    if(!isLoggedIn){
      statusPanel += 'You are not logged in!';
    }
    else{

      const connection = mysql.createConnection({
        host : 'dursley.socs.uoguelph.ca',
        user : dbUsername,
        password : dbPassword,
        database : dbName
      });

      //Connect to database
      connection.connect(function(err) {

        let sql = "SELECT * FROM EVENT e WHERE EXISTS(SELECT * FROM FILE f WHERE e.cal_file = f.cal_id AND f.file_Name = \'" + filename + "\');";
        connection.query(sql, function(err, result){
          if(err){console.log(err);}
          else{
            res.json(result);
          }
        });
      });
    }
});

app.get('/getAllAlarms', function(req, res){

    let filename = req.query.filename;

    if(!isLoggedIn){
      statusPanel += 'You are not logged in!';
    }
    else{

      const connection = mysql.createConnection({
        host : 'dursley.socs.uoguelph.ca',
        user : dbUsername,
        password : dbPassword,
        database : dbName
      });

      //Connect to database
      connection.connect(function(err) {

        let sql = "SELECT * FROM ALARM a WHERE EXISTS(SELECT * FROM EVENT e WHERE EXISTS(SELECT * FROM FILE f WHERE e.cal_file = f.cal_id AND a.event = e.event_id AND f.file_Name = \'" + filename + "\'));";
        connection.query(sql, function(err, result){
          if(err){console.log(err);}
          else{
            res.json(result);
          }
        });
      });
    }
});

app.get('/betweenDates', function(req, res){

  if(!isLoggedIn){
    statusPanel += 'You are not logged in!';
  }
  else{

    const connection = mysql.createConnection({
      host : 'dursley.socs.uoguelph.ca',
      user : dbUsername,
      password : dbPassword,
      database : dbName
    });

    //Connect to database
    connection.connect(function(err) {

      let sql = "SELECT * FROM EVENT WHERE DATE(start_time) BETWEEN \'" + req.query.startDate + "\' AND \'" + req.query.endDate + "\';";
      connection.query(sql, function(err, result){
        if(err){console.log(err);}
        else{
          res.json(result);
        }
      });
    });
  }

});

//Login post request
app.post('/login', function(req, res){

  //Set Globals
  dbUsername = req.body.username;
  dbPassword = req.body.password;
  dbName = req.body.dbName;

  const connection = mysql.createConnection({
    host : 'dursley.socs.uoguelph.ca',
    user : dbUsername,
    password : dbPassword,
    database : dbName
  });

  //Connect to database
  connection.connect(function(err) {
    let sql = "CREATE TABLE IF NOT EXISTS FILE(cal_id INT AUTO_INCREMENT PRIMARY KEY, file_Name letCHAR(60) NOT NULL, version INT NOT NULL, prod_id letCHAR(256) NOT NULL)";
    connection.query(sql, function (err, result) {
      if (err){
        statusPanel += '<h6>Failed to log in</h6>';
      }
      else{
        statusPanel += '<h6>Connected to database!</h6>';
        isLoggedIn = true;
      }

    });
    sql = "CREATE TABLE IF NOT EXISTS EVENT(event_id INT AUTO_INCREMENT PRIMARY KEY, summary letCHAR(1024), start_time DATETIME NOT NULL, location letCHAR(60), organizer letCHAR(256), cal_file INT NOT NULL, FOREIGN KEY(cal_file) REFERENCES FILE(cal_id) ON DELETE CASCADE)";
    connection.query(sql, function (err, result) {
      if (err){

      }
    });
    sql = "CREATE TABLE IF NOT EXISTS ALARM(alarm_id INT AUTO_INCREMENT PRIMARY KEY, action letCHAR(256) NOT NULL, `trigger` letCHAR(256) NOT NULL, event INT NOT NULL, FOREIGN KEY(event) REFERENCES EVENT(event_id) ON DELETE CASCADE)";
    connection.query(sql, function (err, result) {
      if (err){

      }
    });
    connection.end();
  });

});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);
