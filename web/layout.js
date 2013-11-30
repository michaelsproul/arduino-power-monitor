/* layout.js, Page filling and layout modification */

function layoutInit() {
	$("#graph-avg-interval").val(graphPrefs.avgInterval);
	fieldSelectSetup();
	monthSelectSetup();
	dateSelectSetup();
	navbarSetup();
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

/* Populate the month selector dropdowns */
function monthSelectSetup() {
	var selectors = ["#summary-month"];

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

/* Populate the field selector dropdowns */
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

/* Initialise the date and time selectors used for the preference dialogues */
function dateSelectSetup() {
	// Selector prefixes for tags to receive date & time selectors
	var dateAndTime = ["graph", "energy"];
	// Selector prefixes for tags to receive date selectors only
	var dateOnly = ["dl"];

	// Create a list of select options, for all 24 hours
	var hours = "<option value=0>12am</option>"
	for (var i = 1; i <= 23; i++) {
		hours += "<option value=" + i + ">"
		hours += twelveHourTimeString(i) + "</option>";
	}

	// jQuery UI datepicker preferences
	var dpOptions = {dateFormat: "dd/mm/y"};

	for (var i in dateAndTime) {
		$("#" + dateAndTime[i] + "-start-hour").html(hours);
		$("#" + dateAndTime[i] + "-end-hour").html(hours);
		$("#" + dateAndTime[i] + "-start-date").datepicker(dpOptions);
		$("#" + dateAndTime[i] + "-end-date").datepicker(dpOptions);
	}

	for (var i in dateOnly) {
		$("#" + dateOnly[i] + "-start-date").datepicker(dpOptions);
		$("#" + dateOnly[i] + "-end-date").datepicker(dpOptions);
	}
}

/* Interpret the user's input to the graph preferences box */
function parseGraphPrefs() {
	var avgInterval = $("#graph-avg-interval").val();
	graphPrefs.avgInterval = parseInt(avgInterval, 10);
	parsePrefs("graph", graphPrefs, updateGraph);
}

/* Interpret the user's input to the energy preferences box */
function parseEnergyPrefs() {
	parsePrefs("energy", energyPrefs, updateEnergy);
}

/*
 * Generic function to parse a field, a start date, and an end date.
 * Relies on the elements having IDs like name-field, name-start-date, name-options
 */
function parsePrefs(name, prefs, updateFunc) {
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
		energyPrefs.field = fields[fieldID];
		energyPrefs.start = start;
		energyPrefs.end = end;
		graphPrefs.field = fields[fieldID];
		graphPrefs.start = start;
		graphPrefs.end = end;

		updateGraph(updateEnergy);
	} else {
		prefs.field = fields[fieldID];
		prefs.start = start;
		prefs.end = end;
		updateFunc();
	}
}

/* Update the header describing the graph */
function updateGraphInfo() {
	// Tooltips
	var title = graphPrefs.field.name + "\n";
	title += doubleDayString(graphPrefs.start, graphPrefs.end, "Today", true);

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip('destroy');
	$("#graph-info").tooltip(options);

	// Title
	title = doubleDayString(graphPrefs.start, graphPrefs.end, "today", false);
	$("#graph-info").html(title);
}

/* Update the header describing the energy tally */
function updateEnergyInfo() {
	// Tooltips
	var title = energyPrefs.field.name;
	title += " usage\n" + doubleDayString(energyPrefs.start, energyPrefs.end, "Today", true);

	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy").tooltip('destroy');
	$("#energy").tooltip(options);

	// Title
	title = doubleDayString(energyPrefs.start, energyPrefs.end, "Today", false);
	$("#energy-info").html(title);
}

/* Create a popover with the peak vs off-peak power data */
function updatePowerPopover(peak, offpeak) {
	var popoverText = "Peak: " + peak + " W\n";
	popoverText += "Off-peak: " + offpeak + " W";
	var options = {
		placement: "bottom",
		title: popoverText,
	}
	$("#total-power").tooltip('destroy');
	$("#total-power").tooltip(options);
}
