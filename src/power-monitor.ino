#include <mSoftwareSerial.h>
#include <Ethernet.h>
#include <HttpClient.h>
#include <Xively.h>

#include "xively-pass.h"

/* Current Cost serial details */
#define CC_RX 2
#define CC_TX 3
#define CC_BAUD 57600

/* ~~~~~~~~~~~~~~~~ */
/* Global Variables */
/* ~~~~~~~~~~~~~~~~ */

/* Networking details (add your ethernet shield's MAC address) */
byte mac[] = { 0x90, 0xA2, 0xDA, 0x00, 0x02, 0xC4 };
byte ip[] = { 192, 168, 1, 212 };

/* Define datastreams */
char power_id[] = "Power";
char peak_power_id[] = "PeakPower";
char offpeak_power_id[] = "OffPeakPower";
char temp_id[] = "Temperature";

XivelyDatastream datastreams[] =
{
	XivelyDatastream(power_id, strlen(power_id), DATASTREAM_INT),
	XivelyDatastream(peak_power_id, strlen(peak_power_id), DATASTREAM_INT),
	XivelyDatastream(offpeak_power_id, strlen(offpeak_power_id), DATASTREAM_INT),
	XivelyDatastream(temp_id, strlen(temp_id), DATASTREAM_INT),
};

/* Wrap the datastreams into a feed */
XivelyFeed feed(FEED_ID, datastreams, 4);

/* Xively web client */
EthernetClient client;
XivelyClient xivelyclient(client);

/* Software serial connection for the power meter */
mSoftwareSerial ccSerial(CC_RX,CC_TX);

char current_char;

void setup()
{
	Serial.begin(9600);
	Serial.println("Arduino Power Monitor, by Brian Lee & Michael Sproul");
	Serial.println();

	/* Initialise Arduino to CurrentCost meter serial */
	ccSerial.begin(CC_BAUD);

	/* Connect ethernet */
	// Ethernet.begin(mac, ip);
	// Serial.println("Ethernet connected successfully");
}

#include "xmlproc.h"

void loop()
{
	while (ccSerial.available())
	{
		current_char = (char) ccSerial.read();
		process_char(current_char);
	}
	/* Todo: deal with overflow */
}
