 /*
  Cosm sensor client
 
 This sketch connects an analog sensor to Cosm (http://www.cosm.com)
 using a Wiznet Ethernet shield. You can use the Arduino Ethernet shield, or
 the Adafruit Ethernet shield, either one will work, as long as it's got
 a Wiznet Ethernet module on board.
 
 This example has been updated to use version 2.0 of the Cosm.com API. 
 To make it work, create a feed with a datastream, and give it the ID
 sensor1. Or change the code below to match your feed.
 
 
 Circuit:
 * Analog sensor attached to analog in 0
 * Ethernet shield attached to pins 10, 11, 12, 13
 
 created 15 March 2010
 updated 16 Mar 2012
 by Tom Igoe with input from Usman Haque and Joe Saavedra
 
http://arduino.cc/en/Tutorial/PachubeClient
 This code is in the public domain.
 
 */




unsigned long lastConnectionTime = 0;          // last time you connected to the server, in milliseconds
boolean lastConnected = false;                 // state of the connection last time through the main loop
const unsigned long postingInterval = 5*1000; //delay between updates to Cosm.com



char httpData[50];   //buffer size=5 * 1,10000crlf

// this method makes a HTTP connection to the server:
void sendData() {
    //////////////////////////////////////////////////
    if (millis() < (lastConnectionTime+postingInterval)) {
      return;
    }
    strcpy(httpData, "0,");
    strcat(httpData, lastReadTemp_b);
    strcat(httpData, "\r\n");
    strcat(httpData, "1,");
    itoa(wattsBySensorId[0], (httpData+strlen(httpData)) , 10 );
    strcat(httpData, "\r\n");
    strcat(httpData, "2,");
    itoa(wattsBySensorId[1], (httpData+strlen(httpData)) , 10 );
    strcat(httpData, "\r\n");
    strcat(httpData, "3,");
    itoa(wattsBySensorId[2], (httpData+strlen(httpData)) , 10 );
    strcat(httpData, "\r\n");
    strcat(httpData, "4,");
    itoa(wattsBySensorId[3], (httpData+strlen(httpData)) , 10 );
    Serial.println(httpData);
    client.stop();  //force a close to prep for a new connection
    //////////////////////////////////////////////////
  
  if (client.connect()) {   // if there's a successful connection:
    Serial.println("connecting...");
    // send the HTTP PUT request:
    client.print("PUT /v2/feeds/");
    client.print(FEEDID);
    client.println(".csv HTTP/1.1");
    client.println("Host: api.cosm.com");
    client.print("X-ApiKey: ");
    client.println(APIKEY);
    client.print("User-Agent: ");
    client.println(USERAGENT);
    
    client.print("Content-Length: ");    
    client.println(strlen(httpData)+2);   //+2 for the extra trailing crlf
    client.println("Content-Type: text/csv");
    client.println("Connection: close");
    client.println();
    client.println(httpData);


  }  else {
    // if you couldn't make a connection:
    Serial.println("connection failed");
    Serial.println();
    Serial.println("disconnecting.");
    client.stop();
  }
   // note the time that the connection was made or attempted:
  lastConnectionTime = millis();
}



