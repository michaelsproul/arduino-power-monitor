#include <SoftwareSerial.h>
#define _SS_MAX_RX_BUFFER 128

SoftwareSerial ccSerial(2,3);
char buffer[256];
int i = 0;
char c;
int timer = 0;
boolean overflowed = false;

void setup()
{
	Serial.begin(9600);
	ccSerial.begin(57600);
}

void loop()
{
	while (ccSerial.available())
	{
		c = (char) ccSerial.read();
		Serial.print(c);
	}
}

/* This is horrible and dirty */
void old_loop()
{
	overflowed = false;

	if (ccSerial.available())
	{
		while (ccSerial.available())
		{
			c = (char) ccSerial.read();
			buffer[i] = c;
			i++;
		}
	}

	if (ccSerial.overflow())
	{
		overflowed = true;
	}

	timer++;

	/* Every five loops, check for data and perform work */
	if (timer == 5)
	{
		Serial.print("Timer reset");
		/* Reset counter to 0 */
		timer = 0;

		/* If the buffer is empty, do nothing */
		if (i == 0)
		{
			/* nothing */
		}
		else if (overflowed)
		{
			/* nothing */
		}
		else
		{
			/* Print the buffer */
			int last = i;
			for (i = 0; i < last; i++)
			{
				Serial.print(buffer[i]);
			}

			/* Reset the buffer */
			i = 0;
		}
	}
}
