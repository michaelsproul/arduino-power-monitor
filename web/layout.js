function layoutInit() {
	fieldSelectSetup();
	dateSetup();
	navbarSetup();
}

// Make the navigation bar update when clicked.
function navbarSetup() {
	$('.nav li').click(function(event) {
		$('.nav li').each(function(index) {
			$(this).removeClass('active');
		});
	
		$(this).addClass('active');
	});
}

// Fill out field selector options.
function fieldSelectSetup() {
	var selectors = [
		"#dl-field",
		"#graph-field",
		"#energy-field",
	];

	var options = "";

	for (var f in fields) {
		options += "<option value=" + fields[f].id + ">";
		options += fields[f].name + "</option>";
	}

	for (var i in selectors) {
		$(selectors[i]).html(options);
	}
}

// Initialise date selectors
function dateSetup() {
	var names = [
		"graph",
		"energy",
	];

	var dateOnly = [
		"dl",
	];

	// Hours
	var hours = "<option value=0>12am</option>"
	for (var i = 1; i <= 23; i++) {
		var hour;
		hour = niceTime(i);
		hours += "<option value=" + i + ">"
		hours += hour + "</option>";
	}

	// Dates, using JQuery UI datepickers
	var dpOptions = {dateFormat: "dd/mm/y"};

	for (var i in names) {
		$("#" + names[i] + "-start-hour").html(hours);
		$("#" + names[i] + "-end-hour").html(hours);
		$("#" + names[i] + "-start-date").datepicker(dpOptions);
		$("#" + names[i] + "-end-date").datepicker(dpOptions);
	}

	for (var i in dateOnly) {
		$("#" + dateOnly[i] + "-start-date").datepicker(dpOptions);
		$("#" + dateOnly[i] + "-end-date").datepicker(dpOptions);	
	}	
}

// Interpret the user's input to the graph preferences box.
function parseGraphPrefs() {
	parsePrefs("graph", gPrefs, updateGraph);
}

// Interpret the user's input to the energy preferences box.
function parseEnergyPrefs() {
	parsePrefs("energy", ePrefs, updateEnergy);
}

/*
 * Generic function to parse a field, a start date, and an end date.
 * Relies on the elements having IDs like name-field, name-start-date, name-options
 */
function parsePrefs(name, prefs, updateFunc, oppFunc) {
	// Read the field/datastream to use	
	var fieldID = $("#" + name + "-field").val();

	// Parse dates
	var start = $("#" + name + "-start-date").val();
	start = $.datepicker.parseDate("dd/mm/y", start);
	var hour = $("#" + name + "-start-hour").val();
	start.setHours(hour);

	var end = $("#" + name + "-end-date").val();
	end = $.datepicker.parseDate("dd/mm/y", end);
	hour = $("#" + name + "-end-hour").val();
	end.setHours(hour);

	// Hide the popup
	$("#" + name + "-options").modal('hide');

	// Work out where to write data, and what to update
	var updateBoth = $("#" + name + "-sync").is(":checked");
	if (updateBoth) {
		ePrefs.field = fields[fieldID];
		ePrefs.start = start;
		ePrefs.end = end;
		gPrefs.field = fields[fieldID];
		gPrefs.start = start;
		gPrefs.end = end;

		updateGraph(updateEnergy);
	} else {
		prefs.field = fields[fieldID];
		prefs.start = start;
		prefs.end = end;
		updateFunc();
	}
}

// Create a popover with the chart info.
function updateGraphInfo() {
	// Tooltips
	var title = gPrefs.field.name + " for ";
	title += doubleDate(gPrefs.start, gPrefs.end, "today");

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip('destroy');
	$("#graph-info").tooltip(options);

	// Title
	title = doubleDate(gPrefs.start, gPrefs.end, "today");
	$("#graph-info").html(title);
}

function updateEnergyInfo() {
	// Tooltips
	var title = ePrefs.field.name;
	title += " usage " + doubleDate(ePrefs.start, ePrefs.end, "since 12am");

	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy").tooltip('destroy');
	$("#energy").tooltip(options);

	// Title
	title = doubleDate(ePrefs.start, ePrefs.end, "Today");
	$("#energy-info").html(title);
}

// Compact expression of a time interval.
function doubleDate(start, end, today) {
	var dateString;
	if (isToday(start))
	{
		dateString = today;
	}
	else
	{
		if (start.getDate() == end.getDate() - 1)
		{
			dateString = niceDay(start);
		}
		else
		{
			dateString = niceDay(start);
			// Check month
			if (start.getMonth() == end.getMonth())
			{
				dateString += "-" + end.getDate();
			}
			else
			{
				dateString += " - " + niceDay(end);
			}
		}
	}
	return dateString;
}

// Make dates like August 16, today, yesterday.
function niceDay(date, today) {
	var nice;
	if (isToday(date) && typeof(today) !== 'undefined') {
		nice = today;
	} else {
		nice = $.datepicker.formatDate("M d", date);
	}
	return nice;
}

// Convert values to am/pm time
function niceTime(x) {	
	if (x <= 11) {
		return (((x + 11) % 12) + 1) + "am";
	} else {
		return (((x - 1) % 12) + 1) + "pm";
	}
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
