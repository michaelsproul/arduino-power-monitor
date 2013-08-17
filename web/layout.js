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
	var select1 = $("#dl-data");
	var select2 = $("#graph-new-field");	

	for (var f in fields) {
		var option = "<option value=" + fields[f].id + ">";
		option += fields[f].name + "</option>";
		select1.html(select1.html() + option);
		select2.html(select2.html() + option);
	}
}

// Fill out date selector options.
function fillDateSelectors() {
	var selectors = [
		"#dl-start",
		"#dl-end",
		"#graph-new-start",
		"#graph-new-end",
	];

	var options = "";

	for (var i = -1; i < 30; i++) {
		options += "<option value=" + i + ">";
		var date = new Date();
		date.setDate(date.getDate() - i);
		options += $.datepicker.formatDate("MM d", date);
		options += "</option>";
	}

	for (var i in selectors) {
		$(selectors[i]).html(options);
	}
}

// Interpret the user's input to the graph preferences box.
function parseGraphPrefs() {
	var fieldID = $("#graph-new-field").val();
	gPrefs.field = fields[fieldID];

	var start = parseInt($("#graph-new-start").val());
	var duration = start - parseInt($("#graph-new-end").val());

	if (duration <= 0) {
		alert("Please choose an end date after the start date.");
		return;
	}

	var time = daysAgo(start, duration);
	gPrefs.start = time.start;
	gPrefs.end = time.end;

	$("#graph-options").modal('hide');
	updateGraph();
}

// Create a popover with the chart info.
function updateGraphInfo() {
	// Tooltips
	var title = gPrefs.field.name + " on ";
	title += $.datepicker.formatDate("DD, MM d", gPrefs.start, {});

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip('destroy');
	$("#graph-info").tooltip(options);

	// Graph preferences pop-up
	$("#graph-curr-field").html(gPrefs.field.name);
	$("#graph-curr-start").html(niceDate(gPrefs.start));
	$("#graph-curr-end").html(niceDate(gPrefs.end));
}

function updateEnergyInfo() {
	// Tooltips
	var title = ePrefs.field.name;
	title = title.substr(0, title.indexOf('power')).trim();
	title += " usage, since 12am";

	if (!isToday(ePrefs.start)) {
		title += " (" + $.datepicker.formatDate("d/m/y", ePrefs.start);
		title += ")";
	}

	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy").tooltip(options);
}

function niceDate(date) {
	var nice = $.datepicker.formatDate("MM d yy, ", date);
	var time = date.toLocaleTimeString();
	time = time.substr(0, time.lastIndexOf(":"));
	nice += time; 
	return nice;
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

