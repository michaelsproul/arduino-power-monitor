/* dates.js, Useful date & time manipulations */

/* ---------- */
/* Functional */
/* ---------- */

/* Describe the interval of time from 'x' hours ago to now */
function hoursAgo(x) {
	var end = new Date();
	var start = new Date();
	start.setHours(start.getHours() - x);
	return {start: start, end: end};
}

/* Create a time interval for a past set of days. x = 0 for today */
function daysAgo(x, duration) {
	if (typeof(duration) === 'undefined') {
		duration = 1;
	}

	var now = new Date();

	// Rollback the desired number of days.
	var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - x, 0, 0, 0, 0);

	var end;
	if (x == 0) {
		end = now; // spooky.
	} else {
		end = new Date(start.getTime());
		end.setDate(end.getDate() + (duration - 1));
		end.setHours(23);
		end.setMinutes(59);
		end.setSeconds(59);
	}

	return {start: start, end: end};
}

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

/* ---------- */
/* Formatting */
/* ---------- */

// Convert a date object to a YYYY-MM-DD%20HH-mm-SS string.
function thingspeakDate(date) {
	var string = date.toISOString();
	string = string.substr(0, string.indexOf('.'));
	string.replace("T", "%20");
	return string;
}

// Date stamps for stored historical data.
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
function doubleDate(start, end, today, time) {
	var dateString = "";
	// Return "today" or similar for single days.
	if (isToday(start) || sameDay(start, end)) {
		dateString = niceDay(start, today);
		if (time) {
			dateString += " " + hourInterval(start, end);
		}
	}
	// Otherwise return an interval, optionally with times.
	else {
		if (time) {
			dateString = niceTime(start.getHours()) + " ";
		}
		dateString += niceDay(start);

		// Compound dates in the same month.
		if (start.getMonth() == end.getMonth() && !time) {
			dateString += "-" + end.getDate();
		}
		else {
			dateString += " - ";
			if (time) {
				dateString += niceTime(end.getHours()) + " ";
			}
			dateString += niceDay(end);
		}
	}
	return dateString;
}

/* Make dates like August 16, today, yesterday */
function niceDay(date, today) {
	var nice;
	if (isToday(date) && typeof(today) !== 'undefined') {
		nice = today;
	} else {
		nice = $.datepicker.formatDate("M d", date);
	}
	return nice;
}

/* Convert numbers to am/pm time */
function niceTime(x) {	
	if (x <= 11) {
		return (((x + 11) % 12) + 1) + "am";
	} else {
		return (((x - 1) % 12) + 1) + "pm";
	}
}

/* Compact hour to hour expression, e.g. (10am-2pm)*/
function hourInterval(start, end) {
	if (start.getHours() == 0 && end.getHours() == 0) {
		return "";
	}
	var time = " (" + niceTime(start.getHours());
	time += "-" + niceTime(end.getHours()) + ")";
	return time;
}
