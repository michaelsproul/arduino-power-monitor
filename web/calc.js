// ThingSpeak url: Define your channel and API read key in a separate file.
var thingspeakURL = "http://api.thingspeak.com/channels/" + channel + "/";

// A map to define the Thingspeak field number for each data stream.
var fields = {
	total: {number: 1, name: "Peak & off-peak power", id: "total"},
	peak: {number: 2, name: "Peak power", id: "peak"},
	offpeak: {number: 3, name: "Off-peak power", id: "offpeak"},
	temp: {number: 4, name: "Temperature", id: "temp"},
};

/* Store historical data so it doesn't have to be re-downloaded & re-processed.
 *	powerHist[field.id][dd:mm:yy] = [[date, value], ...]
 *	energyHist[field.id][dd:mm:yy] = value
 *	graphHist[field.id][dd:mm:yy] = [[date, log(value), {tooltip: ...}], ...]
 */
var powerHist = {};
var energyHist = {};
var graphHist = {};

// Graph preferences.
var gPrefs = { /* start, end, field */ };

// Energy preferences.
var ePrefs = { /* start, end, field */ };

$(document).ready(function($) {
	layoutInit(); // From layout.js
	historyInit();
	prefsInit();	

	// Live power every 30 seconds
	livePower();
	setInterval('livePower()', 30000);

	// Call the graph updater with the energy updater as a dependant.
	updateGraph(updateEnergy);
	calcHotWater();
});

// Fetch the latest power data and update the page accordingly.
function livePower() {
	var url = thingspeakURL + "feeds/last.json?callback=?&offset=10&key=" + readKey;
	$.getJSON(url, function(data) {
		if (data.field1) {
			$("#total-power").html(data.field1);
			$("#peak-power").html(data.field2);
			$("#offpeak-power").html(data.field3);
		}
	});
}

// Setup the history super objects.
function historyInit() {
	for (var f in fields) {
		powerHist[fields[f].id] = {};
		energyHist[fields[f].id] = {};
		graphHist[fields[f].id] = {};
	}
}

// Setup graph & energy defaults.
function prefsInit() {
	var time = daysAgo(0);
	gPrefs.start = time.start;
	gPrefs.end = time.end;
	gPrefs.field = fields.total;

	ePrefs.start = time.start;
	ePrefs.end = time.end;
	ePrefs.field = fields.total;	
}

// Update the energy integral to meet the user's desires.
function updateEnergy() {
	var stamp = dateStamp(ePrefs.start, ePrefs.end);
	var fieldID = ePrefs.field.id;

	if (typeof(energyHist[fieldID][stamp]) !== 'undefined') {
		$("#energy").html(energyHist[fieldID][stamp]);
	} else if (typeof(powerHist[fieldID][stamp]) !== 'undefined') {
		var energy = calcEnergy(powerHist[fieldID][stamp]);
		energy = Math.round(energy*100)/100;
		$("#energy").html(energy);
		energyHist[fieldID][stamp] = energy;
	} else {
		var download = getData({start: ePrefs.start, end: ePrefs.end}, ePrefs.field);
		$.when(download.handler).done(function(junk) {
			// Cache data straight away.
			powerHist[fieldID][stamp] = download.data;
			
			var energy = calcEnergy(download.data);
			energy = Math.round(energy*100)/100;
			$("#energy").html(energy);
			energyHist[fieldID][stamp] = energy;
		});
	}

	updateEnergyInfo(); // layout.js
}

// Update the graph to display the desired information.
function updateGraph(dependantFunc) {
	var stamp = dateStamp(gPrefs.start, gPrefs.end);
	var fieldID = gPrefs.field.id;
	
	// Download data only if the cache is empty.
	if (typeof(graphHist[fieldID][stamp]) !== 'undefined') {
		graphData("power-graph", graphHist[fieldID][stamp]);
		
		if (typeof(dependantFunc) === "function") {
				dependantFunc();
		}
	} else {
		var download = getData({start: gPrefs.start, end: gPrefs.end}, gPrefs.field);
		$.when(download.handler).done(function(junk) {
			// Store the data and run the dependant function.
			powerHist[fieldID][stamp] = download.data;

			if (typeof(dependantFunc) === "function") {
				dependantFunc();
			}

			var chartData = timeAverage(download.data, 600);
			chartData = graphData("power-graph", chartData);
			graphHist[fieldID][stamp] = chartData;
		});
	}

	updateGraphInfo(); // layout.js
}


// Calculate the off-peak hotwater energy usage.
function calcHotWater() {
	var download = getData(offPeakTime(), fields.offpeak);
	$.when(download.handler).done(function(junk) {
		var energy = calcEnergy(download.data);
		energy = Math.round(energy*100)/100;
		$("#hotwater").html(energy);
	});
}

// Describe the interval of time from 'x' hours ago to now.
function hoursAgo(x) {
	var end = new Date();
	var start = new Date();
	start.setHours(start.getHours() - x);
	return {start: start, end: end};
}

// Create a time interval for a past set of days. x = 0 for today.
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

// Create a time interval for last night's off peak period (10pm-7am).
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

// Fetch a single field's data for a given start and end time.
function getData(time, field) {
	var url = thingspeakURL + "field/" + field.number + ".json";
	url += "?callback=?&offset=10&key=" + readKey;

	url += "&start=" + thingspeakDate(time.start) + "&end=" + thingspeakDate(time.end);

	var data = [];
	var fieldID = "field" + field.number;
	var handler = $.getJSON(url, function(rawData) {
		var l = rawData.feeds.length;
		for (var i = 0; i < l; i++) {
			var dateString = rawData.feeds[i].created_at;
			var date = new Date(dateString);
			var power = parseInt(rawData.feeds[i][fieldID]);
			data.push([date, power]);
		}
	});

	return {handler: handler, data: data};
}

// Condense a large data set into a smaller, time averaged data set.
// The given interval, in seconds, defines the minimum spacing between data points in the output.
function timeAverage(data, interval) {
	var l = data.length;
	var newData = [];

	var i = 0;

	while (i < l - 1) {
		// Setup the start and end points for this interval
		var start = data[i][0];
		var intervalEnd = new Date(start.getTime());
		intervalEnd.setSeconds(intervalEnd.getSeconds() + interval);

		// Calculate the weighted average of the power over the interval
		var durationSum = 0.0; // seconds
		var weightedPower = 0.0; // watt seconds (J)

		while (data[i][0] < intervalEnd && i < l - 1) {
			var duration = data[i + 1][0].getTime();
			duration -= data[i][0].getTime();
			duration /= 1000;
			durationSum += duration;
			weightedPower += data[i][1]*duration;		
			i++;
		}
		var avgPower = weightedPower/durationSum;
		avgPower = Math.round(avgPower);
		// Use the start of the interval as the timestamp. 
		newData.push([start, avgPower]);	
	}

	return newData;
}

// Calculate the energy used in a given period by integrating power over time
function calcEnergy(data) {
	var l = data.length;
	var energy = 0.0; // Wh

	var duration = 0.0; // hours
	var power = 0.0; // watts

	for (var i = 0; i < l - 1; i++) {
		// Calculate the duration of each power level
		duration = data[i + 1][0].getTime();
		duration -= data[i][0].getTime();

		// Convert milliseconds to hours
		duration /= (1000*3600);

		energy += data[i][1]*duration;
	}
	return energy/1000; // kWh
}

// Create a graph from an array of data pairs.
function graphData(graphID, data) {
	// Clear out the old graph
	$("#" + graphID).html("");

	// Check for empty data sets	
	if (data.length == 0) {
		$("#" + graphID).html("<p>No data.</p>");
		return;
	}

	// If the data hasn't been graphed before take logarithms & add tooltips.	
	if (typeof(data[0][2]) === 'undefined') {
		for (var i = 0; i < data.length; i++) {
			var tooltip = data[i][1] + "W at ";
			var date = data[i][0];
			date = date.toTimeString();
			tooltip += date.substr(0, date.lastIndexOf(":"));
			data[i].push({tooltip: tooltip});
		
			// Logarithms!
			data[i][1] = Math.log(data[i][1]);
		}
	}

	$("#" + graphID).css("height", "800px");
	var options = {
			show_y_labels: false,
			label_max: false,
			label_min: false,
			label_format: "%I:%M %p",
	};
	var chart = new Charts.LineChart(graphID, options);
	chart.add_line({data: data});
	chart.draw();

	return data;
}

// Send the user to a new tab to download the CSV data they've requested.
function downloadCSV() {
	var fieldID = $("#dl-field").val();
	fieldNo = fields[fieldID].number;
	var url = thingspeakURL + "field/" + fieldNo + ".csv";
	url += "?offset=10&key=" + readKey;

	var start = $("#dl-start-date").val();
	start = $.datepicker.parseDate("dd/mm/y", start);
	var end = $("#dl-end-date").val();
	end = $.datepicker.parseDate("dd/mm/y", end);

	start = thingspeakDate(start)
	end = thingspeakDate(end);

	url += "&start=" + start;
	url += "&end=" + end;
	window.open(url, "_blank");
}

// Convert a date object to YYYY-MM-DD%20HH-mm-SS
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
