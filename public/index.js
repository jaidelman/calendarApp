
// Put all onload AJAX calls here, and event listeners
$(document).ready(function() {

  //Fill File Log Panel
  $.ajax({
    type: 'get',
    dataType: 'json', //Returns a JSON
    url: '/getFiles', //Get files from server
    success: function (data) {

      //If files exist
      if(data.length > 0){

        //Loop through and put all files in table
        for(i = 0; i < data.length; i++){

          //If invalid file
          if(data[i].prodID != "Invalid File"){
            $('#fileLog').append('<tr><td><a href=\"/uploads/' + data[i].filename + '\">' + data[i].filename + '</a></td><td>' + data[i].version + '</td><td>' + data[i].prodID + '</td><td>' + data[i].numEvents + '</td><td>' + data[i].numProps + '</td></tr>');
          }
        }
      }
      //Else state no files
      else{
        $('#fileLog').html('<tr><td>No files</td><td></td><td></td><td></td><td></td></tr>');
      }

    },
    fail: function(error) {
      // Non-200 return, do something with error
      console.log(error);
    }

  });

  //Fill Calendar View and Add EventDropdown Menu
  $.ajax({
    type: 'get',
    dataType: 'json', //Returns a JSON
    url: '/getFiles', //Get files from server
    success: function (data) {

      $('#selectDropdown').html('<option>Select a calendar...</option>');
      $('#eventDropdown').html('<option>Select a calendar...</option>');

      //If files exist, populate table
      if(data.length > 0){

        //Loop through and put all files in table
        for(i = 0; i < data.length; i++){

          //If not invalid, add to table
          if(data[i].prodID != "Invalid File"){
            $('#selectDropdown').append('<option>' + data[i].filename + '</option>');
            $('#eventDropdown').append('<option>' + data[i].filename + '</option>');
          }

        }
      }

    },
    fail: function(error) {
      // Non-200 return, do something with error
      console.log(error);
    }

  });



  //Get status panel info
  getStatusPanel();

  //When clear button is clicked, clear status panel
  $('#clear').on('click', function(e){
    e.preventDefault();
    addToStatusPanel(""); //Clear status panel
    $('h6').remove(); //All text added to status panel will be of type <h6>
  });

  //Store files event listener
  $('#storeFiles').on('click', function(e){

    $.ajax({
      type: 'post',
      url: '/storeFiles',
      success: function(data){

      }
    });

  });

  //Remove files event listener
  $('#removeFiles').on('click', function(e){

    var confirmed = confirm("Are you sure you would like to remove all files from your database? This cannot be undone.");

    $.ajax({
      type: 'post',
      url: '/removeFiles',
      data: {confirmed : confirmed},
      success: function(data){

      }
    });

  });

  //Event listener for database status
  $('#dbStatus').on('click', function(e){

    $.ajax({
      type: 'get',
      url: '/dbStatus',
      async: false,
      success: function(data){

      }
    });

  });

  //Event listener for sort by start DT
  $('#startDtEvents').on('click', function(){

    $.ajax({
      type: 'get',
      url: '/getEventsStartTime',
      success: function(data){

        $('#dbHeader').html('');
        $('#dbbody').html('');
        var date; //Stores date to print

        //If data exists
        if(data.length != 0){

          $('#dbHeader').html('<th>Event ID</th><th>Summary</th><th>Start Time</th><th>Location</th><th>Organizer</th><th>Calendar File</th>');

          for(var i = 0; i<data.length; i++){

            if(data[i].summary == null) data[i].summary = '';
            if(data[i].location == null) data[i].location = '';
            if(data[i].organizer == null) data[i].organizer = '';

            date = data[i].start_time.slice(0,10) + ' ' + data[i].start_time.slice(11, 19);
            $('#dbbody').append('<tr><td>' + data[i].event_id + '</td><td>' + data[i].summary + '</td><td>' + date + '</td><td>' + data[i].location + '</td><td>' + data[i].organizer + '</td><td>' + data[i].cal_file + '</td></tr>');
          }
        }
        //If not
        else{
          alert('No Events Exist in Database');
        }

      }
    });

  });

  //Event listener for show all events with same location
  $('#sameLocation').on('click', function(){

    $.ajax({
      type: 'get',
      url: '/getEventsSameLocation',
      async: false,
      success: function(data){

        $('#dbHeader').html('');
        $('#dbbody').html('');
        var date; //Stores date to print

        //If data exists
        if(data.length != 0){

          $('#dbHeader').html('<th>Event ID</th><th>Summary</th><th>Start Time</th><th>Location</th><th>Organizer</th><th>Calendar File</th>');

          for(var i = 0; i<data.length; i++){

            if(data[i].summary == null) data[i].summary = '';
            if(data[i].location == null) data[i].location = '';
            if(data[i].organizer == null) data[i].organizer = '';

            date = data[i].start_time.slice(0,10) + ' ' + data[i].start_time.slice(11, 19);
            $('#dbbody').append('<tr><td>' + data[i].event_id + '</td><td>' + data[i].summary + '</td><td>' + date + '</td><td>' + data[i].location + '</td><td>' + data[i].organizer + '</td><td>' + data[i].cal_file + '</td></tr>');
          }
        }
        //If not
        else{
          alert('No events have the same location');
        }

      }
    });

  });


  //Event listener for conflicting events
  $('#conflictingEvents').on('click', function(){

    $.ajax({
      type: 'get',
      url: '/getConflicting',
      async:false,
      success: function(data){

        $('#dbHeader').html('');
        $('#dbbody').html('');
        var date; //Stores date to print

        //If data exists
        if(data.length != 0){

          $('#dbHeader').html('<th>Event ID</th><th>Summary</th><th>Start Time</th><th>Location</th><th>Organizer</th><th>Calendar File</th>');

          for(var i = 0; i<data.length; i++){

            if(data[i].summary == null) data[i].summary = '';
            if(data[i].location == null) data[i].location = '';
            if(data[i].organizer == null) data[i].organizer = '';

            date = data[i].start_time.slice(0,10) + ' ' + data[i].start_time.slice(11, 19);
            $('#dbbody').append('<tr><td>' + data[i].event_id + '</td><td>' + data[i].summary + '</td><td>' + date + '</td><td>' + data[i].location + '</td><td>' + data[i].organizer + '</td><td>' + data[i].cal_file + '</td></tr>');
          }
        }
        //If not
        else{
          alert('No events are conflicting');
        }

      }
    });

  });

  //Event Listener for All Events from Selected File
  $('#allEvents').on('click', function(){

    let selected = $('#dbDropdown').find(':selected').val(); //Get selected calendar

    $.ajax({
      type: 'get',
      url: '/getAllEvents',
      data: {filename : selected},
      success: function(data){

        $('#dbHeader').html('');
        $('#dbbody').html('');
        var date; //Stores date to print

        //If data exists
        if(data.length != 0){

          $('#dbHeader').html('<th>Event ID</th><th>Summary</th><th>Start Time</th><th>Location</th><th>Organizer</th><th>Calendar File</th>');

          for(var i = 0; i<data.length; i++){

            if(data[i].summary == null) data[i].summary = '';
            if(data[i].location == null) data[i].location = '';
            if(data[i].organizer == null) data[i].organizer = '';

            date = data[i].start_time.slice(0,10) + ' ' + data[i].start_time.slice(11, 19);
            $('#dbbody').append('<tr><td>' + data[i].event_id + '</td><td>' + data[i].summary + '</td><td>' + date + '</td><td>' + data[i].location + '</td><td>' + data[i].organizer + '</td><td>' + data[i].cal_file + '</td></tr>');
          }
        }
        //If not
        else{
          alert('This File Has No Events');
        }

      }
    });

  });

  //Event Listener for All Alarms from Selected File
  $('#allAlarms').on('click', function(){

    let selected = $('#dbDropdown').find(':selected').val(); //Get selected calendar

    $.ajax({
      type: 'get',
      url: '/getAllAlarms',
      data: {filename : selected},
      success: function(data){

        $('#dbHeader').html('');
        $('#dbbody').html('');

        //If data exists
        if(data.length != 0){

          $('#dbHeader').html('<th>Alarm ID</th><th>Action</th><th>Trigger</th><th>Event ID</th></th>');

          for(var i = 0; i<data.length; i++){

            $('#dbbody').append('<tr><td>' + data[i].alarm_id + '</td><td>' + data[i].action + '</td><td>' + data[i].trigger + '</td><td>' + data[i].event + '</td></tr>');
          }
        }
        //If not
        else{
          alert('This File Has No Alarms');
        }

      }
    });

  });

  $('#betweenForm').on('click', function(){

    var startDate = $('#dbStartDate').val();
    var endDate = $('#dbEndDate').val();

    if(startDate.length < 10){
      addToStatusPanel('<h6>Error: Invalid Start Date</h6>');
    }
    else if(endDate.length < 10){
      addToStatusPanel('<h6>Error: Invalid End Date</h6>');
    }
    else{

      $.ajax({

        type: 'get',
        data: {startDate : startDate, endDate : endDate},
        url: '/betweenDates',
        success: function(data){

          $('#dbHeader').html('');
          $('#dbbody').html('');
          var date; //Stores date to print

          //If data exists
          if(data.length != 0){

            $('#dbHeader').html('<th>Event ID</th><th>Summary</th><th>Start Time</th><th>Location</th><th>Organizer</th><th>Calendar File</th>');

            for(var i = 0; i<data.length; i++){

              date = data[i].start_time.slice(0,10) + ' ' + data[i].start_time.slice(11, 19);
              $('#dbbody').append('<tr><td>' + data[i].event_id + '</td><td>' + data[i].summary + '</td><td>' + date + '</td><td>' + data[i].location + '</td><td>' + data[i].organizer + '</td><td>' + data[i].cal_file + '</td></tr>');
            }
          }
          //If not
          else{
            alert('No events found between ' + startDate + ' and ' + endDate);
          }
        }
      });
    }

  });

  //Fill Calendar View and Add EventDropdown Menu
  $.ajax({
    type: 'get',
    dataType: 'json', //Returns a JSON
    url: '/getDbFiles', //Get files from server
    success: function (data) {

      $('#dbDropdown').html('<option>Select a calendar...</option>');

      //If files exist, populate table
      if(data.length > 0){

        //Loop through and put all files in dropdown
        for(i = 0; i < data.length; i++){

          //If not invalid, add to dropdown
          if(data[i].prodID != "Invalid File"){
            $('#dbDropdown').append('<option>' + data[i].file_Name + '</option>');
          }

        }
      }

    },
    fail: function(error) {
      // Non-200 return, do something with error
      console.log(error);
    }

  });

  //Dropdown Menu listener
  $('#selectDropdown').on("change", function(){

    var selectedValue = $(this).find(':selected').val(); //Get selected calendar

    //Get request for info of selected calendar
    $.ajax({
      type: 'get',
      dataType: 'json', //Returns a JSON
      url: '/getEventList', //Get files from server
      data: {filename : selectedValue},
      success:function(data){

        //If not empty array
        if(data != '[]'){

          //Clear table
          $('#calViewTable').html('');
          //Show all Events
          for(i = 0; i<data.length; i++){

            //Set date and time
            var dateTime = data[i].startDT;
            var date = dateTime.date;
            var time = dateTime.time;
            var isUTC = dateTime.isUTC;

            //Get cleaner output
            date = date.slice(0, 4) + '/' + date.slice(4, 6) + '/' + date.slice(6, 8);
            time = time.slice(0, 2) + ':' + time.slice(2, 4) + ':' + time.slice(4, 6);

            //Check for UTC
            if(isUTC){
              time += '(UTC)';
            }
            //Add row to table
            $('#calViewTable').append('<tr><td>' + (i+1) + '</td><td>' + date + '</td><td>' + time + '</td><td>' + data[i].summary + '</td><td onclick=\"sendProperties(\'' + selectedValue + '\',' + (i+1) + ');\"><a href=\"#\">' + data[i].numProps + '</a></td><td onclick=\"sendAlarm(\'' + selectedValue + '\', ' + (i+1) + ');\"><a href=\"#\">' + data[i].numAlarms + '</a></td></tr>');
          }
        }
      },
      fail: function(data){
        console.log(error);
      }
    });

  });

  //Event listener for create calendar
  $('#createCalForm').submit(function(e){
    e.preventDefault();
    var filename = $('#filenameBox').val();
    var version = $('#versionBox').val();
    var prodID = $('#productIDBox').val();
    var eventUID = $('#uidBox').val();
    var eventSummary = $('#summaryBox').val();
    var date = $('#dateForm').val();
    var time = $('#timeForm').val();
    var isUTC;

    //Get UTC
    if(document.getElementById('utcForm').checked){
      isUTC = true;
    }
    else{
      isUTC = false;
    }

    //Check for prodID
    if(prodID == ""){
      addToStatusPanel('<h6>Error creating calendar: Empty Product ID</h6>');
      return;
    }

    //Check for Event UID
    if(eventUID == ""){
      addToStatusPanel('<h6>Error creating calendar: Empty Event UID</h6>');
      return;
    }
    //Check for valid version
    if(isNaN(parseFloat(version))){
      addToStatusPanel('<h6>Error creating calendar: Invalid Version</h6>');
      return;
    }

    //Check for valid filename
    var ext = filename.split(".").pop();
    if(ext != "ics"){
      addToStatusPanel('<h6>Error creating calendar: File must end in .ics</h6>');
      return;
    }

    //Check for valid date and time
    if(date.length < 10){
      addToStatusPanel('<h6>Error creating calendar: Invalid Date</h6>');
      return;
    }
    if(date.length > 10){
      addToStatusPanel('<h6>Error creating calendar: Year past 9999');
      return;
    }
    if(time.length < 8){
      addToStatusPanel('<h6>Error creating calendar: Invalid Time, did you remember to put AM/PM?</h6>');
      return;
    }

    //Make ajax post request
    $.ajax({
      type: 'post',            //Request type
      url: '/addCalendar',   //The server endpoint we are connecting to
      data: {filename : filename, version : version, prodID : prodID, eventUID : eventUID, eventSummary : eventSummary, date : date, time : time, isUTC : isUTC},
      success: function(data){

      }
    });

  });

  //On submission of event
  $('#addEventForm').submit(function(e){
    e.preventDefault();
    var filename = $('#eventDropdown').find(':selected').val();
    var eventUID = $('#eventUidBox').val();
    var summary = $('#eventSummaryBox').val();
    var date = $('#eventDateForm').val();
    var time = $('#eventTimeForm').val();
    var isUTC;

    //Get UTC
    if(document.getElementById('eventUtc').checked){
      isUTC = true;
    }
    else{
      isUTC = false;
    }

    //Check for Event UID
    if(eventUID == ""){
      addToStatusPanel('<h6>Error adding event: Empty Event UID</h6>');
      return;
    }

    //Check for valid date and time
    if(date.length < 10){
      addToStatusPanel('<h6>Error adding event: Invalid Date</h6>');
      return;
    }
    if(date.length > 10){
      addToStatusPanel('<h6>Error creating calendar: Year past 9999');
      return;
    }
    if(time.length < 8){
      addToStatusPanel('<h6>Error adding event: Invalid Time, did you remember to put AM/PM?</h6>');
      return;
    }

    //Check file
    if(filename == 'Select a calendar...'){
      addToStatusPanel('<h6>Error adding event: File not selected</h6>');
      return;
    }

    //Make ajax post request
    $.ajax({
      type: 'post',            //Request type
      url: '/addEvent',   //The server endpoint we are connecting to
      data: {filename : filename, eventUID : eventUID, eventSummary : summary, date : date, time : time, isUTC : isUTC},
      success: function(data){

      }

    });


  });

  //Event listener for login
  $('#loginForm').submit(function(e){

    var username = $('#loginUsername').val();
    var password = $('#loginPassword').val();
    var dbName = $('#loginDbName').val();

    //Make ajax post request
    $.ajax({

      type: 'post',            //Request type
      url: '/login',   //The server endpoint we are connecting to
      data: {username : username, password : password, dbName : dbName},
      success: function(data){

      }

    });
  });

});

//Sends alarms to status panel
function sendAlarm(filename, eventNum){

  $.ajax({
    type: 'get',
    dataType: 'json', //Returns a JSON
    url: '/getAlarmList', //Get files from server
    data: {filename : filename, eventNum : eventNum},
    success:function(data){

      //On success, write alarms to status panel
      if(data.length > 0){
        addToStatusPanel('<h6>Alarms in event number ' + eventNum + ' in ' + filename + ':</h6>' + printAlarms(data) );
      }
      else{
        addToStatusPanel('<h6>Event number ' + eventNum + ' in ' + filename + ' has no alarms</h6>');
      }
    },
    fail: function(data){
      console.log(error);
    }
  });

}

//Sends properties to status panel
function sendProperties(filename, eventNum){

  $.ajax({
    type: 'get',
    dataType: 'json',
    url: '/getPropertyList',
    data: {filename : filename, eventNum : eventNum},
    success:function(data){

      //On success, write properties to status panel
      if(data.length > 0){
        addToStatusPanel('<h6>Optional properties in event number ' + eventNum + ' in ' + filename + ':</h6>' + printProperties(data));
      }
      else{
        addToStatusPanel('<h6>Event number ' + eventNum + ' in ' + filename + ' has no optional properties</h6>');
      }
    }

  });
}

//Prints all alarms from array of JSONs
function printAlarms(data){

  var alarmJSON;
  var toReturn = '';

  //For all alarms add to string
  for(i = 0; i<data.length; i++){
    alarmJSON = data[i];
    toReturn += ('<h6>&#8195&#8195&#8195Alarm ' + (i+1) + ': Action: ' + alarmJSON.action + ', Trigger: ' + alarmJSON.trigger + ', numProps: ' + alarmJSON.numProps + '<br></h6>');
  }

  return toReturn;

}

//Prints properties from array of JSONs
function printProperties(data){

  var propJSON;
  var toReturn = '';

  //For all properties add to string
  for(i = 0; i<data.length; i++){
    propJSON = data[i];
    toReturn += ('<h6>&#8195&#8195&#8195Property Name: ' + propJSON.propName + ', Property Description: ' + propJSON.propDescr + '<br></h6>');
  }

  return toReturn;
}

//Adds toAdd to status panel
function addToStatusPanel(toAdd){

  //Send data to the server
  $.ajax({
    type: 'post',
    data: {toAdd : toAdd},
    url: '/statusPanel',
    success:function(data){

    }
  });

  getStatusPanel(); //Get the new status panel to make sure it appears
}

//Get status panel and append it
function getStatusPanel(){

  //Get status panel from server
  $.ajax({
    type:'get',
    dataType:'text',
    url:'/getStatusPanel',
    success:function(data){

      //Clear, then append
      $('#statusPanel').html('');
      $('#statusPanel').append(data);

    }
  });

}
