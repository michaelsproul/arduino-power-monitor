/* calc.js, Electricity usage calculations */

// Thingspeak URLs. Channel details are defined in feed_details.js
var tsPowerURL = "http://api.thingspeak.com/channels/" + tsPowerChannel + "/";
var tsUpdateURL = "http://api.thingspeak.com/update";

// A map to define the Thingspeak field number for each data stream
var fields = {
	total: {number: 1, name: "Peak & off-peak power", id: "total"},
	peak: {number: 2, name: "Peak power", id: "peak"},
	offpeak: {number: 3, name: "Off-peak power", id: "offpeak"},
	temp: {number: 4, name: "Temperature", id: "temp"}
};

/* Store historical data so it doesn't have to be re-downloaded & re-processed
 *	powerHist[field.id][datestamp] = [[date, value], ...]
 *	energyHist[field.id][datestamp] = value
 *	graphHist[field.id][avgInterval][datestamp] = [[date, log(value), {tooltip: ...}], ...]
 */
var powerHist = {};
var energyHist = {};
var graphHist = {};

var graphPrefs = {start: null, end: null, field: fields.total, avgInterval: 10};
var energyPrefs = {start: null, end: null, field: fields.total};

$(document).ready(function($) {
	// Initialise data structures, layout
	layoutInit();
	historyInit();
	prefsInit();

	// Live power every 30 seconds
	livePower();
	setInterval('livePower()', 30000);

	// Call the graph updater with the energy updater as a dependant
	updateGraph(updateEnergy);
	calcHotWater();
});

/* ----------------------------- */
/* Data Initialisation Functions */
/* ----------------------------- */

/* Setup the history super objects */
function historyInit() {
	var avgInterval = graphPrefs.avgInterval;
	for (var f in fields) {
		powerHist[fields[f].id] = {};
		energyHist[fields[f].id] = {};
		graphHist[fields[f].id] = {};
		graphHist[fields[f].id][avgInterval] = {};
	}
}

/* Setup graph & energy default preferences */
function prefsInit() {
	var start = new Date();
	start.setHours(0);
	start.setMinutes(0);
	start.setSeconds(0);
	start.setMilliseconds(0);
	var end = new Date();
	end.setHours(end.getHours() + 1);
	end.setMinutes(0);
	end.setSeconds(0);
	end.setMilliseconds(0);
	graphPrefs.start = start;
	energyPrefs.start = start;
	graphPrefs.end = end;
	energyPrefs.end = end;

	// Update the page
	syncGraphPrefs();
	syncEnergyPrefs();
}

/* ------------------ */
/* Main Functionality */
/* ------------------ */

/* Fetch the latest power data and update the page accordingly */
function livePower() {
	var url = tsPowerURL + "feeds/last.json?callback=?";
	var params = {
		offset: getTimezoneOffset(new Date()),
		key: tsPowerKey,
	};
	$.getJSON(url, params, function(data) {
		if (data.field1) {
			$("#total-power").html(data.field1);
			var peak = parseInt(data.field2, 10);
			var offpeak = parseInt(data.field3, 10);
			updatePowerPopover(peak, offpeak);
		}
	});
}

/* Update the energy integral */
function updateEnergy() {
	// Update the page headings, etc
	updateEnergyInfo();

	var stamp = dateStamp(energyPrefs.start, energyPrefs.end);
	var fieldID = energyPrefs.field.id;

	// Use cached energy data, if it exists
	if (typeof(energyHist[fieldID][stamp]) !== 'undefined') {
		var energy = energyHist[fieldID][stamp];
		$("#energy").html(energy);
		return;
	}

	// Use cached power data if it exists
	if (typeof(powerHist[fieldID][stamp]) !== 'undefined') {
		var energy = calcEnergy(powerHist[fieldID][stamp]);
		energy = Math.round(energy * 100) / 100;
		energyHist[fieldID][stamp] = energy;
		$("#energy").html(energy);
		return;
	}

	// Otherwise, download power data and calculate
	var download = getData(energyPrefs.start, energyPrefs.end, energyPrefs.field);
	$.when(download.handler).done(function() {
		// Cache raw power data for future use
		powerHist[fieldID][stamp] = download.data;

		var energy = calcEnergy(download.data);
		energy = Math.round(energy * 100) / 100;
		energyHist[fieldID][stamp] = energy;
		$("#energy").html(energy);
	});
}

/* Update the power graph */
function updateGraph(callback) {
	// Update the page headings, etc
	updateGraphInfo();

	var avgInterval = graphPrefs.avgInterval;
	var stamp = dateStamp(graphPrefs.start, graphPrefs.end);
	var fieldID = graphPrefs.field.id;

	// Use cached graph data, if it exists
	var cachedGraphData = graphHist[fieldID][avgInterval];
	if (typeof(cachedGraphData) !== "undefined" &&
		cachedGraphData.hasOwnProperty(stamp))
	{
		graphData("power-graph", graphHist[fieldID][avgInterval][stamp]);

		if (typeof(callback) === "function") {
				callback();
		}
		return;
	}

	// If the time averaging has changed, use cached power data
	if (typeof(powerHist[fieldID][stamp]) !== "undefined") {
		var rawData = powerHist[fieldID][stamp];
		var chartData = timeAverage(rawData, avgInterval*60);
		chartData = graphData("power-graph", chartData);

		// Create a cache for the graph data if none exists
		if (typeof(graphHist[fieldID][avgInterval]) === "undefined") {
			graphHist[fieldID][avgInterval] = {};
		}
		graphHist[fieldID][avgInterval][stamp] = chartData;

		if (typeof(callback) === "function") {
			callback();
		}
		return;
	}

	// Otherwise, download data from Thingspeak
	var download = getData(graphPrefs.start, graphPrefs.end, graphPrefs.field);
	$.when(download.handler).done(function(junk) {
		// Cache the data locally
		powerHist[fieldID][stamp] = download.data;

		// Prepare and cache the graph data
		var chartData = timeAverage(download.data, avgInterval*60);
		chartData = graphData("power-graph", chartData);

		// Create a cache for the graph data if none exists
		if (typeof(graphHist[fieldID][avgInterval]) === "undefined") {
			graphHist[fieldID][avgInterval] = {};
		}
		graphHist[fieldID][avgInterval][stamp] = chartData;

		if (typeof(callback) === "function") {
			callback();
		}
	});
}

/* Calculate the off-peak hotwater energy usage */
function calcHotWater() {
	var offpeak = offPeakTime();
	var download = getData(offpeak.start, offpeak.end, fields.offpeak);
	$.when(download.handler).done(function(junk) {
		var energy = calcEnergy(download.data);
		energy = Math.round(energy*100)/100;
		$("#hotwater").html(energy);
	});
}

/* Fetch a single field's data for a given start and end time */
function getData(start, end, field) {
	var url = tsPowerURL + "field/" + field.number + ".json?callback=?";
	var params = {
		offset: getTimezoneOffset(start),
		key: tsPowerKey,
		start: thingspeakDate(start),
		end: thingspeakDate(end),
	};
	var data = [];
	var fieldStr = "field" + field.number;
	var handler = $.getJSON(url, params, function(rawData) {
		var l = rawData.feeds.length;
		for (var i = 0; i < l; i++) {
			var dateString = rawData.feeds[i].created_at;
			var date = new Date(dateString);
			var power = parseInt(rawData.feeds[i][fieldStr]);
			data.push([date, power]);
		}
	});

	return {handler: handler, data: data};
}

/* Condense a large data set into a smaller, time averaged data set.
 * The given interval, in seconds, defines the minimum spacing between data
 * points in the output. */
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
			// NaN busting
			if (isNaN(data[i][1])) {
				i++;
				continue;
			}

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

/* Calculate the energy used in a given period by integrating power over time */
function calcEnergy(data) {
	var l = data.length;
	var energy = 0.0; // Wh

	var duration = 0.0; // hours
	var power = 0.0; // watts

	for (var i = 0; i < l - 1; i++) {
		// NaN busting
		if (isNaN(data[i][1])) {
			continue;
		}

		// Calculate the duration of each power level
		duration = data[i + 1][0].getTime();
		duration -= data[i][0].getTime();

		// Convert milliseconds to hours
		duration /= (1000*3600);

		energy += data[i][1]*duration;
	}
	return energy/1000; // kWh
}

/* Create a graph from an array of data pairs */
function graphData(graphID, data) {
	var graphSelector = "#" + graphID;
	// Clear out the old graph
	$(graphSelector).html("");

	// Check for empty data sets
	if (data.length == 0) {
		$(graphSelector).html("<p>No data.</p>");
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

	$(graphSelector).css("height", "800px");
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

/* Send the user to a new tab to download the CSV data they've requested */
function downloadCSV() {
	var fieldID = $("#dl-field").val();
	fieldNo = fields[fieldID].number;
	var url = tsPowerURL + "field/" + fieldNo + ".csv";

	var start = $("#dl-start-date").val();
	start = $.datepicker.parseDate("dd/mm/y", start);
	var end = $("#dl-end-date").val();
	end = $.datepicker.parseDate("dd/mm/y", end);

	var params = {
		offset: getTimezoneOffset(start),
		key: tsPowerKey,
		start: thingspeakDate(start),
		end: thingspeakDate(end),
	};

	url += "?" + $.param(params);
	window.open(url, "_blank");
}

/* Download a time averaged data set */
function downloadTimeAveraged() {
	// Read interval & convert to seconds
	var interval = $("#ta-interval").val();
	interval = 60*parseInt(interval);

	var stamp = dateStamp(graphPrefs.start, graphPrefs.end);
	var data = powerHist[graphPrefs.field.id][stamp];
	data = timeAverage(data, interval);

	var csvData = "data:text/csv;charset=utf-8,";
	data.forEach(function(dataPoint, index) {
		var dataString = $.datepicker.formatDate("dd/mm/y ", dataPoint[0]);
		dataString += dataPoint[0].toTimeString();
		dataString = dataString.substr(0, dataString.lastIndexOf(":") + 3);
		dataString += "," + dataPoint[1];
		csvData += dataString + "\n";
	});

	var encodedUri = encodeURI(csvData);
	window.open(encodedUri);
}
