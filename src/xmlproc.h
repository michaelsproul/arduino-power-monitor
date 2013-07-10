#ifndef _XMLPROC
#define _XMLPROC

#define BUF_SIZE 30

#define IN_START_TAG 0
#define IN_END_TAG 10
#define IN_TAG_BODY 20
#define DEFAULT_STATE 30
#define IN_GENERIC_TAG 40

#define TEMP_TAG "tmpr"
#define POWER_TAG "watts"

/* Data containers */
int offpeakpower;
int peakpower;
int temp;

/* Processing variables */
int state = DEFAULT_STATE;
int in_good_tag = 0;
char desired_data[BUF_SIZE];
char current_tag[BUF_SIZE];

/* Cycle through temp, peak, offpeak */
char desired_tag[BUF_SIZE] = TEMP_TAG;
boolean onpeak = false;

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

void change_state(int new_state)
{
	state = new_state;
	// state_message();
}

void process_start_tag(char c)
{
	switch (c) {
	case '>':
		if (strcmp(current_tag, desired_tag) == 0)
		{
			// Serial.println("FOUND A TAG MATCH");
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
			// Serial.print("Finished good tag: ");
			// Serial.print(desired_tag);
			/* Reset for the next run */
			in_good_tag = 0;

			/* Temperature */
			if (strcmp(desired_tag, TEMP_TAG) == 0)
			{
				// Serial.println("Processing temperature");
				temp = atoi(desired_data);
				strcpy(desired_tag, POWER_TAG);
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

				/* Temporary */
				Serial.print("temp: ");
				Serial.print(temp);
				Serial.print(" peak: ");
				Serial.print(peakpower);
				Serial.print(" offpeak: ");
				Serial.print(offpeakpower);
				Serial.println();
				temp = 0;
				peakpower = 0;
				offpeakpower = 0;
				strcpy(desired_tag, TEMP_TAG);
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
	// Serial.print(c);
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
