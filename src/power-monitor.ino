#include <SoftwareSerial.h>
#define _SS_MAX_RX_BUFF 128
#include <Ethernet.h>
#include <HttpClient.h>

#include "auth.h"

/* Current Cost serial details */
#define CC_RX 2
#define CC_TX 3
#define CC_BAUD 57600

/* Thingspeak details (API key is in auth.h) */
#define THINGSPEAK_URL "api.thingspeak.com"

/* ~~~~~~~~~~~~~~~~ */
/* Global Variables */
/* ~~~~~~~~~~~~~~~~ */

/* Networking details (add your ethernet shield's MAC address) */
byte mac[] = {0x90, 0xA2, 0xDA, 0x00, 0x02, 0xC4};
byte ip[] = {192, 168, 1, 212};
byte gateway[] = {192, 168, 1, 254};
EthernetClient client;

/* Software serial connection for the power meter */
SoftwareSerial ccSerial(CC_RX,CC_TX);

char current_char;

/* ~~~~~~~~~~~~ */
/* Program Body */
/* ~~~~~~~~~~~~ */

void setup()
{
	Serial.begin(9600);
	Serial.println("Arduino Power Monitor, by Brian Lee & Michael Sproul");

	/* Initialise Arduino to CurrentCost meter serial */
	ccSerial.begin(CC_BAUD);

	/* Connect ethernet */
	Ethernet.begin(mac, ip, gateway, gateway);
	Serial.print("Using a buffer size of ");
	Serial.println(_SS_MAX_RX_BUFF);
}

#include "xmlproc.h"

void loop()
{
	/* If the buffer overflows, ignore the data */
	/* (This is to deal with the 'historic' data sets) */
	if (ccSerial.overflow())
	{
		state = DEFAULT_STATE;
		while (ccSerial.available())
		{
			ccSerial.read();
		}
	}

	while (ccSerial.available())
	{
		current_char = (char) ccSerial.read();
		process_char(current_char);
	}

	/* Reconnect if neccessary */
	if (failed_connections > 3)
	{
		Serial.println("Resetting ethernet connection");
		client.stop();
		Ethernet.begin(mac, ip, gateway, gateway);
	}
}
