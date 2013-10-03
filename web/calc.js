/* calc.js, Electricity usage calculations */

/* Thingspeak URLs. Channel details are defined in feed_details.js */
var tsPowerURL = "http://api.thingspeak.com/channels/" + powerChannel + "/";
var tsEnergyURL = "http://api.thingspeak.com/channels/" + energyChannel + "/";
var tsUpdateURL = "http://api.thingspeak.com/update";

// A map to define the Thingspeak field number for each data stream.
var fields = {
	total: {number: 1, name: "Peak & off-peak power", id: "total"},
	peak: {number: 2, name: "Peak power", id: "peak"},
	offpeak: {number: 3, name: "Off-peak power", id: "offpeak"},
	temp: {number: 4, name: "Temperature", id: "temp"},
};

/* Store historical data so it doesn't have to be re-downloaded & re-processed.
 *	powerHist[field.id][datestamp] = [[date, value], ...]
 *	energyHist[field.id][datestamp] = value
 *	graphHist[field.id][datestamp] = [[date, log(value), {tooltip: ...}], ...]
 */
var powerHist = {};
var energyHist = {};
var graphHist = {};

/* Graph & energy preferences */
var gPrefs = { /* start, end, field */ };
var ePrefs = { /* start, end, field */ };


$(document).ready(function($) {
	// Initialise data structures, html
	layoutInit();
	historyInit();
	prefsInit();	

	// Live power every 30 seconds
	livePower();
	setInterval('livePower()', 30000);

	// Call the graph updater with the energy updater as a dependant.
	updateGraph(updateEnergy);
	calcHotWater();
});

/* ----------------------------- */
/* Data Initialisation Functions */

/* Setup the history super objects */
function historyInit() {
	for (var f in fields) {
		powerHist[fields[f].id] = {};
		energyHist[fields[f].id] = {};
		graphHist[fields[f].id] = {};
	}
}

/* Setup graph & energy defaults */
function prefsInit() {
	var time = daysAgo(0);
	gPrefs.start = time.start;
	gPrefs.end = time.end;
	gPrefs.field = fields.total;
	ePrefs.start = time.start;
	ePrefs.end = time.end;
	ePrefs.field = fields.total;	
}


/* Fetch the latest power data and update the page accordingly */
function livePower() {
	var url = tsPowerURL + "feeds/last.json?callback=?";
	var params = {
		offset: 10,
		key: powerKey,
	};
	$.getJSON(url, params, function(data) {
		if (data.field1) {
			$("#total-power").html(data.field1);
			$("#peak-power").html(data.field2);
			$("#offpeak-power").html(data.field3);
		}
	});
}

// Update the energy value to meet the user's desires.
function updateEnergy() {
	// Get the energy data and call the layout updater from layout.js
	getEnergy(ePrefs.start, ePrefs.end, ePrefs.field, updateEnergyInfo);
}

// Fetch the energy total for a given time period by whatever means necessary.
function getEnergy(start, end, field, callback) {
	var stamp = dateStamp(start, end);

	// Check for a locally cached energy value
	if (typeof(energyHist[field.id][stamp]) !== 'undefined') {
		callback();
		return;
	}
	
	// Check for locally cached power data
	if (typeof(powerHist[field.id][stamp]) !== 'undefined') {
		var energy = calcEnergy(powerHist[field.id][stamp]);
		energy = Math.round(energy*100)/100;
		$("#energy").html(energy);
		energyHist[field.id][stamp] = energy;

		callback();
		return;
	}

	// TODO: Check for a remotely cached energy value

	// Otherwise, download power data and calculate
	var download = getData(start, end, field);
	$.when(download.handler).done(function() {
		// Cache data straight away
		powerHist[field.id][stamp] = download.data;

		var energy = calcEnergy(download.data);
		energy = Math.round(energy*100)/100;
		$("#energy").html(energy);
		energyHist[field.id][stamp] = energy;

		callback();
	});
}

/* Send a daily energy total to ThingSpeak */
function uploadEnergy(value, start, end) {
	// Only upload whole day energy values
	if (start.getDate() + 1 == end.getDate() &&
	    start.getHours() == 0 && end.getHours == 0)
	{
		// Upload energy data at 23:59:59
		var createdAt = new Date(end.getTime());
		createdAt.setSeconds(time.getSeconds() - 1);
		createdAt = createdAt.toJSON().replace("Z", "");

		var data = {
			key: energyKey,
			field1: value,
			created_at: createdAt,
		}

		$.post(tsUpdateURL, data);
	}
}

/* Attempt to retrieve already computed energy values from Thingspeak */
function downloadEnergy(date, numDays) {
	// TODO: This.
}

/* Update the power graph to reflect the user's choice of dates */
function updateGraph(callback) {
	var stamp = dateStamp(gPrefs.start, gPrefs.end);
	var fieldID = gPrefs.field.id;
	
	// Check for cached graph data
	if (typeof(graphHist[fieldID][stamp]) !== 'undefined') {
		graphData("power-graph", graphHist[fieldID][stamp]);
		
		if (typeof(callback) === "function") {
				callback();
		}
	}
	// Otherwise download & graph	
	else {
		var download = getData(gPrefs.start, gPrefs.end, gPrefs.field);
		$.when(download.handler).done(function(junk) {
			// Cache the data locally			
			powerHist[fieldID][stamp] = download.data;

			// Prepare and cache the graph data
			var chartData = timeAverage(download.data, 600);
			chartData = graphData("power-graph", chartData);
			graphHist[fieldID][stamp] = chartData;
			
			if (typeof(callback) === "function") {
				callback();
			}
		});
	}

	updateGraphInfo(); // layout.js
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
		offset: 10,
		key: powerKey,
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

// Calculate the energy used in a given period by integrating power over time
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
	var url = tsPowerURL + "field/" + fieldNo + ".csv";

	var start = $("#dl-start-date").val();
	start = $.datepicker.parseDate("dd/mm/y", start);
	var end = $("#dl-end-date").val();
	end = $.datepicker.parseDate("dd/mm/y", end);

	start = thingspeakDate(start)
	end = thingspeakDate(end);

	var params = {
		offset: 10,
		key: powerKey,
		start: start,
		end: end,
	};

	url += "?" + $.param(params);
	window.open(url, "_blank");
}

// Download a time averaged data set.
function downloadTimeAveraged() {
	// Read interval & convert to seconds
	var interval = $("#ta-interval").val();
	interval = 60*parseInt(interval);

	var stamp = dateStamp(gPrefs.start, gPrefs.end);
	var data = powerHist[gPrefs.field.id][stamp];
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
