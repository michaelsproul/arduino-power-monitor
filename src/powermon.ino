#include <SoftwareSerial.h>
#include <SPI.h>
#include <Ethernet.h>
#include <HttpClient.h>
#include <Cosm.h>
#include <ByteBuffer.h>

#include "xively_pass.h"

#define CC_RX 7
#define CC_TX 8
#define CC_BAUD 57600
#define DELAY 0

#define F_CPU 20000000

/* MAC address for the Ethernet shield */
byte mac[] = { 0x90, 0xA2, 0xDA, 0x00, 0x02, 0xC4 };

byte ip[] = { 192, 168, 1, 212 };

/* Your Cosm key to let you upload data */
char cosmKey[] = COSM_KEY;

/* Analog pin which we're monitoring (0 and 1 are used by the Ethernet shield) */
int sensorPin = 2;

/* Define the strings for our datastream IDs */
char tempId[] = "0";
char powerId[] = "1";
char testId[] = "test";
CosmDatastream datastreams[] = {
	CosmDatastream(tempId, strlen(tempId), DATASTREAM_FLOAT),
	CosmDatastream(powerId, strlen(powerId), DATASTREAM_INT),
	CosmDatastream(testId, strlen(testId), DATASTREAM_FLOAT),
};

/* Finally, wrap the datastreams into a feed */
CosmFeed feed(FEED_ID, datastreams, 3);

EthernetClient client;
CosmClient cosmclient(client);

/* Create an object for the serial connection to the current cost meter */
SoftwareSerial ccSerial(CC_RX, CC_TX);

/* Byte buffer stuff */
ByteBuffer buffer;

/* State stuff, courtesy of Brian Lee (best guy ever!) */
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

#define MAX_TAG_LENGTH      16
char currentStartTag[MAX_TAG_LENGTH] = "";
char currentEndTag[MAX_TAG_LENGTH] = "";
char currDataBlock[MAX_TAG_LENGTH] = "";
int lastReadDSB = 0;
char lastReadTime[MAX_TAG_LENGTH] = "";
float lastReadTemp = 0;
char lastReadTemp_b[MAX_TAG_LENGTH] = "";
int lastReadWatts = 0;
char lastReadWatts_b[MAX_TAG_LENGTH] = "";
int lastReadSensor = 0;
char lastReadSensor_b[MAX_TAG_LENGTH] = "";

void lostMyWay()
{
	currentStartTag[0] = NULL;
	currentEndTag[0] = NULL;
	currDataBlock[0] = NULL;
	changeState(WAITING_FOR_START_TAG);
}

int appendCharToString(char *str, char chr)
{
	int strlength = strlen(str);
	if (strlength >= MAX_TAG_LENGTH)
		return 0;
	char *endPoint = str + strlength;
	*endPoint = chr;
	*(endPoint + 1) = NULL;
	return strlength + 1;
}

void processWaitingForStartTag(char inChar)
{
	if (inChar == '<') {
		changeState(IN_START_TAG);
		currentStartTag[0] = NULL;
		currentEndTag[0] = NULL;
		currDataBlock[0] = NULL;
	}
}

void processInStartTag(char inChar)
{
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
			lostMyWay();	// or don't care about found tag
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
void processInEndTag(char inChar)
{
	if (inChar == '>') {
		if (strcmp(currentEndTag, "msg") == 0) {
			changeState(IN_MSG_WRAP_UP);
		} else if (strcmp(currentEndTag, "dsb") == 0) {
			lastReadDSB = atoi(currDataBlock);
			lostMyWay();	// an easy way to reset
		} else if (strcmp(currentEndTag, "time") == 0) {
			strcpy(lastReadTime, currDataBlock);
			lostMyWay();	// an easy way to reset
		} else if (strcmp(currentEndTag, "tmpr") == 0) {
			strcpy(lastReadTemp_b, currDataBlock);
			lastReadTemp = atof(currDataBlock);
			lostMyWay();	// an easy way to reset
		} else if (strcmp(currentEndTag, "watts") == 0) {
			strcpy(lastReadWatts_b, currDataBlock);
			lastReadWatts = atoi(currDataBlock);
			lostMyWay();	// an easy way to reset
		} else if (strcmp(currentEndTag, "sensor") == 0) {
			strcpy(lastReadSensor_b, currDataBlock);
			lastReadSensor = atoi(currDataBlock);
			lostMyWay();	// an easy way to reset
		} else {
/*
        Serial.print("currentEndTag:");
        Serial.print(currentEndTag);
        Serial.print("\t");
        Serial.print(currDataBlock);
        Serial.println(".");
*/
			lostMyWay();	// an easy way to reset
		}
	} else {
		int len = appendCharToString(currentEndTag, inChar);
		if (len == 0) {
			lostMyWay();
		}
	}
}

void processDataBlock(char inChar)
{
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

int wattsBySensorId[10] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };

void processMsgWrapUp()
{
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
	datastreams[2].setFloat(lastReadWatts);
	int ret = cosmclient.put(feed, cosmKey);
	Serial.print("Sent data point to Cosm:");
	Serial.println(lastReadWatts);
	Serial.print("Cosm client return value: ");
	Serial.print(ret);
	changeState(WAITING_FOR_START_TAG);
}

void processNextChar(char inChar)
{
	Serial.print(inChar);
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

void changeState(int newState)
{
	state = newState;
	Serial.print("new state=");
	Serial.println(state);
}

void setup()
{
	/* Initialise PC to Arduino serial */
	Serial.begin(9600);
	Serial.println("CurrentCost to Cosm via Arduino. By Brian Lee");
	Serial.println();
	/* Initialise Arduino to CurrentCost meter serial */
	ccSerial.begin(CC_BAUD);

	/* Initialise the buffer */
	buffer.init(700);

	/* Connect ethernet */
	Ethernet.begin(mac, ip);
	Serial.println("Ethernet connected successfully");
}

void loop()
{
	/*
	float value = 19.91;
	datastreams[0].setFloat(value);
	int ret = cosmclient.put(feed, cosmKey);
	Serial.print("Cosm client returned ");
	Serial.println(ret);
	delay(30000);
	*/
	if (ccSerial.available()) {
		char c = ccSerial.read();
		Serial.print(c);
	}
	/*
	if (buffer.getSize() > 0 ) {
		char chr = buffer.get();
		processNextChar(chr);
	} */
}
