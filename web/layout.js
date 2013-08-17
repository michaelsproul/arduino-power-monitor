function layoutInit() {
	fillFieldSelectors();
	fillDateSelectors();
	navUpdateEnable();
}

// Navigation bar updating.
function navUpdateEnable() {
	$('.nav li').click(function(event) {
		$('.nav li').each(function(index) {
			$(this).removeClass('active');
		});
	
		$(this).addClass('active');
	});
}

// Fill out field selector options.
function fillFieldSelectors() {
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

// Fill out date selector options.
function fillDateSelectors() {
	var starts = [
		"#dl-start",
		"#graph-start",
		"#energy-start",
	];	

	var ends = [
		"#dl-end",
		"#graph-end",
		"#energy-end",
	];

	var options = "";

	for (var i = -1; i < 30; i++) {
		options += "<option value=" + i + ">";
		var date = new Date();
		date.setDate(date.getDate() - i);
		options += niceDay(date);
		options += "</option>";
	}

	for (var i in starts) {
		$(starts[i]).html(options);
		// Select today as the default value
		$(starts[i]).children('option[value|="0"]').attr("selected", "selected");
	}
	for (var i in ends) {
		$(ends[i]).html(options);
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
 * Relies on the elements having IDs like name-field, name-start, name-options
 */
function parsePrefs(name, prefs, updateFunc) {
	var fieldID = $("#" + name + "-field").val();
	prefs.field = fields[fieldID];

	var start = parseInt($("#" + name + "-start").val());
	var duration = start - parseInt($("#" + name + "-end").val());

	if (duration <= 0) {
		alert("Please choose an end date after the start date.");
		return;
	}

	var time = daysAgo(start, duration);
	prefs.start = time.start;
	prefs.end = time.end;

	$("#" + name + "-options").modal('hide');
	updateFunc();
}

// Create a popover with the chart info.
function updateGraphInfo() {
	// Tooltips
	var title = gPrefs.field.name + " on ";
	title += $.datepicker.formatDate("DD, MM d", gPrefs.start);

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip('destroy');
	$("#graph-info").tooltip(options);

	// Graph preferences pop-up
	$("#graph-curr-field").html(gPrefs.field.name);
	$("#graph-curr-start").html(niceDateTime(gPrefs.start));
	$("#graph-curr-end").html(niceDateTime(gPrefs.end));

	// Title
	title = niceDay(gPrefs.start, "today");
	$("#graph-info").html(title);
}

function updateEnergyInfo() {
	// Tooltips
	var title = ePrefs.field.name;
	title = title.substr(0, title.indexOf('power')).trim();
	title += " usage, since 12am";

	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy").tooltip('destroy');
	$("#energy").tooltip(options);

	// Title
	title = niceDay(ePrefs.start, "Today");
	$("#energy-info").html(title);
}

// Make dates like August 16 2013, 22:09
function niceDateTime(date) {
	var nice = $.datepicker.formatDate("MM d yy, ", date);
	var time = date.toLocaleTimeString();
	time = time.substr(0, time.lastIndexOf(":"));
	nice += time; 
	return nice;
}

// Make dates like August 16, today, yesterday.
function niceDay(date, today) {
	var nice;
	if (isToday(date) && typeof(today) !== 'undefined') {
		nice = today;
	} else {
		nice = $.datepicker.formatDate("MM d", date);
	}
	return nice;
}

// Make dates like 16/8/13
function niceDate(date) {
	return $.datepicker.formatDate("d/m/y", date);
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
