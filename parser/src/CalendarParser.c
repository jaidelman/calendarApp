/*  Joshua Aidelman
1000139
Last Updated: 2/20/19
*/

#include "CalendarParser.h"
#include <stdbool.h>
#include <ctype.h>

ICalErrorCode propertyFinder(char *name, char *value, Calendar **obj); //Finds property and sets proper values
ICalErrorCode setDateTime(DateTime *dt, char *string); //Converts string to dateTime
Event *initializeEvent(); //Initializes event and sets activeEvent to it
Alarm *initializeAlarm(); //Initializes alarm and sets activeAlarm to it
Property *initializeProperty(char *name, char *value); //Creates and returns property
ICalErrorCode dateChecker(DateTime *dt); //Validates dateTime
int compareInsensitive(char *one, char *two); //Compares two strings with case insensitive
bool isValidCalProperty(char *propName); //Checks if property is valid calendar property
bool isValidComponentProperty(char *propName, char *componentName); //Checks if property is valid component property
void resetStaticVariables(int *bc, int *ec, Event **e, Alarm **a); //Resets static variables
char *icalToJSON(char *filename); //Go from iCal file to JSON
void addEventToCal(char *filename, char *uid, char *summary, char *startDT, char *creationDT); //Adds event to a file

ICalErrorCode createCalendar(char* fileName, Calendar** obj){

  FILE *fp; //File pointer
  Calendar *temp; //Temp calandar pointer
  ICalErrorCode err = OK; //Stores error codes

  char c; //To store character scanned
  char *contentLine, *property; //To store line and type
  char *extension; //To make sure it's a .ics file
  char *lastContentLine; //To store previous content line
  char *comment; //To store comment

  int i = 0; //Index counter
  int colonIndex = 0; //Stores the position of ':'
  int folding = 0; //Boolean value for if folding is occuring

  bool colon = false; //Boolean value for if colon has been parsed

  //Checks for valid file
  if(fileName == NULL || strcmp(fileName, "") == 0){
    *obj = NULL;
    return INV_FILE;
  }

  extension = strrchr(fileName, '.'); //To make sure it's .ics file

  //Check for valid extension
  if(extension == NULL || strcmp(extension, ".ics") != 0){
    *obj = NULL;
    return INV_FILE;
  }

  fp = fopen(fileName, "r"); //Open file

  //Makes sure file isn't NULL
  if(fp == NULL){
    *obj = NULL;
    return INV_FILE;
  }

  //Allocates memory for Calendar and initilizes values
  temp = malloc(sizeof(Calendar));
  temp->version = 0;
  temp->prodID[0] = '\0';
  temp->events = initializeList(printEvent, deleteEvent, compareEvents);
  temp->properties = initializeList(printProperty, deleteProperty, compareProperties);

  contentLine = calloc(80, sizeof(char)); //To store content line
  lastContentLine = malloc(80 * sizeof(char)); //To store previous content line
  property = calloc(80, sizeof(char)); //For sending the value of a property

  lastContentLine[0] = '\0'; //For invalid line endings

  //While file isn't NULL
  while(!feof(fp)){

    c = fgetc(fp); //Read character by character

    //If line is a comemnt, only check one time per line
    if(contentLine[0] == ';' && i == 1){

      comment = malloc(sizeof(char) * 75);
      //Read and discard comment, set i back to 0
      fgets(comment, 75, fp);

      //If folding is flase reset i and colon
      if(folding == false){
        i = 0;
        colon = false;
      }

      free(comment); //Free the comment

    }
    //Get only valid characters and store them in contentLine
    else if(c >= ' ' && c <= '~'){

      //If c == ':' || ';', contentLine holds the name
      if((c == ':' || c == ';') && colon == false){
        strcpy(property, contentLine);
        property[i] = '\0';
        colonIndex = i; //Save index of colon
        colon = true;
      }

      //If i gets too big we need to realloc
      if(i%79 == 0 && i != 0){
        contentLine = realloc(contentLine, ((( (i/79) * 80) + 80) * sizeof(char)));
        lastContentLine = realloc(lastContentLine, ((( (i/79) * 80) + 80) * sizeof(char)));
      }

      //Scan char and increment i
      contentLine[i] = c;
      i++;

    }
    //If c is '\r'
    else if(c == '\r'){
      c = fgetc(fp);
      //If the next char is '\n'
      if(c == '\n'){
        c = fgetc(fp);
        //If the next char is not ' ' or '\t', it must be new contentLine, search for what to do
        if(c != ' ' && c != '\t'){

          //If empty line
          if(c == '\r'){
            err = propertyFinder("", "", &temp); //Will return INV_FILE
          }
          //If the line has no colon, invalid calendar
          else if(colon == false){
            propertyFinder("END", "VCALENDAR", &temp); //Close any active events/alarms
            deleteCalendar(temp);
            free(property);
            free(contentLine);
            free(lastContentLine);
            fclose(fp);
            *obj = NULL;
            return INV_CAL;
          }
          //If property and the value aren't NULL
          else if(property != NULL && (&contentLine[colonIndex+1]) != NULL){

            //Null terminate both strings and search for property
            contentLine[i] = '\0';
            lastContentLine[i] = '\0';
            err = propertyFinder(property, &contentLine[colonIndex+1], &temp);
          }

          //If error happened, free all memory and return error
          if(err != OK){
            deleteCalendar(temp);
            free(property);
            free(contentLine);
            free(lastContentLine);
            fclose(fp);
            *obj = NULL;
            return err;
          }

          //Since it's not folding, reset and empty contentLine
          folding = 0;
          strcpy(lastContentLine, contentLine); //Store last content line
          memset(&contentLine[0], 0, strlen(contentLine)); //Empty contentLine

          //If next line starts with valid char, set next contentLine[0] to character already read and reset i
          if(c >= ' ' && c <= '~'){
            contentLine[0] = c;
            i = 1;
            colon = false;

            //If next line starts with ':'
            if(c == ':'){
              colon = true;
              property[0] = '\0';
              colonIndex = 0;
            }
          }

          //Otherwise set i to 0
          else{
            i = 0;
            colon = false;
          }

        }
        //If line folding
        else{
          folding++;
        }

      }

    }

  }

  fclose(fp); //Close file

  //Make sure last line is END:VCALENDAR, if not, free all memory and set *obj to NULL
  if(compareInsensitive(lastContentLine, "END:VCALENDAR") != 0 ){
    propertyFinder("END", "VCALENDAR", &temp); //Close any active events/alarms
    deleteCalendar(temp);
    free(property);
    free(contentLine);
    free(lastContentLine);
    *obj = NULL;
    return INV_CAL;
  }

  //Free strings
  free(property);
  free(contentLine);
  free(lastContentLine);

  //Make sure mandatory properties are set
  if(strcmp(temp->prodID, "") == 0 || temp->version == 0 || getLength(temp->events) == 0){
    deleteCalendar(temp);
    *obj = NULL;
    return INV_CAL;
  }

  (*obj) = temp; //Set the Cal passed in to temp

  return OK; //Return OK
}

//Deletes calendar
void deleteCalendar(Calendar* obj){

  if(obj == NULL) return;

  //Free both lists
  freeList(obj->events);
  freeList(obj->properties);

  //Free calendar pointer
  free(obj);
}

char* printCalendar(const Calendar* obj){

  if(obj == NULL) return "";

  char *properties = toString(obj->properties); //String of properties
  char *events = toString(obj->events); //String of events
  char *toReturn = malloc(sizeof(char) * (strlen(properties) + strlen(events) + 500)); //String to return

  //Put it all together
  sprintf(toReturn, "CALENDAR\n--------\nVersion: %.2f\nProduct ID: %s\n\nPROPERTIES\n----------\n", obj->version, obj->prodID);
  strcat(toReturn, properties);
  strcat(toReturn, "\nEVENTS\n-------");
  strcat(toReturn, events);
  strcat(toReturn, "\n");

  //Free properties/events strings and return toReturn
  free(properties);
  free(events);

  return toReturn;
}

void resetStaticVariables(int *bc, int *ec, Event **e, Alarm **a){

  *bc = 0;
  *ec = 0;
  *e = NULL;
  *a = NULL;

}

/*This function analyzes a line and does the appropriate thing to the calendar object
*@pre End of line has been reached in file
*@post Calendar has been modified to add the value of that line
*@return ICalErrorCode - If error occurs, will return correct error
*@param name - a pointer to the string of what was before the ':'
*@param value - a pointer to the string of what was after the ':'
*@param obj - a double pointer to the Calendar object
**/
ICalErrorCode propertyFinder(char *name, char *value, Calendar **obj){

  Property *tempProp;
  ICalErrorCode err = OK;

  //These count how many "BEGIN" and "END"'s there are
  static int beginCount = 0;
  static int endCount = 0;
  static Event *activeEvent = NULL; //Knows which event is currently active
  static Alarm *activeAlarm = NULL; //Knows which alarm is currently active

  //If empty line
  if(strcmp(name, "") == 0 && strcmp(value, "") == 0){

    //Make sure event was closed
    if(activeEvent != NULL){
      insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
    }
    //Make sure alarm was closed
    else if(activeAlarm != NULL){
      freeList(activeAlarm->properties);
      free(activeAlarm->trigger);
      free(activeAlarm);
    }

    beginCount = 0;
    endCount = 0;
    return INV_CAL;
  }

  //If version
  if(compareInsensitive(name, "VERSION") == 0){

    //If duplicate version
    if((*obj)->version != 0){
      err = DUP_VER;
    }

    //Make sure valid version
    if(strcmp(value, "") == 0){
      err = INV_VER;
    }

    //Make sure only contains digits and '.'
    for(int j = 0; j<strlen(value); j++){
      if( !isdigit(value[j]) && value[j] != '.'){
        err = INV_VER;
      }
    }

    (*obj)->version = atof(value); //Set version
  }
  //If product ID
  else if(compareInsensitive(name, "PRODID") == 0){

    //Make sure not empty
    if(strcmp(value, "") == 0){
      err = INV_PRODID;
    }

    //Make sure not Duplicate
    if(strcmp( (*obj)->prodID, "") != 0){
      err = DUP_PRODID;
    }

    strcpy((*obj)->prodID, value); //Set productID
  }
  //If begin
  else if(compareInsensitive(name, "BEGIN") == 0){
    beginCount++;

    //If VCALENDAR
    if(compareInsensitive(value, "VCALENDAR") == 0){

    }
    //If VEVENT
    else if(compareInsensitive(value, "VEVENT") == 0){

      //If last event was never closed
      if(activeEvent != NULL){
        err = INV_EVENT;
      }

      activeEvent = initializeEvent(); //Set active event
    }
    //If VALARM
    else if(compareInsensitive(value, "VALARM") == 0){

      //If last alarm wasn't closed
      if(activeAlarm != NULL){
        err = INV_ALARM;
      }

      //If alarm doesn't belong to an event
      if(activeEvent == NULL){
        err = INV_CAL;
      }

      activeAlarm = initializeAlarm(); //Set active alarm
    }
  }
  //If end
  else if(compareInsensitive(name, "END") == 0){
    endCount++;

    //If VEVENT
    if(compareInsensitive(value, "VEVENT") == 0){

      //If no active event
      if(activeEvent == NULL){
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_CAL;
      }

      //If missing mandatory properties
      if(strcmp(activeEvent->UID, "") == 0 || strcmp( (activeEvent->creationDateTime.date), "") == 0 || strcmp( (activeEvent->startDateTime.date), "") == 0){
        insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_EVENT;
      }

      //If event ends but alarm is still active
      if(activeAlarm != NULL){
        insertBack(activeEvent->alarms, activeAlarm); //Insert so memory can be freed
        insertBack((*obj)->events, activeEvent); //Insert so memory will be freed
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_CAL;
      }

      //Insert event in list and set activeEvent to NULL
      insertBack((*obj)->events, activeEvent);
      activeEvent = NULL;
    }
    //If VALARM
    else if(compareInsensitive(value, "VALARM") == 0){

      //If no active alarm
      if(activeAlarm == NULL){

        //If event is active
        if(activeEvent != NULL){
          insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
        }
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_CAL;
      }

      //If missing mandatory properties
      if( strcmp(activeAlarm->action, "") == 0 || strcmp(activeAlarm->trigger, "") == 0){
        insertBack(activeEvent->alarms, activeAlarm); //Insert so memory can be freed
        insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_ALARM;
      }

      //Insert alarm in list and set activeAlarm to NULL
      insertBack(activeEvent->alarms, activeAlarm);
      activeAlarm = NULL;
    }
    //If VCALENDAR
    else if(compareInsensitive(value, "VCALENDAR") == 0){

      //Make sure there are no active alarms or events
      if(activeEvent != NULL && activeAlarm != NULL){
        insertBack(activeEvent->alarms, activeAlarm); //Insert so memory can be freed
        insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_CAL;
      }
      //Make sure event was closed
      if(activeEvent != NULL){
        insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_EVENT;
      }
      //Make sure alarm was closed
      else if(activeAlarm != NULL){

        //Free memory and return
        freeList(activeAlarm->properties);
        free(activeAlarm->trigger);
        free(activeAlarm);

        resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
        return INV_ALARM;
      }
    }
  }
  //If Optional Property
  else if(beginCount-endCount == 1){

    //Create property, add it to the list
    tempProp = initializeProperty(name, value);
    insertBack((*obj)->properties, tempProp);

  }
  //If we are in an event
  else if(activeEvent != NULL){

    //Case UID (Event)
    if(compareInsensitive(name, "UID") == 0){
      strcpy(activeEvent->UID, value);
    }
    //Case DTSTAMP (Event)
    else if(compareInsensitive(name, "DTSTAMP") == 0){
      err = setDateTime(&activeEvent->creationDateTime, value);
    }
    //Case DTSTART (Event)
    else if(compareInsensitive(name, "DTSTART") == 0){
      err = setDateTime(&activeEvent->startDateTime, value);
    }
    //Case ACTION (Alarm)
    else if(activeAlarm != NULL && compareInsensitive(name, "ACTION") == 0){
      strcpy(activeAlarm->action, value);
    }
    //Case TRIGGER (Alarm)
    else if(activeAlarm != NULL && compareInsensitive(name, "TRIGGER") == 0){
      strcpy(activeAlarm->trigger, value);
      activeAlarm->trigger[strlen(activeAlarm->trigger)] = '\0'; //Set null character
    }
    //Otherwise, must be property
    else{
      tempProp = initializeProperty(name, value); //Initialize property

      //If there is no activeAlarm, it must belong to the event
      if(activeAlarm == NULL){

        //If empty name or property
        if(strcmp(tempProp->propName, "") == 0 || strcmp(tempProp->propDescr, "") == 0){
          resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
          return INV_EVENT;
        }

        insertBack(activeEvent->properties, tempProp);
      }
      //Otherwise it belongs to the alarm
      else{

        //If empty name or property
        if(strcmp(tempProp->propName, "") == 0 || strcmp(tempProp->propDescr, "") == 0){
          resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
          return INV_ALARM;
        }

        insertBack(activeAlarm->properties, tempProp);
      }

    }

  }

  //If error occured but memory still exists, free it then return
  if(err != OK && activeEvent != NULL){
    insertBack((*obj)->events, activeEvent); //Insert so memory can be freed
  }
  if(err != OK && activeAlarm != NULL){
    freeList(activeAlarm->properties);
    free(activeAlarm->trigger);
    free(activeAlarm);
  }

  if(err == OK){
    return err;
  }
  else{
    resetStaticVariables(&beginCount, &endCount, &activeEvent, &activeAlarm);
    return err;
  }


}

//Sets the members of the dt struct based on the string
ICalErrorCode setDateTime(DateTime *dt, char *string){

  char c = string[0];

  //When first initialized, set empty values
  if(strcmp(string, "") == 0){
    return INV_DT;
  }

  //If string is too short or long, must be invalid
  if(strlen(string) < 15 || strlen(string) > 16){
    return INV_DT;
  }

  //If string is 16 char, but the 16th char isn't 'Z' it's invalid
  if(strlen(string) == 16 && string[15] != 'Z'){
    return INV_DT;
  }

  //If first character isn't digit, must be invalid
  if(isdigit(c)){

    //Set date and time and NULL terminate them
    strncpy(dt->date, string, 8);
    (dt->date)[8] = '\0';
    strncpy(dt->time, &string[9], 6);
    (dt->time)[6] = '\0';

    if(string[15] == 'Z') dt->UTC = true; //If the last character is 'Z', UTC time zone
    else dt->UTC = false; //Else local time zone
  }
  //First char isn't digit, therefore invalid
  else{
    return INV_DT;
  }

  return dateChecker(dt); //Make sure valid date time

}

//Checks to make sure dateTime is valid
ICalErrorCode dateChecker(DateTime *dt){

  //Loop through 8 char's in date
  for(int i = 0; i<8; i++){

    //Only 6 char's in time
    if(i<6){

      //Check to make sure time is numeric
      if(!isdigit(dt->time[i])){
        return INV_DT;
      }

    }

    //Makes sure date is numeric
    if(!isdigit(dt->date[i])){
      return INV_DT;
    }
  }

  return OK;
}

//Creates and returns an Event pointer
Event *initializeEvent(){

  //Initialize event, properties list and alarms list
  Event *tempEvent = malloc(sizeof(Event));
  tempEvent->UID[0] = '\0';
  tempEvent->properties = initializeList(printProperty, deleteProperty, compareProperties);
  tempEvent->alarms = initializeList(printAlarm, deleteAlarm, compareAlarms);
  setDateTime( &(tempEvent->creationDateTime), "");
  setDateTime( &(tempEvent->startDateTime), "");

  //Set default values of date times
  strcpy(tempEvent->creationDateTime.date, "");
  strcpy(tempEvent->creationDateTime.time, "");
  tempEvent->creationDateTime.UTC = false;

  strcpy(tempEvent->startDateTime.date, "");
  strcpy(tempEvent->startDateTime.time, "");
  tempEvent->startDateTime.UTC = false;

  return tempEvent; //Set activeEvent

}

//Creates and returns an Alarm pointer
Alarm *initializeAlarm(){

  //Initialize alarm, trigger and properties list.
  Alarm *tempAlarm = malloc(sizeof(Alarm));
  tempAlarm->trigger = malloc(sizeof(char) * 75);
  strcpy(tempAlarm->trigger, "");
  strcpy(tempAlarm->action, "");
  tempAlarm->properties = initializeList(printProperty, deleteProperty, compareProperties);

  return tempAlarm; //Set activeAlarm

}

//Creates and returns property
Property *initializeProperty(char *name, char *value){

  //Malloc for property and set name and description
  Property *tempProp = malloc(sizeof(Property) + (sizeof(char) * (strlen(value)+100)));
  strcpy(tempProp->propName, name);
  strcpy(tempProp->propDescr, value);

  return tempProp; //Return property

}

//Prints a property
char* printProperty(void* toBePrinted){

  if(toBePrinted == NULL) return "";

  //Malloc for string toReturn and set pointer to Property
  Property *temp = toBePrinted;
  char *toReturn = malloc(sizeof(char) * (strlen(temp->propName) + strlen(temp->propDescr) + 100));

  //Build string
  strcpy(toReturn, temp->propName);
  strcat(toReturn, ": ");
  strcat(toReturn, temp->propDescr);

  //Return string
  return toReturn;
}

//Deletes a property
void deleteProperty(void* toBeDeleted){
  if(toBeDeleted == NULL) return;
  free(toBeDeleted); //No memory is malloc'd so only free Property
}

//Compares properties
int compareProperties(const void* first, const void* second){

  //Create two properties
  const Property *temp1;
  const Property *temp2;

  int toReturn;

  //Check for NULL
  if(first == NULL || second == NULL){
    return -1;
  }

  //Set pointers
  temp1 = first;
  temp2 = second;

  //Compare names, if different return
  if( (toReturn = strcmp(temp1->propName, temp2->propName)) != 0){
    return toReturn;
  }
  //Compare descriptions, if different return
  else if( (toReturn = strcmp(temp1->propDescr, temp2->propDescr)) != 0){
    return toReturn;
  }

  return 0; //If all tests are passed, return 0

}

//Deletes Event
void deleteEvent(void* toBeDeleted){

  if(toBeDeleted == NULL) return;

  Event *temp = toBeDeleted; //Set pointer to Event

  //Free both lists
  freeList(temp->properties);
  freeList(temp->alarms);

  free(temp); //Free event
}

//Compares Events
int compareEvents(const void* first, const void* second){

  const Event *temp1, *temp2; //Temp event pointers
  int toReturn;
  char *charOne, *charTwo;

  //Check for NULL
  if(first == NULL || second == NULL){
    return 0;
  }

  //Set pointers to events
  temp1 = first;
  temp2 = second;


  //Check for equal UID
  if( (toReturn = strcmp(temp1->UID, temp2->UID)) != 0){
    return toReturn;
  }
  //Check for equal Dates
  else if( (toReturn = (compareDates(&temp1->creationDateTime, &temp2->creationDateTime))) != 0){
    return toReturn;
  }
  else if( (toReturn = (compareDates(&temp1->startDateTime, &temp2->startDateTime))) != 0){
    return toReturn;
  }

  //Check for equal properties
  charOne = toString(temp1->properties);
  charTwo = toString(temp2->properties);

  if( (toReturn = strcmp(charOne, charTwo)) != 0){
    free(charOne);
    free(charTwo);
    return toReturn;
  }

  //Check for equal Alarms
  charOne = toString(temp1->alarms);
  charTwo = toString(temp2->alarms);

  if( (toReturn = strcmp(charOne, charTwo)) != 0){
    free(charOne);
    free(charTwo);
    return toReturn;
  }

  //Else must be equal
  free(charOne);
  free(charTwo);
  return 0; //All tests passed

}

//Prints Events
char* printEvent(void* toBePrinted){

  if(toBePrinted == NULL) return "";

  Event *temp = toBePrinted; //Set pointer to Event

  //Create strings for all properties of the event
  char *creationDT = printDate(&temp->creationDateTime);
  char *startDT = printDate(&temp->startDateTime);
  char *properties = toString(temp->properties);
  char *alarms = toString(temp->alarms);
  char *toReturn = malloc(sizeof(char) * (strlen(creationDT) + strlen(startDT) + strlen(properties) + strlen(alarms) + 500));

  //Build string
  strcpy(toReturn, "User ID: ");
  strcat(toReturn, temp->UID);
  strcat(toReturn, "\nCreated: ");
  strcat(toReturn, creationDT);
  strcat(toReturn, "Start: ");
  strcat(toReturn, startDT);
  strcat(toReturn, properties);
  strcat(toReturn, alarms);
  strcat(toReturn, "\n-----------------");
  //Free created strings
  free(creationDT);
  free(startDT);
  free(properties);
  free(alarms);

  return toReturn; //Return string
}

//Prints DateTime
char* printDate(void* toBePrinted){

  if(toBePrinted == NULL) return "";

  //Malloc char to return and set pointer to DateTime
  DateTime *temp = toBePrinted;
  char *toReturn = malloc(sizeof(char) * (strlen(temp->date) + strlen(temp->time) + 100));

  //Build string
  strcpy(toReturn, temp->date);
  strcat(toReturn, " ");
  strcat(toReturn, temp->time);
  strcat(toReturn, ": ");

  //Build string according to time zone
  if(temp->UTC == false){
    strcat(toReturn, "Local time\n");
  }
  else{
    strcat(toReturn, "UTC time\n");
  }

  return toReturn; //Return string
}

//Deletes Alarm
void deleteAlarm(void* toBeDeleted){

  if(toBeDeleted == NULL) return;

  Alarm *tempAlarm = toBeDeleted; //Alarm to be deleted

  //Free all members of struct
  freeList(tempAlarm->properties);
  free(tempAlarm->trigger);

  free(tempAlarm); //Free alarm

}

//Compares Alarms
int compareAlarms(const void* first, const void* second){

  //Alarms to compare
  const Alarm *one;
  const Alarm *two;

  char *charOne, *charTwo;
  int toReturn;

  //Check for NULL pointers
  if(first == NULL || second == NULL){
    return -1;
  }

  //Set pointers
  one = first;
  two = second;

  //If actions aren't equal, return
  if( (toReturn = strcmp(one->action, two->action)) != 0){
    return toReturn;
  }
  //If triggers aren't equal, return
  else if( (toReturn = strcmp(one->trigger, two->trigger)) != 0){
    return toReturn;
  }
  //Check for equal properties
  else{
    charOne = toString(one->properties);
    charTwo = toString(two->properties);

    if( (toReturn = strcmp(charOne, charTwo)) != 0){
      free(charOne);
      free(charTwo);
      return toReturn;
    }

  }

  free(charOne);
  free(charTwo);
  return 0; //All tests passed
}

//Prints Alarms
char* printAlarm(void* toBePrinted){

  if(toBePrinted == NULL) return "";

  Alarm *temp = toBePrinted;

  //Malloc toReturn and initialize the properties string
  char *properties = toString(temp->properties);
  char *toReturn = malloc(sizeof(char) * (strlen(properties) + strlen(temp->action) + strlen(temp->trigger) + 100));

  //Build toReturn
  strcpy(toReturn, "ALARM:");
  strcat(toReturn, temp->action);
  strcat(toReturn, " ");
  strcat(toReturn, temp->trigger);
  strcat(toReturn, "\nPROPERTIES\n---------");
  strcat(toReturn, properties);

  free(properties); //Free properties string

  return toReturn; //Return string

}

//Compares Dates
int compareDates(const void* first, const void* second){

  const DateTime *one, *two;
  int toReturn;

  //Check for NULL
  if(first == NULL || second == NULL){
    return -1;
  }

  //Set pointers
  one = first;
  two = second;

  //Compare three variables
  if( (toReturn = strcmp(one->date, two->date)) != 0){
    return toReturn;
  }
  else if( (toReturn = strcmp(one->time, two->time)) != 0){
    return toReturn;
  }
  else if(one->UTC != two->UTC){
    return 1;
  }

  return 0; //Passed all tests
}

//Deletes Date
void deleteDate(void* toBeDeleted){
  if(toBeDeleted == NULL) return;
  free(toBeDeleted);
}

//Function stub
ICalErrorCode validateCalendar(const Calendar* obj){

  Node *tempProp, *tempEvent, *tempAlarm;
  Property *property;
  Event *event;
  Alarm *alarm;
  DateTime date;

  char *propName; //Stores property name
  //Flags for calendar properties that can only occur once
  bool calscale = false; bool method = false;
  //Flags for event properties that can only occur once
  bool class = false; bool created = false;
  bool description = false; bool geo = false;
  bool lastMod = false; bool location = false;
  bool organizer = false; bool priority = false;
  bool seq = false; bool status = false;
  bool summary = false; bool transp = false;
  bool url = false; bool recurid = false;
  bool dtend = false; bool duration = false;
  //Flags for alarm properties that can only occur once
  bool durationAlarm = false; bool repeat = false;
  bool attach = false; bool descriptionAlarm = false;
  bool summaryAlarm = false; bool attendee = false;

  //NULL check
  if(obj == NULL){
    return INV_CAL;
  }

  //Check basic calendar errors
  if(obj->version == 0.0 || obj->prodID == NULL || obj->events == NULL || obj->properties == NULL || getLength(obj->events) == 0){
    return INV_CAL;
  }

  //Check calendar property errors
  tempProp = obj->properties->head;
  while(tempProp != NULL){
    property = tempProp->data;
    propName = property->propName;

    //Check propName
    if(propName == NULL || strcmp(propName, "") == 0) return INV_CAL;

    //Check propDescr
    if(property->propDescr == NULL || strcmp(property->propDescr, "") == 0) return INV_CAL;

    //Check dupe struct members
    if(compareInsensitive(propName, "PRODID") == 0 || compareInsensitive(propName, "VERSION") == 0){
      return INV_CAL;
    }
    //Check flags
    if(compareInsensitive(propName, "CALSCALE") == 0){
      if(calscale) return INV_EVENT;
      calscale = true;
    }
    else if(compareInsensitive(propName, "METHOD") == 0){
      if(method) return INV_EVENT;
      method = true;
    }
    else if(!isValidCalProperty(propName)){
      return INV_CAL;
    }

    tempProp = tempProp->next; //Go along list
  }

  //Check events for errors
  tempEvent = obj->events->head;
  while(tempEvent != NULL){
    event = tempEvent->data;

    //Check pointers
    if(event->UID == NULL || event->properties == NULL || event->alarms == NULL || strcmp(event->UID, "") == 0) return INV_EVENT;


    //Check creationDateTime
    date = event->creationDateTime;
    if(date.date == NULL || date.time == NULL) return INV_EVENT;
    if(strlen(date.date) != 8 || strlen(date.time) != 6) return INV_EVENT;

    //Check startDateTime
    date = event->startDateTime;
    if(date.date == NULL || date.time == NULL) return INV_EVENT;
    if(strlen(date.date) != 8 || strlen(date.time) != 6) return INV_EVENT;

    //Check properties
    tempProp = event->properties->head;
    while(tempProp != NULL){
      property = tempProp->data;
      propName = property->propName;

      //Check propName
      if(propName == NULL || strcmp(propName, "") == 0) return INV_EVENT;

      //Check propDescr
      if(property->propDescr == NULL || strcmp(property->propDescr, "") == 0) return INV_EVENT;

      //Make sure struct members aren't in properties
      if(compareInsensitive(propName, "DTSTAMP") == 0 || compareInsensitive(propName, "DTSTART") == 0 || compareInsensitive(propName, "UID") == 0){
        return INV_EVENT;
      }
      //Check flags
      if(compareInsensitive(propName, "CLASS") == 0){
        if(class) return INV_EVENT;
        class = true;
      }
      else if(compareInsensitive(propName, "CREATED") == 0){
        if(created) return INV_EVENT;
        created = true;
      }
      else if(compareInsensitive(propName, "DESCRIPTION") == 0){
        if(description) return INV_EVENT;
        description = true;
      }
      else if(compareInsensitive(propName, "GEO") == 0){
        if(geo) return INV_EVENT;
        geo = true;
      }
      else if(compareInsensitive(propName, "LAST-MOD") == 0){
        if(lastMod) return INV_EVENT;
        lastMod = true;
      }
      else if(compareInsensitive(propName, "LOCATION") == 0){
        if(location) return INV_EVENT;
        location = true;
      }
      else if(compareInsensitive(propName, "ORGANIZER") == 0){
        if(organizer) return INV_EVENT;
        organizer = true;
      }
      else if(compareInsensitive(propName, "PRIORITY") == 0){
        if(priority) return INV_EVENT;
        priority = true;
      }
      else if(compareInsensitive(propName, "SEQ") == 0){
        if(seq) return INV_EVENT;
        seq = true;
      }
      else if(compareInsensitive(propName, "STATUS") == 0){
        if(status) return INV_EVENT;
        status = true;
      }
      else if(compareInsensitive(propName, "SUMMARY") == 0){
        if(summary) return INV_EVENT;
        summary = true;
      }
      else if(compareInsensitive(propName, "TRANSP") == 0){
        if(transp) return INV_EVENT;
        transp = true;
      }
      else if(compareInsensitive(propName, "URL") == 0){
        if(url) return INV_EVENT;
        url = true;
      }
      else if(compareInsensitive(propName, "RECURID") == 0){
        if(recurid) return INV_EVENT;
        recurid = true;
      }
      else if(compareInsensitive(propName, "DTEND") == 0){
        if(duration || dtend) return INV_EVENT;
        dtend = true;
      }
      else if(compareInsensitive(propName, "DURATION") == 0){
        if(dtend || duration) return INV_EVENT;
        duration = true;
      }
      else if(!isValidComponentProperty(propName, "VEVENT")){
        return INV_EVENT;
      }

      tempProp = tempProp->next; //Iterate through list
    }

    //Check alarms
    tempAlarm = event->alarms->head;
    while(tempAlarm != NULL){
      alarm = tempAlarm->data;

      //Check for null pointers and empty strings
      if(alarm->action == NULL || alarm->trigger == NULL || alarm->properties == NULL) return INV_ALARM;
      if(strcmp(alarm->action, "") == 0 || strcmp(alarm->trigger, "") == 0) return INV_ALARM;

      //Check properties
      tempProp = alarm->properties->head;
      while(tempProp != NULL){
        property = tempProp->data;
        propName = property->propName;

        //Check propName
        if(propName == NULL || strcmp(propName, "") == 0) return INV_EVENT;

        //Check propDescr
        if(property->propDescr == NULL || strcmp(property->propDescr, "") == 0) return INV_EVENT;

        //Check for dupe trigger and action
        if(compareInsensitive(propName, "ACTION") == 0 || compareInsensitive(propName, "TRIGGER") == 0) return INV_ALARM;
        else if(compareInsensitive(propName, "DURATION") == 0){
          if(durationAlarm) return INV_ALARM;
          durationAlarm = true;
        }
        else if(compareInsensitive(propName, "REPEAT") == 0){
          if(repeat) return INV_ALARM;
          repeat = true;
        }
        //Attach can only be called once if it's an audio alarm
        else if(compareInsensitive(propName, "ATTACH") == 0 && compareInsensitive(alarm->action, "AUDIO") == 0){
          if(attach) return INV_ALARM;
          attach = true;
        }
        //Description can only be called once if it's a display alarm
        else if(compareInsensitive(propName, "DESCRIPTION") == 0 && compareInsensitive(alarm->action, "DISPLAY") == 0){
          if(descriptionAlarm) return INV_ALARM;
          descriptionAlarm = true;
        }
        else if(compareInsensitive(propName, "SUMMARY") == 0 && compareInsensitive(alarm->action, "EMAIL") == 0){
          if(summaryAlarm) return INV_ALARM;
          summaryAlarm = true;
        }
        else if(!isValidComponentProperty(propName, "VALARM")){
          return INV_ALARM;
        }

        tempProp = tempProp->next; //Iterate through list
      }

      if(durationAlarm != repeat) return INV_ALARM; //If duration appears, repeat must too
      //Display alarm must have description
      if(compareInsensitive(alarm->action, "DISPLAY") == 0 && descriptionAlarm == false) return INV_ALARM;
      //Email alarm must have description, summary and attendee
      if(compareInsensitive(alarm->action, "EMAIL") == 0 && (descriptionAlarm == false || summaryAlarm == false || attendee == false)) return INV_ALARM;

      //Reset all alarm flags
      durationAlarm = false;  repeat = false;
      attach = false;  descriptionAlarm = false;
      summaryAlarm = false;  attendee = false;

      tempAlarm = tempAlarm->next; //Go through list
    }

    //Only one of these can occur in an event
    if(dtend == true && duration == true) return INV_EVENT;

    //Reset all event flags
    class = false;  created = false;
    description = false;  geo = false;
    lastMod = false;  location = false;
    organizer = false;  priority = false;
    seq = false;  status = false;
    summary = false;  transp = false;
    url = false;  recurid = false;
    dtend = false;  duration = false;

    tempEvent = tempEvent->next; //Go along list
  }

  return OK;
}

ICalErrorCode writeCalendar(char* fileName, const Calendar* obj){

  FILE *fp;
  Node *temp, *tempProp, *tempAlarm;
  Event *event;
  Property *property;
  Alarm *alarm;
  DateTime date;

  fp = fopen(fileName, "w");

  //NULL check
  if(fp == NULL || obj == NULL){
    return WRITE_ERROR;
  }

  //Print calendar basics
  fprintf(fp, "BEGIN:VCALENDAR\r\n");
  fprintf(fp, "PRODID:%s\r\n", obj->prodID);
  fprintf(fp, "VERSION:%f\r\n", obj->version);

  //Print all properties
  temp = obj->properties->head;
  while(temp != NULL){
    property = temp->data;
    fprintf(fp, "%s:%s\r\n", property->propName, property->propDescr);
    temp = temp->next;
  }

  //Print all events
  temp = obj->events->head; //Set node pointer
  while(temp != NULL){
    event = temp->data; //Set event

    //Opening and UID
    fprintf(fp, "BEGIN:VEVENT\r\n");
    fprintf(fp, "UID:%s\r\n", event->UID);

    //Print creationDateTime
    date = event->creationDateTime;
    fprintf(fp, "DTSTAMP:%sT%s", date.date, date.time);
    if(date.UTC) fprintf(fp, "Z"); //Check for UTC
    fprintf(fp, "\r\n"); //Print CRLF

    //Print startDateTime
    date = event->startDateTime;
    fprintf(fp, "DTSTART:%sT%s", date.date, date.time);
    if(date.UTC) fprintf(fp, "Z"); //Check for UTC
    fprintf(fp, "\r\n"); //Print CRLF

    //Print all properties
    tempProp = event->properties->head;
    while(tempProp != NULL){
      property = tempProp->data;
      fprintf(fp, "%s:%s\r\n", property->propName, property->propDescr);
      tempProp = tempProp->next;
    }

    //Print all alarms
    tempAlarm = event->alarms->head;
    while(tempAlarm != NULL){
      fprintf(fp, "BEGIN:VALARM\r\n");
      alarm = tempAlarm->data;

      //Print mandatory alarm properties
      fprintf(fp, "ACTION:%s\r\n", alarm->action);
      fprintf(fp, "TRIGGER:%s\r\n", alarm->trigger);

      //Print all alarm properties
      tempProp = alarm->properties->head;
      while(tempProp != NULL){
        property = tempProp->data;
        fprintf(fp, "%s:%s\r\n", property->propName, property->propDescr);
        tempProp = tempProp->next;
      }
      tempAlarm = tempAlarm->next; //Go to next alarm
      fprintf(fp, "END:VALARM\r\n");
    }

    fprintf(fp, "END:VEVENT\r\n");
    temp = temp->next; //Go to next event
  }

  fprintf(fp, "END:VCALENDAR\r\n");

  fclose(fp);
  return OK;
}

//Prints error
char* printError(ICalErrorCode err){

  char *toReturn = malloc(sizeof(char) * 75); //Char to return

  //Switch statement for different errors
  switch(err){

    case OK:
    strcpy(toReturn, "Valid Calendar\n");
    break;

    case INV_FILE:
    strcpy(toReturn, "Invalid File\n");
    break;

    case INV_CAL:
    strcpy(toReturn, "Invalid Calendar\n");
    break;

    case INV_VER:
    strcpy(toReturn, "Invalid Version\n");
    break;

    case DUP_VER:
    strcpy(toReturn, "Duplicate Version\n");
    break;

    case INV_PRODID:
    strcpy(toReturn, "Invalid Product ID\n");
    break;

    case DUP_PRODID:
    strcpy(toReturn, "Duplicate Product ID\n");
    break;

    case INV_EVENT:
    strcpy(toReturn, "Invalid Event\n");
    break;

    case INV_DT:
    strcpy(toReturn, "Invalid DateTime\n");
    break;

    case INV_ALARM:
    strcpy(toReturn, "Invalid Alarm\n");
    break;

    case WRITE_ERROR:
    strcpy(toReturn, "Write Error\n");
    break;

    case OTHER_ERROR:
    strcpy(toReturn, "Other Error\n");
    break;

    default:
    strcpy(toReturn, "Error Not Found\n");
    break;

  }

  return toReturn; //Return char
}

//Compares two strings in a case insensitive way
int compareInsensitive(char *one, char *two){

  int min; //Stores min length
  int comp; //Stores compare value

  //Create temporary memory for capitalized strings
  char *tempOne = malloc(sizeof(char) * (strlen(one) + 1));
  char *tempTwo = malloc(sizeof(char) * (strlen(two) + 1));

  //Copy strings over
  strcpy(tempOne, one);
  strcpy(tempTwo, two);

  //Find which word is longer
  if( strlen(tempOne) < strlen(tempTwo) ){
    min = strlen(tempOne);
  }
  else min = strlen(tempTwo);

  //Set all to upper to compare
  for(int i = 0; i<min; i++){
    tempOne[i] = toupper(tempOne[i]);
    tempTwo[i] = toupper(tempTwo[i]);
  }

  comp = strcmp(tempOne, tempTwo); //Strcmp insensitive strings

  //Free allocated memory
  free(tempOne);
  free(tempTwo);

  return comp; //Return the result
}

bool isValidCalProperty(char *propName){

  if(compareInsensitive(propName, "CALSCALE") == 0) return true;
  else if(compareInsensitive(propName, "METHOD") == 0) return true;

  //Not a valid property
  return false;
}

bool isValidComponentProperty(char *propName, char *componentName){

  //Check all possible properties that can be in any component
  if(compareInsensitive(propName, "ATTACH") == 0) return true;
  else if(compareInsensitive(propName, "DESCRIPTION") == 0) return true;
  else if(compareInsensitive(propName, "SUMMARY") == 0) return true;
  //Date/Time components
  else if(compareInsensitive(propName, "DURATION") == 0) return true;
  //Relationship Components
  else if(compareInsensitive(propName, "ATTENDEE") == 0) return true;
  else if(compareInsensitive(propName, "RECCURENCE-ID") == 0) return true;

  //Properties that can only be in events
  if(strcmp(componentName, "VEVENT") == 0){
    if(compareInsensitive(propName, "CATEGORIES") == 0) return true;
    else if(compareInsensitive(propName, "CLASS") == 0) return true;
    else if(compareInsensitive(propName, "COMMENT") == 0) return true;
    else if(compareInsensitive(propName, "GEO") == 0) return true;
    else if(compareInsensitive(propName, "LOCATION") == 0) return true;
    else if(compareInsensitive(propName, "PRIORTY") == 0) return true;
    else if(compareInsensitive(propName, "RESOURCES") == 0) return true;
    else if(compareInsensitive(propName, "STATUS") == 0) return true;
    else if(compareInsensitive(propName, "DTEND") == 0) return true;
    else if(compareInsensitive(propName, "DTSTART") == 0) return true;
    else if(compareInsensitive(propName, "TRANSP") == 0) return true;
    else if(compareInsensitive(propName, "CONTACT") == 0) return true;
    else if(compareInsensitive(propName, "ORGANIZER") == 0) return true;
    else if(compareInsensitive(propName, "RELATED-TO") == 0) return true;
    else if(compareInsensitive(propName, "URL") == 0) return true;
    else if(compareInsensitive(propName, "UID") == 0) return true;
    else if(compareInsensitive(propName, "EXDATE") == 0) return true;
    else if(compareInsensitive(propName, "RDATE") == 0) return true;
    else if(compareInsensitive(propName, "RRULE") == 0) return true;
    else if(compareInsensitive(propName, "CREATED") == 0) return true;
    else if(compareInsensitive(propName, "DTSTAMP") == 0) return true;
    else if(compareInsensitive(propName, "LAST-MODIFIED") == 0) return true;
    else if(compareInsensitive(propName, "SEQUENCE") == 0) return true;
  }
  //Properties that can only be in alarms
  else if(strcmp(componentName, "VALARM") == 0){
    if(compareInsensitive(propName, "ACTION") == 0) return true;
    else if(compareInsensitive(propName, "REPEAT") == 0) return true;
    else if(compareInsensitive(propName, "TRIGGER") == 0) return true;
  }
  //Otherwise invalid property
  return false;
}

char *dtToJSON(DateTime dt){

  char *toReturn = malloc(sizeof(char) * 100);

  strcpy(toReturn, "{\"date\":\"");
  strcat(toReturn, dt.date);
  strcat(toReturn, "\",\"time\":\"");
  strcat(toReturn, dt.time);
  strcat(toReturn, "\",\"isUTC\":");
  if(dt.UTC){
    strcat(toReturn, "true}\0");
  }
  else{
    strcat(toReturn, "false}\0");
  }

  return toReturn;
}

char *eventToJSON(const Event* event){

  char *toReturn = malloc(sizeof(char) * 1000);
  char *dt;
  Node *node;
  Property *property;

  //If event is null
  if(event == NULL){
    strcpy(toReturn, "{}");
    return toReturn;
  }

  strcpy(toReturn, "{\"startDT\":");

  dt = dtToJSON(event->startDateTime);
  strcat(toReturn, dt);
  free(dt);

  strcat(toReturn, ",\"numProps\":");
  sprintf(toReturn + strlen(toReturn), "%d", event->properties->length + 3);
  strcat(toReturn, ",\"numAlarms\":");
  sprintf(toReturn + strlen(toReturn), "%d", event->alarms->length);
  strcat(toReturn, ",\"summary\":\"");

  //Go through list to find summary
  node = event->properties->head;
  while(node != NULL){
    property = node->data;

    //If found, add to string
    if(compareInsensitive(property->propName, "SUMMARY") == 0){
      strcat(toReturn, property->propDescr);
      break;
    }

    node = node->next;
  }

  strcat(toReturn, "\"}\0");

  return toReturn;
}

//Creates and returns JSON from an alarm
char *alarmToJSON(const Alarm *alarm){

  char *toReturn = malloc(sizeof(char) * 1000);

  //Check for NULL
  if(alarm == NULL){
    strcpy(toReturn, "{}");
    return toReturn;
  }

  //Build JSON
  strcpy(toReturn, "{\"action\":\"");
  strcat(toReturn, alarm->action);
  strcat(toReturn, "\",\"trigger\":\"");
  strcat(toReturn, alarm->trigger);
  strcat(toReturn, "\",\"numProps\":");
  sprintf(toReturn + strlen(toReturn), "%d", alarm->properties->length);

  strcat(toReturn, "}");

  return toReturn; //Return JSON
}

//Creates and returns a JSON from a property
char *propToJSON(const Property *prop){

  char *toReturn = malloc(sizeof(char) * 2000);

  //Check for NULL
  if(prop == NULL){
    strcpy(toReturn, "{}");
    return toReturn;
  }

  //Build JSON
  strcpy(toReturn, "{\"propName\":\"");
  strcat(toReturn, prop->propName);
  strcat(toReturn, "\",\"propDescr\":\"");
  strcat(toReturn, prop->propDescr);

  strcat(toReturn, "\"}");

  return toReturn; //Return JSON

}

//Creates and returns a list of properties in JSON format
char *propListToJSON(const List *propList){

  char *toReturn = malloc(sizeof(char) * 10000);
  char *propJSON; //Temp JSON of a property
  Node *node; //To iterate through properties

  //Check for NULL
  if(propList == NULL){
    strcpy(toReturn, "[]");
    return toReturn;
  }

  strcpy(toReturn, "[");

  //Go through all properties and add the JSON to the string
  node = propList->head;
  while(node != NULL){
    propJSON = propToJSON(node->data);
    sprintf(toReturn + strlen(toReturn), "%s,", propJSON);
    free(propJSON);
    node = node->next;
  }

  //If it's not empty, replace last comma
  if(toReturn[strlen(toReturn) - 1] != '['){
    toReturn[strlen(toReturn) - 1] = '\0';
  }
  strcat(toReturn, "]\0");

  return toReturn;

}

//Creates JSON from list of alarms
char *alarmListToJSON(const List *alarmList){

  char *toReturn = malloc(sizeof(char) * 5000);
  char *alarmJSON; //For individual alarm JSONs
  Node *node; //To iterate through alarms

  //Check for NULL
  if(alarmList == NULL){
    strcpy(toReturn, "[]");
    return toReturn;
  }

  strcpy(toReturn, "[");

  //Add all alarms to array
  node = alarmList->head;
  while(node != NULL){
    alarmJSON = alarmToJSON(node->data);
    sprintf(toReturn + strlen(toReturn), "%s,", alarmJSON);
    free(alarmJSON);
    node = node->next;
  }

  //If it's not empty, replace last comma
  if(toReturn[strlen(toReturn) - 1] != '['){
    toReturn[strlen(toReturn) - 1] = '\0';
  }
  strcat(toReturn, "]\0");

  return toReturn;
}

//Creates array of JSONs with events
char *eventListToJSON(const List *eventList){

  char *toReturn = malloc(sizeof(char) * 5000);
  char *eventJSON; //To store temp event JSON
  Node *node; //To iterate through events

  //Check for NULL
  if(eventList == NULL){
    strcpy(toReturn, "[]");
    return toReturn;
  }

  strcpy(toReturn, "[");

  //Add all events to array
  node = eventList->head;
  while(node != NULL){
    eventJSON = eventToJSON(node->data);
    sprintf(toReturn + strlen(toReturn), "%s,", eventJSON);
    free(eventJSON);
    node = node->next;
  }

  //If it's not empty, replace last comma
  if(toReturn[strlen(toReturn) - 1] != '['){
    toReturn[strlen(toReturn) - 1] = '\0';
  }
  strcat(toReturn, "]\0");

  return toReturn;
}

//Creates JSON from calendar
char *calendarToJSON(const Calendar *cal){

  char *toReturn = malloc(sizeof(char) * 1000);

  //Check for NULL
  if(cal == NULL){
    strcpy(toReturn, "{}");
    return toReturn;
  }

  //Build JSON
  strcpy(toReturn, "{\"version\":");
  sprintf(toReturn + strlen(toReturn), "%d", (int)cal->version);
  strcat(toReturn, ",\"prodID\":\"");
  sprintf(toReturn + strlen(toReturn), "%s", cal->prodID);
  strcat(toReturn, "\",\"numProps\":");
  sprintf(toReturn + strlen(toReturn), "%d", cal->properties->length + 2);
  strcat(toReturn, ",\"numEvents\":");
  sprintf(toReturn + strlen(toReturn), "%d", cal->events->length);
  strcat(toReturn, "}\0");

  return toReturn;
}

Calendar *JSONtoCalendar(const char *str){

  Calendar *temp;
  char *cur; //Stores version/prodID
  char *string;

  if(str == NULL || strcmp("", str) == 0){
    return NULL;
  }

  string  = malloc(sizeof(char) * (strlen(str) + 2));

  strcpy(string, str);
  //Allocates memory for Calendar and initilizes lists
  temp = malloc(sizeof(Calendar));
  temp->events = initializeList(printEvent, deleteEvent, compareEvents);
  temp->properties = initializeList(printProperty, deleteProperty, compareProperties);

  //Find version
  cur = strtok(string, ",");
  temp->version = atof(&cur[11]);

  //Find prodID by skipping 3 '"'
  cur = strtok(NULL, "\"");
  cur = strtok(NULL, "\"");
  cur = strtok(NULL, "\"");

  strcpy(temp->prodID, cur); //Copy it in

  free(string);
  return temp;
}

Event *JSONtoEvent(const char *str){

  Event *event = malloc(sizeof(Event));

  if(str == NULL){
    free(event);
    return NULL;
  }

  event->properties = initializeList(printProperty, deleteProperty, compareProperties);
  event->alarms = initializeList(printAlarm, deleteAlarm, compareAlarms);

  strcpy(event->UID, &str[8]);
  event->UID[strlen(event->UID) - 2] = '\0';

  return event;

}

//Makes JSON from a file
char *icalToJSON(char *filename){

  Calendar *temp = NULL;
  char *toReturn;
  ICalErrorCode err = OK;

  err = createCalendar(filename, &temp);

  if(err == OK) err = validateCalendar(temp); //Only validate if still OK

  //If okay JSON and return
  if(err == OK){
    toReturn = calendarToJSON(temp);
    deleteCalendar(temp); //Free memory
    return toReturn;
  }
  //Else free memory and return NULL
  else{
    return "";
  }

}

//Make eventList JSON from a file
char *eventListWrapper(char *filename){

  Calendar *temp = NULL;
  char *toReturn;
  ICalErrorCode err = OK;

  //Create and validate
  err = createCalendar(filename, &temp);
  if(err == OK) err = validateCalendar(temp); //Only validate if still OK

  //Return the JSON
  if(err == OK){
    toReturn = eventListToJSON(temp->events);
    deleteCalendar(temp);
    return toReturn;
  }
  else{
    return "";
  }
}

//Create alarmList JSON from filename
char *alarmListWrapper(char *filename, int eventNum){

  Calendar *temp = NULL;
  char *toReturn;
  Node *node;
  Event *tempEvent;
  ICalErrorCode err = OK;

  //Create and validate
  err = createCalendar(filename, &temp);
  if(err == OK) err = validateCalendar(temp); //Only validate if still OK

  if(err == OK){

    node = temp->events->head;

    //Find event
    for(int i = 0; i<eventNum-1; i++){

      if(node->next != NULL){
        node = node->next;
      }
    }

    tempEvent = node->data;

    //Get alarm list and return
    toReturn = alarmListToJSON(tempEvent->alarms);
    deleteCalendar(temp);
    return toReturn;
  }
  else{
    return "";
  }
}

//Get propertyList from filename
char *propListWrapper(char *filename, int eventNum){

  Calendar *temp = NULL;
  char *toReturn;
  Node *node;
  Event *tempEvent;
  ICalErrorCode err = OK;

  //Create and validate
  err = createCalendar(filename, &temp);
  if(err == OK) err = validateCalendar(temp); //Only validate if still OK

  if(err == OK){

    node = temp->events->head;

    //Get to right event
    for(int i = 0; i<eventNum-1; i++){

      if(node->next != NULL){
        node = node->next;
      }
    }

    tempEvent = node->data;

    //Get JSON
    toReturn = propListToJSON(tempEvent->properties);
    deleteCalendar(temp);
    return toReturn;
  }
  else{
    return "";
  }

}

//Creates calendar and returns if successful
bool calendarForm(char *filename, char *version, char *prodID, char *eventUID, char *eventSummary, char *startDT, char *creationDT){

  Calendar *cal = malloc(sizeof(Calendar));
  Event *event = initializeEvent();
  Property *prop = initializeProperty("SUMMARY", eventSummary);
  ICalErrorCode err;

  //Initialize cal
  cal->version = 0;
  cal->prodID[0] = '\0';
  cal->events = initializeList(printEvent, deleteEvent, compareEvents);
  cal->properties = initializeList(printProperty, deleteProperty, compareProperties);

  //Set version and prodID
  cal->version = atof(version);

  strcpy(cal->prodID, prodID);

  //Set Event UID, start DT and creation DT
  strcpy(event->UID, eventUID);
  setDateTime(&event->startDateTime, startDT);
  setDateTime(&event->creationDateTime, creationDT);

  //Insert summary if not empty
  if(strcmp(eventSummary, "") != 0) insertBack(event->properties, prop);

  insertBack(cal->events, event); //Insert event

  //Validate, write to file then delete
  err = validateCalendar(cal);
  writeCalendar(filename, cal);

  deleteCalendar(cal);

  //Return if passed or not
  if(err == OK) return true;
  else return false;

}

//Adds event to calendar
void addEventToCal(char *filename, char *uid, char *summary, char *startDT, char *creationDT){

  Calendar *cal = NULL;
  Event *event = initializeEvent();
  Property *prop = initializeProperty("SUMMARY", summary);
  ICalErrorCode err;

  //Create calendar
  createCalendar(filename, &cal);

  //Set Event UID, start DT and creation DT
  strcpy(event->UID, uid);
  setDateTime(&event->startDateTime, startDT);
  setDateTime(&event->creationDateTime, creationDT);

  //Insert summary if not empty
  if(strcmp(summary, "") != 0) insertBack(event->properties, prop);

  insertBack(cal->events, event); //Insert event

  //Make sure valid
  err = validateCalendar(cal);


  //If OK, write to file
  if(err == OK){
    writeCalendar(filename, cal);
  }

  deleteCalendar(cal);
  return;
}
