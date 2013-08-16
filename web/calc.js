// ThingSpeak url: Define your channel and API read key in a separate file.
var thingspeakURL = "http://api.thingspeak.com/channels/" + channel + "/";

// A map to define the Thingspeak field number for each data stream.
var fields = {
	total: {number: 1, name: "Total power", sname: "total"},
	peak: {number: 2, name: "Peak power", sname: "peak"},
	offpeak: {number: 3, name: "Off-peak power", sname: "offpeak"},
	temp: {number: 4, name: "Temperature", sname: "temp"},
};

// Store historical data so it doesn't have to be re-downloaded & re-processed.

// powerHist[field short name][yy-mm-dd] = [[date, value], ...]
var powerHist = {};
// energyHist[field short name][yy-mm-dd] = value
var energyHist = {};
// graphHist[field short name][yy-mm-dd] = [[date, log(value), {tooltip: ...}], ...]
var graphHist = {};

$(document).ready(function($) {
	layoutInit();
	historyInit();
	livePower();
	setInterval('livePower()', 30000);
	calcDailyEnergy(fields.total);
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

function historyInit() {
	for (var f in fields) {
		powerHist[fields[f].sname] = {};
		energyHist[fields[f].sname] = {};
		graphHist[fields[f].sname] = {};
	}
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

// Calculate the energy used so far today.
function calcDailyEnergy(field) {
	var download = getData(daysAgo(0), field);
	$.when(download.handler).done(function(junk) {
		var energy = calcEnergy(download.data);
		energy = Math.round(energy*100)/100;
		$("#energy-today").html(energy);

		// Graph power usage.
		var chartData = timeAverage(download.data, 600);
		chartData = graphData('power-graph', field, chartData);

		// Store all data.
		var stamp = download.stamp;
		powerHist[field.sname][stamp] = download.data;
		energyHist[field.sname][stamp] = energy;
		graphHist[field.sname][stamp] = chartData;
	});
}

// Describe the interval of time from 'x' hours ago to now.
function hoursAgo(x) {
	var end = new Date();
	var start = new Date();
	start.setHours(start.getHours() - x);
	return {start: start, end: end};
}

// Create a time interval for a past day. 0 = today.
function daysAgo(x) {
	var end = new Date();
	if (x != 0) {
		// Rollback the desired number of days.
		end.setDate(end.getDate() - x);
		end.setHours(23);
		end.setMinutes(59);
		end.setSeconds(59);
	}
	var start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);

	return {start: start, end: end};
}

// Create a time interval for last night's off peak period (10pm-7am).
function offPeakTime() {
	var start = new Date();
	var end = new Date();

	end.setDate(end.getDate() - 1);
	end.setHours(22);
	end.setMinutes(0);
	end.setSeconds(0);

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
	var handler = $.getJSON(url, function(rawData) {
		var l = rawData.feeds.length;
		for (var i = 0; i < l; i++) {
			var dateString = rawData.feeds[i].created_at;
			var date = new Date(dateString);
			var power = parseInt(rawData.feeds[i].field1);
			data.push([date, power]);
		}
	});

	var stamp = dateStamp(time.start);
	return {handler: handler, data: data, stamp: stamp};
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

// Create a graph from an array of data pairs
// graphID: The id of the graph element (a div)
function graphData(graphID, field, data) {

	if (data.length == 0) {
		$("#" + graphID).html("<p>No data.</p>");
		return;
	}

	$("#" + graphID).css("height", "800px");
	var options = {
			show_y_labels: false,
			label_max: false,
			label_min: false,
			label_format: "%I:%M %p",
	};
	var chart = new Charts.LineChart(graphID, options);

	// Better tooltips
	for (var i = 0; i < data.length; i++) {
		var tooltip = data[i][1] + "W at ";
		var date = data[i][0];
		date = date.toLocaleTimeString();
		tooltip += date.substr(0, date.lastIndexOf(":"));
		data[i].push({tooltip: tooltip});
		
		// Logarithms!
		data[i][1] = Math.log(data[i][1]);
	}

	chart.add_line({data: data});
	chart.draw();
	updateGraphInfo(field, data[0][0]);

	return data;
}

// Send the user to a new tab to download the CSV data they've requested.
function downloadCSV() {
	var fieldNo = document.getElementById("data-select").value;
	fieldNo = parseInt(fieldNo);
	var url = thingspeakURL + "field/" + fieldNo + ".csv";
	url += "?offset=10&key=" + readKey;

	var start = document.getElementById("start-date").value;
	start = new Date(start);
	var end = document.getElementById("end-date").value;
	end = new Date(end);

	start = thingspeakDate(start);
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

// Date stamps for arrays
function dateStamp(date) {
	return $.datepicker.formatDate("dd:mm:yy", date, {});
}
