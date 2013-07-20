#include <SoftwareSerial.h>
#define BUFFER_SIZE 512

/* Max time to wait between bits of a message (milliseconds) */
#define MSG_DELAY 400

SoftwareSerial ccSerial(2,3);
char buffer[BUFFER_SIZE];
unsigned long t_lastread = 0;
int i = 0;
boolean waiting = true;
boolean overflowed = false;

void setup()
{
	Serial.begin(9600);
	ccSerial.begin(57600);
}

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

	if (overflowed || ccSerial.overflow())
	{
		Serial.println("A buffer overflowed.");
	}

	/* Process the message */
	for (int j = 0; j < i; j++)
	{
		Serial.print(buffer[j]);
	}

	/* Reset */
	i = 0;
	waiting = true;
	overflowed = false;
}
