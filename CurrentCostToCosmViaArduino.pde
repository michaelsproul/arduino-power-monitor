

/**
* Copyright (C) Brian Lee 2011,2012


History
=====================================================
25/Sept/2012:  doing edit for ip addr of api.cosm.com to 64.94.18.121
27/10/2012:  Adding IAM monioting. Now need to track the <SENSOR> tag

Some notes:
===========
* designed to run on an Etherten board from freetronics
* Using a Freetronics Etherten with PoE 
* CurrentCost wires on RJ45 are:  pin-4 BLUE Ground and pin-8 BROWN signal
* CurrentCost signal 57600 Baud
* LED heart-beat LED annode on pin-5, cathode to gnd via 270k 
* 

How to Setup:
============
1) Setup your IP arduino's IP address
   This sketch does not use DHCP. It must be allocated an IP address on the network
   go edit the array:  byte ip[] = {192,168,14,198} in this file
   
2) Setup a cosm feed.
   Go to www.cosm.com, setup a login and feed, as per the instructions on the site
   
3) cosm username, password and feed id.
   There is a file: cosmPassword_example.pde.
   copy this file to: cosmPassword.pde
   Update the entries in this file from step 2 above.
   
*/
#include <SoftwareSerial.h>
#include <SPI.h>
#include <Ethernet.h>
#include <ByteBuffer.h>
#include <avr/wdt.h>
#include <EEPROM.h>

#define BLINK_LED 5
#define rxPin 6
#define txPin 7
// #define ledPin  9

// #define SERVER_PORT  80


/*
Note Ethernet board uses pins:
4   sd-memory
10  ethernet
11  ethernet 
12  ethernet
13 (SPI)  ethernet

Serial interface interface:
5
6   Rx (in)
7   Tx (out)

Info:
9   Blink LED
A0  temp1
A1  temp2
A2  temp3
*/


ByteBuffer buffer;
int inByte;

#define  WAITING_FOR_START_TAG   0
#define  IN_START_TAG            10
#define  IN_MSG_BLOCK            20
#define  IN_DSB_BLOCK            25
#define  IN_TIME_BLOCK           30
#define  IN_END_TAG              40
#define  IN_TMPR_BLOCK           50
#define  IN_WATTS_BLOCK          60
#define  IN_MSG_WRAP_UP          70
#define  IN_SENSOR_TAG           80

int state = WAITING_FOR_START_TAG;

#define MAX_TAG_LENGTH      10
char  currentStartTag[MAX_TAG_LENGTH] = "";
char  currentEndTag[MAX_TAG_LENGTH] = "";
char  currDataBlock[MAX_TAG_LENGTH] = "";
int lastReadDSB = 0;
char lastReadTime[MAX_TAG_LENGTH] = "";
float lastReadTemp = 0;
char  lastReadTemp_b[MAX_TAG_LENGTH] = "";
int lastReadWatts = 0;
char  lastReadWatts_b[MAX_TAG_LENGTH] = "";
int lastReadSensor = 0;
char  lastReadSensor_b[MAX_TAG_LENGTH] = "";

unsigned int bootCount = 0;

SoftwareSerial ccSerial(rxPin, txPin); // RX, TX

/**********************************
Ethernet things
**********************************/
// assign a MAC address for the ethernet controller.
// Newer Ethernet shields have a MAC address printed on a sticker on the shield
// fill in your address here:
byte mac[] = { 0xc0, 0x44, 0xe4, 0x40, 0xc0, 0x54};

// fill in an available IP address on your network here,
// for manual configuration:
byte ip[] = {192,168,14,198};
// if you don't want to use DNS (and reduce your sketch size)
// use the numeric IP instead of the name for the server:
//      25/9/2012  byte server[] = {216,52,233,121};      // numeric IP for api.cosm.com
byte server[] = {64,94,18,121};      // numeric IP for api.cosm.com
//char server[] = "api.cosm.com";   // name address for cosm API
// initialize the library instance:
Client client(server, 80);

/**********************************
Pachube things
**********************************/
// This stuff moved to cosmPassword_example.pde
// cosmPassword_example.pde is checked into git 
// copy cosmPassword_example.pde to cosmPassword.pde and edit for your personal settings
// cosmPassword.pde is not checked into GIT.


/**********************************
Blinking Pin-13. Debug only
May be setup a LED on a spare pin ?
Can't use PIN13 as it's used by etherten.
**********************************/
int loopCount = 0;
boolean ledOn = false;

void blink() {
  loopCount += 1;
  if (loopCount > 20000) {
    ledOn = ! ledOn;
    loopCount =0;
    if (ledOn) {
      digitalWrite(BLINK_LED, HIGH);
    } else {
      digitalWrite(BLINK_LED, LOW);
    }
  }
}

void setup() {
  wdt_disable();  
  pinMode(BLINK_LED, OUTPUT);     
  // initialize both serial ports:
  Serial.begin(57600);
    //inc the boot counter in EEPROM
  unsigned int lowVal = EEPROM.read(0);
  unsigned int highVal = EEPROM.read(1);
  lowVal++;
  if (lowVal >255) {
    lowVal = 0;
    highVal +=1;
    EEPROM.write(1, highVal);
  }
  EEPROM.write(0, lowVal);
  bootCount = (256*highVal)+lowVal;
  Serial.println("CurrentCost128 to Cosm bridge.  Copyright (C) Brian Lee 2013");
  Serial.println("Last updated 27/Oct/2012");
  Serial.println("This sketch= CurrentCostToCosmViaArduino");
  Serial.println("This device: 192,168,14,198");    
  Serial.println("api.cosm.com=64.94.18.121");
  Serial.print("boot count=");
  Serial.println(bootCount);

  ccSerial.begin(57600);
  buffer.init(700);
  Ethernet.begin(mac, ip);
  wdt_enable(WDTO_8S);   // start the watchdog
}

void loop() {
  blink();
  while (ccSerial.available()) {
    buffer.put(ccSerial.read());
  } 
  // if there's incoming data from the net connection.
  // send it out the serial port.  This is for debugging
  // purposes only:
  if (client.available()) {
    char c = client.read();
    Serial.print(c);
  }

  if (buffer.getSize() > 0 ) {
    char chr= buffer.get();
    processNextChar(chr);
  }
  wdt_reset();       // WDT reset   12/6/2012
} //loop


