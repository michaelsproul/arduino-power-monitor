

void lostMyWay() {   // <- get here if parsing gets lost
    currentStartTag[0] = NULL;
    currentEndTag[0] = NULL;
    currDataBlock[0] = NULL;
    changeState(WAITING_FOR_START_TAG);
}

int appendCharToString(char * str, char chr) {
  int strlength = strlen(str);
  if (strlength >= MAX_TAG_LENGTH) 
      return 0;
  char * endPoint = str + strlength;
  *endPoint = chr;
  *(endPoint + 1) = NULL;
//  Serial.print(str);
  return strlength + 1;
}

void processWaitingForStartTag(char inChar) {
  if (inChar == '<') {
    changeState(IN_START_TAG);
    currentStartTag[0] = NULL;
    currentEndTag[0] = NULL;
    currDataBlock[0] = NULL;
  }
}


void processInStartTag(char inChar) {
  if (inChar == '/') {
      if (strlen(currentEndTag) == 0) {
         changeState(IN_END_TAG);
      } else {
        lostMyWay();
      }
    } else if (inChar == '>') {
      if (strcmp(currentStartTag, "tmpr") == 0) {
        changeState(IN_TMPR_BLOCK);
      } else if (strcmp(currentStartTag, "dsb") == 0) {
        changeState(IN_DSB_BLOCK);
      } else if (strcmp(currentStartTag, "time") == 0) {
        changeState(IN_TIME_BLOCK);
      } else if (strcmp(currentStartTag, "watts") == 0) {
        changeState(IN_WATTS_BLOCK);
      } else if (strcmp(currentStartTag, "sensor") == 0) {
        changeState(IN_SENSOR_TAG);
      } else {
        lostMyWay();   // or don't care about found tag
      }      
    } else {
      int len = appendCharToString(currentStartTag, inChar);
      if (len == 0) {
        lostMyWay();
      }
    }
}


/**
* At this stage end tag processing will be simple.
* We will assume any non-end-msg flag can be ignored
*/
void processInEndTag(char inChar) {
  if (inChar == '>') {
      if (strcmp(currentEndTag, "msg") == 0) {
         changeState(IN_MSG_WRAP_UP);
      } else if (strcmp(currentEndTag, "dsb") == 0) {
         lastReadDSB = atoi(currDataBlock);
         lostMyWay();  // an easy way to reset
      } else if (strcmp(currentEndTag, "time") == 0) {
         strcpy(lastReadTime, currDataBlock);
         lostMyWay();  // an easy way to reset
      } else if (strcmp(currentEndTag, "tmpr") == 0) {
         strcpy(lastReadTemp_b, currDataBlock);
         lastReadTemp = atof(currDataBlock);
         lostMyWay();  // an easy way to reset
      } else if (strcmp(currentEndTag, "watts") == 0) {
         strcpy(lastReadWatts_b, currDataBlock);
         lastReadWatts = atoi(currDataBlock);
         lostMyWay();  // an easy way to reset
      } else if (strcmp(currentEndTag, "sensor") == 0) {
         strcpy(lastReadSensor_b, currDataBlock);
         lastReadSensor = atoi(currDataBlock);
         lostMyWay();  // an easy way to reset
      } else  {
/*
        Serial.print("currentEndTag:");
        Serial.print(currentEndTag);
        Serial.print("\t");
        Serial.print(currDataBlock);
        Serial.println(".");
*/
        lostMyWay();  // an easy way to reset
      } 
  } else {
      int len = appendCharToString(currentEndTag, inChar);
      if (len == 0) {
        lostMyWay();
      }
  }
}

void processDataBlock(char inChar) {  
   if (inChar == '<') {
      changeState(IN_START_TAG);
   } else if (inChar == '>') {
      lostMyWay();
   } else {
      int len = appendCharToString(currDataBlock, inChar);
      if (len == 0) {
        lostMyWay();
      }
   }
}

int wattsBySensorId[10] = {0,0,0,0,0,0,0,0,0,0};


void processMsgWrapUp() { 
    wattsBySensorId[lastReadSensor] = lastReadWatts;
    Serial.print(lastReadDSB);
    Serial.print("\t");
    Serial.print(lastReadTime);
    Serial.print("\t");
    Serial.print(lastReadTemp);
    Serial.print("\t");
    Serial.print(lastReadSensor);
    Serial.print("\t");
    Serial.print(lastReadWatts);
    Serial.print("\t");
    Serial.println("done");
    sendData();  
    changeState(WAITING_FOR_START_TAG);
}

  
void processNextChar(char inChar) {
//    Serial.print(inChar, BYTE);
    switch (state) {
      case WAITING_FOR_START_TAG:
          processWaitingForStartTag(inChar);
          break;
      case IN_START_TAG:
          processInStartTag(inChar);
          break;
      case IN_END_TAG:
          processInEndTag(inChar);
          break;
      case IN_TMPR_BLOCK:
      case IN_DSB_BLOCK:
      case IN_TIME_BLOCK:
      case IN_SENSOR_TAG:
      case IN_WATTS_BLOCK:
          processDataBlock(inChar);
          break;
      default:
          break;
    }
    if (state == IN_MSG_WRAP_UP) {
          processMsgWrapUp();
    }
}

void changeState(int newState) {
    state = newState;
//    Serial.print("new state=");
//    Serial.println(state);
}

