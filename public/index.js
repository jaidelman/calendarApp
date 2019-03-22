
// Put all onload AJAX calls here, and event listeners
$(document).ready(function() {

  //CREATE CALENDAR MENUS
  //Load years
  for(i = 2000; i<2099; i++){
    $('#yearDropdown').append('<option>' + i + '</option>');
  }

  //Load days
  for(i = 1; i<31; i++){
    $('#dayDropdown').append('<option>' + i + '</option>');
  }

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
    addToStatusPanel("");
    $('h6').remove();
  });

  //Dropdown Menu listener
  $('#selectDropdown').on("change", function(){

    var selectedValue = $(this).find(':selected').val();

    $.ajax({
      type: 'get',
      dataType: 'json', //Returns a JSON
      url: '/getEventList', //Get files from server
      data: {filename : selectedValue},
      success:function(data){

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

            if(isUTC){
              time += '(UTC)';
            }

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

  // Event listener form replacement example, building a Single-Page-App, no redirects if possible
  $('#someform').submit(function(e){
    $('#blah').html("Callback from the form");
    e.preventDefault();
    //Pass data to the Ajax call, so it gets passed to the
    $.ajax({});
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

function printAlarms(data){

  var alarmJSON;
  var toReturn = '';

  for(i = 0; i<data.length; i++){

    alarmJSON = data[i];
    toReturn += ('<h6>&#8195&#8195&#8195Alarm ' + (i+1) + ': Action: ' + alarmJSON.action + ', Trigger: ' + alarmJSON.trigger + ', numProps: ' + alarmJSON.numProps + '<br></h6>');
  }

  return toReturn;

}

function printProperties(data){

  var propJSON;
  var toReturn = '';

  for(i = 0; i<data.length; i++){

    propJSON = data[i];
    toReturn += ('<h6>&#8195&#8195&#8195Property Name: ' + propJSON.propName + ', Property Description: ' + propJSON.propDescr + '<br></h6>');
  }

  return toReturn;
}

function addToStatusPanel(toAdd){

  $.ajax({
    type: 'post',
    data: {toAdd : toAdd},
    url: '/statusPanel',
    success:function(data){

    }
  });

  getStatusPanel();
}

function getStatusPanel(){

  $.ajax({
    type:'get',
    dataType:'text',
    url:'/getStatusPanel',
    success:function(data){
      $('#statusPanel').html('');
      $('#statusPanel').append(data);
    }
  });

}
