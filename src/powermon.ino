#include <SoftwareSerial.h>
#include <SPI.h>
#include <Ethernet.h>
#include <HttpClient.h>
#include <ByteBuffer.h>
#include <Xively.h>

#include "xively_pass.h"

/* Current Cost serial details */
#define CC_RX 7
#define CC_TX 8
#define CC_BAUD 57600
#define DELAY 0

/* Arduino processor speed (Hz) */
#define F_CPU 20000000

/* ~~~~~~~~~~~~~~~~ */
/* Global Variables */
/* ~~~~~~~~~~~~~~~~ */

/* Networking details (add your ethernet shield's MAC address) */
byte mac[] = { 0x90, 0xA2, 0xDA, 0x00, 0x02, 0xC4 };
byte ip[] = { 192, 168, 1, 212 };

/* Analog pin which we're monitoring (0 and 1 are used by the Ethernet shield) */
int sensorPin = 2;

/* Define datastreams */
char powerId[] = "Power";
XivelyDatastream datastreams[] =
{
	XivelyDatastream(powerId, strlen(powerId), DATASTREAM_INT),
};

/* Wrap the datastreams into a feed */
XivelyFeed feed(FEED_ID, datastreams, 1);

EthernetClient client;
XivelyClient xivelyclient(client);

/* The software serial connection between the Arduino and the meter */
SoftwareSerial ccSerial(CC_RX, CC_TX);

/* A byte buffer to store the XML data as it's processed */
ByteBuffer buffer;

/* ~~~~~~~~~~~~ */
/* Program Body */
/* ~~~~~~~~~~~~ */

#include "processing.h"

void setup()
{
	/* Initialise PC to Arduino serial */
	Serial.begin(9600);
	Serial.println("CurrentCost to Xively via Arduino. By Brian Lee");
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
	int ret = xivelyclient.put(feed, XIVELY_KEY);
	Serial.print("Xively client returned ");
	Serial.println(ret);
	delay(30000);
	*/
	if (ccSerial.available())
	{
		char c = ccSerial.read();
		Serial.print(c);
	}
	/*
	if (buffer.getSize() > 0 )
	{
		char chr = buffer.get();
		processNextChar(chr);
	} */
}
