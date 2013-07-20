#include <SoftwareSerial.h>
#include <Ethernet.h>

#include "auth.h"

/* Current Cost serial details */
/* Note: make sure the port isn't being used by the ethernet bridge! */
#define CC_RX 2
#define CC_TX 3
#define CC_BAUD 57600

/* Thingspeak details (API key is in auth.h) */
#define THINGSPEAK_URL "api.thingspeak.com"

/* The size of the buffer that messages are read onto */
/* (should fit a whole message) */
#define BUFFER_SIZE 512

/* Max time to wait between bits of a message (milliseconds) */
#define MSG_DELAY 400

/* ~~~~~~~~~~~~~~~~ */
/* Global Variables */
/* ~~~~~~~~~~~~~~~~ */

/* Networking details (add your ethernet shield's MAC address) */
byte mac[] = {0x90, 0xA2, 0xDA, 0x00, 0x02, 0xC4};
byte ip[] = {192, 168, 1, 224};
byte gateway[] = {192, 168, 1, 254};
EthernetClient client;

/* Software serial connection for the power meter */
SoftwareSerial ccSerial(CC_RX, CC_TX);

/* Message buffer & its counter */
char buffer[BUFFER_SIZE];
int i = 0;

/* The time of the last read from the SoftwareSerial */
unsigned long t_lastread = 0;

/* Are we waiting for a message? Did a buffer overflow? */
boolean waiting = true;
boolean overflowed = false;

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
	Serial.print("Software serial buffer size: ");
	Serial.println(_SS_MAX_RX_BUFF);
	Serial.print("Message buffer size: ");
	Serial.println(BUFFER_SIZE);
}

/* All the real work is in the xml processor */
#include "xmlproc.h"

void loop()
{
	/*
	 * The incoming message appears on the SoftwareSerial buffer
	 * in several parts separated by small time intervals.
	 * Wait for the whole message to arrive before processing
	 */
	while ((millis() - t_lastread < MSG_DELAY || waiting) && !overflowed)
	{
		if (ccSerial.available())
		{
			while (ccSerial.available())
			{
				if (i == BUFFER_SIZE)
				{
					overflowed = true;
					break;
				}

				buffer[i] = (char) ccSerial.read();
				i++;
			}

			if (waiting) { waiting = false; }

			t_lastread = millis();
		}
	}

	/* Respond to buffer overflows, process the message */
	if (overflowed || ccSerial.overflow())
	{
		Serial.println("Historical data received");
	}
	else
	{
		/* Process the message */
		for (int j = 0; j < i; j++)
		{
			process_char(buffer[j]);
		}
	}

	/* Reset */
	i = 0;
	waiting = true;
	overflowed = false;

	/* Reconnect to the network if neccessary */
	if (failed_connections > 3)
	{
		Serial.println("Resetting ethernet connection");
		client.stop();
		Ethernet.begin(mac, ip, gateway, gateway);
	}
}
