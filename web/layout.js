/* layout.js, Page filling and layout modification */

function layoutInit() {
	fieldSelectSetup();
	dateSetup();
	navbarSetup();
	monthSelectSetup();
}

/* Make the navigation bar update when clicked */
function navbarSetup() {
	$('.nav li').click(function(event) {
		$('.nav li').each(function(index) {
			$(this).removeClass('active');
		});
	
		$(this).addClass('active');
	});
}

/* Fill in month selector options */
function monthSelectSetup() {
	var selectors = [ "#summary-month", ];

	var options = "";

	var date = new Date();

	for (var i = 0; i < 12; i++) {
		var option = "<option value=" + date.getMonth() + ">";
		option += $.datepicker.formatDate("MM", date);
		option += "</option>";
		options += option;
		date.setMonth(date.getMonth() - 1);
	}

	for (var i in selectors) {
		$(selectors[i]).html(options);
	}
}

/* Fill out field selector options */
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

/* Initialise date selectors */
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

/* Interpret the user's input to the graph preferences box */
function parseGraphPrefs() {
	parsePrefs("graph", gPrefs, updateGraph);
}

/* Interpret the user's input to the energy preferences box */
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

/* Create a popover with the chart info */
function updateGraphInfo() {
	// Tooltips
	var title = gPrefs.field.name + "\n";
	title += doubleDate(gPrefs.start, gPrefs.end, "Today", true);

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip('destroy');
	$("#graph-info").tooltip(options);

	// Title
	title = doubleDate(gPrefs.start, gPrefs.end, "today", false);
	$("#graph-info").html(title);
}

function updateEnergyInfo() {
	// Tooltips
	var title = ePrefs.field.name;
	title += " usage\n" + doubleDate(ePrefs.start, ePrefs.end, "Today", true);

	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy").tooltip('destroy');
	$("#energy").tooltip(options);

	// Title
	title = doubleDate(ePrefs.start, ePrefs.end, "Today", false);
	$("#energy-info").html(title);
}
