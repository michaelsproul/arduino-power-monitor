/* dates.js, Useful date & time manipulations */

/* Create a time interval for last night's off peak period (10pm-7am) */
function offPeakTime() {
	var start = new Date();
	var end = new Date();

	start.setDate(start.getDate() - 1);
	start.setHours(22);
	start.setMinutes(0);
	start.setSeconds(0);

	end.setHours(7);
	end.setMinutes(0);
	end.setSeconds(0);

	return {start: start, end: end};
}

function isToday(date) {
	var today = new Date();
	if (	date.getDate() == today.getDate() &&
		date.getMonth() == today.getMonth() &&
		date.getFullYear() == today.getFullYear())
	{
		return true;
	} else {
		return false;
	}
}

function sameDay(start, end) {
	if (start.getMonth() != end.getMonth() || start.getFullYear() != end.getFullYear()) {
		return false;
	}
	if (start.getDate() == end.getDate()) {
		return true;
	}
	if (start.getDate() == end.getDate() - 1 && start.getHours() == end.getHours()) {
		return true;
	}
	return false;
}

/* Convert a date object to a YYYY-MM-DD%20HH-mm-SS string */
function thingspeakDate(date) {
	var string = date.toISOString();
	string = string.substr(0, string.indexOf('.'));
	string.replace("T", "%20");
	return string;
}

/* Date stamps for historical data */
function dateStamp(start, end) {
	var stamp = twoDigits(start.getHours()) + "t"
	stamp += $.datepicker.formatDate("dd:mm:yy~", start);
	stamp += twoDigits(end.getHours()) + "t";
	stamp += $.datepicker.formatDate("dd:mm:yy", end);
	return stamp;
}

function twoDigits(x) {
	if (x < 10) {
		return "0" + x.toString();
	} else {
		return x.toString();
	}
}

/* Compact expression of a time interval */
function doubleDayString(start, end, today, time) {
	var dateString = "";

	// Return "today" or similar for single days.
	if (isToday(start) || sameDay(start, end)) {
		dateString = singleDayString(start, today);
		if (time) {
			dateString += " " + hourIntervalString(start, end);
		}
	}
	// Otherwise return an interval, optionally with times.
	else {
		if (time) {
			dateString = twelveHourTimeString(start.getHours()) + " ";
		}
		dateString += singleDayString(start);

		// Compound dates in the same month.
		if (start.getMonth() == end.getMonth() && !time) {
			dateString += "-" + end.getDate();
		}
		else {
			dateString += " - ";
			if (time) {
				dateString += twelveHourTimeString(end.getHours()) + " ";
			}
			dateString += singleDayString(end);
		}
	}
	return dateString;
}

/* Make dates like Aug 16, today, yesterday */
function singleDayString(date, today) {
	var nice;
	if (isToday(date) && typeof(today) !== 'undefined') {
		nice = today;
	} else {
		nice = $.datepicker.formatDate("M d", date);
	}
	return nice;
}

/* Format a number as 12 hour time */
function twelveHourTimeString(x) {
	if (x <= 11) {
		return (((x + 11) % 12) + 1) + "am";
	} else {
		return (((x - 1) % 12) + 1) + "pm";
	}
}

/* Compact hour to hour expression, e.g. (10am-2pm)*/
function hourIntervalString(start, end) {
	if (start.getHours() == 0 && end.getHours() == 0) {
		return "";
	}
	var time = " (" + twelveHourTimeString(start.getHours());
	time += "-" + twelveHourTimeString(end.getHours()) + ")";
	return time;
}
