#include <SoftwareSerial.h>
#include <Ethernet.h>

#include "auth.h"

/* The current cost bridge just reads from the regular Serial @ 57600bps */
#define CC_BAUD 57600

/* The ethernet control pin, write HIGH to enable */
#define ETH_PIN 7

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
byte mac[] = {0x90, 0xA2, 0xDA, 0x00, 0x03, 0xC5};
byte ip[] = {192, 168, 1, 224};
byte gateway[] = {192, 168, 1, 254};
EthernetClient client;

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
	/* Initialise Arduino to CurrentCost meter serial */
	Serial.begin(CC_BAUD);

	/* Enable the ethernet chip and connect to the network */
	pinMode(ETH_PIN, OUTPUT);
	digitalWrite(ETH_PIN, HIGH);
	Ethernet.begin(mac, ip, gateway, gateway);
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
		if (Serial.available())
		{
			while (Serial.available())
			{
				if (i == BUFFER_SIZE)
				{
					overflowed = true;
					break;
				}

				buffer[i] = (char) Serial.read();
				i++;
			}

			if (waiting) { waiting = false; }

			t_lastread = millis();
		}
	}

	/* Respond to buffer overflows, process the message */
	if (overflowed)
	{
		/* Do nothing, lol */
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
		client.stop();
		Ethernet.begin(mac, ip, gateway, gateway);
	}
}
