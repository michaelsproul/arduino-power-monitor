#ifndef _XMLPROC
#define _XMLPROC

#define BUF_SIZE 30

#define IN_START_TAG 0
#define IN_END_TAG 10
#define IN_TAG_BODY 20
#define DEFAULT_STATE 30
#define IN_GENERIC_TAG 40

/* How many points to collect before uploading */
#define UPDATE_INTERVAL 4

/* Data containers */
int temp;
int peakpower;
int offpeakpower;

/* Cumulative data, gets averaged on upload */
int c_temp;
int c_peak;
int c_offpeak;

/* Processing variables */
int state = DEFAULT_STATE;
int in_good_tag = 0;
char desired_data[BUF_SIZE];
char current_tag[BUF_SIZE];

/* Variables to track the cycling through temp, peak, offpeak */
char temp_tag[] = "tmpr";
char power_tag[] = "watts";
char *desired_tag = temp_tag;
boolean onpeak = false;
int cycle_pos = 1;

/* The formatted upload string */
char fdata[50];

/* Track connection quality */
int failed_connections = 0;

/* --------------------------- */

/* A function to format the data for the HTTP request */
void format_data()
{
	int total = peakpower + offpeakpower;
	snprintf(fdata, 50, "field1=%d&field2=%d&field3=%d&field4=%d",
				total, peakpower, offpeakpower, temp);
}

/* A function to upload the data to ThingSpeak */
void upload_data()
{
	format_data();
	int data_length = strlen(fdata);

	if (client.connect(THINGSPEAK_URL, 80))
	{
		client.println("POST /update HTTP/1.1");
		client.print("Host: ");
		client.println(THINGSPEAK_URL);
		client.println("Connection: close");
		client.print("X-THINGSPEAKAPIKEY: ");
		client.println(THINGSPEAK_KEY);
		client.println("Content-Type: application/x-www-form-urlencoded");
		client.print("Content-Length: ");
		client.println(data_length);
		client.println();
		client.println(fdata);

		if (client.connected())
		{
			Serial.println("[uploaded succeeded]");
			failed_connections = 0;
			client.stop();
		}
		else
		{
			Serial.println("[upload failed: connection dropped]");
			failed_connections++;
			client.stop();
		}
	}
	else
	{
		failed_connections++;
		Serial.println("[upload failed: connection refused]");
	}
}

#ifdef _DEBUG
void state_message()
{
	switch (state) {
	case DEFAULT_STATE:
		Serial.println("default state");
		break;
	case IN_START_TAG:
		Serial.println("tag mode");
		break;
	case IN_END_TAG:
		Serial.println("end tag mode");
		break;
	case IN_GENERIC_TAG:
		Serial.println("generic tag mode");
		break;
	case IN_TAG_BODY:
		Serial.println("tag body mode");
		break;
	default:
		Serial.print("NULLL BADD");
		break;
	}
}
#endif

void change_state(int new_state)
{
	state = new_state;
}

void process_start_tag(char c)
{
	switch (c) {
	case '>':
		if (strcmp(current_tag, desired_tag) == 0)
		{
			in_good_tag = 1;
		}
		current_tag[0] = '\0';
		change_state(DEFAULT_STATE);
		break;
	default:
		/* Add the character to the current tag name */
		if (strlen(current_tag) < BUF_SIZE)
		{
			strncat(current_tag, &c, 1);
		}
		else
		{
			Serial.println("Tag buffer overflow!");
		}
	}
}

void process_end_tag(char c)
{
	switch (c)
	{
	case '>':
		change_state(DEFAULT_STATE);
		break;
	default:
		break;
	}
}

void process_tag_body(char c)
{
	switch (c)
	{
	case '<':
		/* Data reporting, the good bit */
		if (in_good_tag)
		{
			/* Reset for the next run */
			in_good_tag = 0;

			/* Temperature */
			if (strcmp(desired_tag, temp_tag) == 0)
			{
				temp = atoi(desired_data);
				desired_tag = power_tag;
				/* TODO: change to a pointer */
				onpeak = true;
			}
			/* Peak power */
			else if (onpeak)
			{
				peakpower = atoi(desired_data);
				onpeak = false;
			}
			/* Off peak power & posting */
			else
			{
				offpeakpower = atoi(desired_data);

				/* Print data to console */
				Serial.print("temp: ");
				Serial.print(temp);
				Serial.print(" peak: ");
				Serial.print(peakpower);
				Serial.print(" offpeak: ");
				Serial.println(offpeakpower);

				/* Add data to cumulative totals */
				c_temp += temp;
				c_peak += peakpower;
				c_offpeak += offpeakpower;

				/* Upload data every so often */
				if (cycle_pos == UPDATE_INTERVAL)
				{
					/* Calculate averages */
					temp = c_temp/UPDATE_INTERVAL;
					peakpower = c_peak/UPDATE_INTERVAL;
					offpeakpower = c_offpeak/UPDATE_INTERVAL;

					upload_data();

					/* Reset */
					c_temp = 0;
					c_peak = 0;
					c_offpeak = 0;
				}

				/* Reset for next run */
				temp = 0;
				peakpower = 0;
				offpeakpower = 0;
				cycle_pos = 1 + (cycle_pos % UPDATE_INTERVAL);
				desired_tag = temp_tag;
			}

			/* Reset data buffer */
			desired_data[0] = '\0';
		}
		change_state(IN_END_TAG);
		break;
	default:
		if (in_good_tag)
		{
			strncat(desired_data, &c, 1);
		}
		else
		{
			break;
		}
	}
}

void process_generic_tag(char c)
{
	if (c == '<')
	{
		return;
	}
	if (c == '/')
	{
		change_state(IN_END_TAG);
	}
	else
	{
		change_state(IN_START_TAG);
		process_start_tag(c);
	}
}

void process_default(char c)
{
	switch (c)
	{
		case '\n':
			return;
		case '<':
			change_state(IN_GENERIC_TAG);
			return;
		default:
			change_state(IN_TAG_BODY);
			process_tag_body(c);
	}
}

int process_char(char c)
{
	switch (state)
	{
		case IN_START_TAG:
			process_start_tag(c);
			break;
		case IN_END_TAG:
			process_end_tag(c);
			break;
		case IN_TAG_BODY:
			process_tag_body(c);
			break;
		case IN_GENERIC_TAG:
			process_generic_tag(c);
			break;
		case DEFAULT_STATE:
		default:
			process_default(c);
	}
}

#endif
