// ThingSpeak url: Define your channel and API read key in a separate file
var thingspeakURL = "http://api.thingspeak.com/channels/" + channel + "/";

// A map to define the Thingspeak field number for each data stream.
var fields = {totalpower: 1, peak: 2, offpeak: 3, temp:4};

$(document).ready(function($) {
	getLivePower();
	setInterval('getLivePower()', 30000);

	// Calculate stats for today
	var download = getData(daysAgo(20), fields.totalpower);
	$.when(download.handler).done(function(junk) {
		// Calculate energy usage
		$("#energytoday").html("Calculating...");
		var energy = calcEnergy(download.data);
		energy = Math.round(energy*100)/100;
		$("#energytoday").html(energy);

		// Graph power usage
		var chartData = timeAverage(download.data, 100);
		graphData('powerchart', chartData);
	});
});

// Fetch the latest power data and update the page accordingly.
function getLivePower() {
	var url = thingspeakURL + "feeds/last.json?callback=?&offset=10&key=" + readKey;
	$.getJSON(url, function(data) {
		if (data.field1) {
			$("#totalpower").html(data.field1);
			$("#peakpower").html(data.field2);
			$("#offpeakpower").html(data.field3);	
		}
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
		// Rollback the desired number of days
		end.setDate(end.getDate() - x);
		end.setHours(23);
		end.setMinutes(59);
		end.setSeconds(59);
	}
	var start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);

	return {start: start, end: end};
}

// Fetch a single field's data for a given start and end time.
function getData(time, fieldNumber) {
	var url = thingspeakURL + "field/" + fieldNumber + ".json";
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

	return {handler: handler, data: data};
}

// Condense a large data set into a smaller, time averaged data set.
function timeAverage(data, skip) {
	var l = data.length;	
	var newData = [];
	
	for (var i = 0; i < l - 1; i += skip) {
		var durationSum = 0.0; // seconds
		var weightedPower = 0.0; // watt seconds (J)
		for (var j = i; j < i + skip && j < l - 1; j++) {
			var duration = data[j + 1][0].getTime();
			duration -= data[j][0].getTime();
			duration /= 1000;
			durationSum += duration;
			weightedPower += data[j][1]*duration;
		}
		var avgPower = weightedPower/durationSum;
		avgPower = Math.round(avgPower);
		var midDate = data[i][0];
		newData.push([midDate, avgPower]);
	}
	return newData;
}

// Calculate the energy used in a given period by integrating power over time.
function calcEnergy(data) {
	var l = data.length;
	var energy = 0.0; // Wh

	var duration = 0.0; // hours
	var power = 0.0; // watts

	for (var i = 0; i < l - 1; i++) {
		// Get time difference between this point and the previous one
		duration = data[i + 1][0].getTime();
		duration -= data[i][0].getTime();

		// Convert milliseconds to hours
		duration /= (1000*3600);

		energy += data[i][1]*duration;
	}
	return energy/1000; // kWh
}

// Create a graph from an array of data pairs.
// graphID: The id of the graph element (a div).
function graphData(graphID, data) {

	if (data.length == 0)
	{
		$("#" + graphID).html("<p>No data.</p>");
		return;
	}	

	$("#" + graphID).css("height", "800px");
	var options = {
			show_y_labels: false,
			y_axis_scale: [0, ],
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
	}

	chart.add_line({data: data});
	chart.draw();
}

// Convert a date object to YYYY-MM-DD%20HH-mm-SS
function thingspeakDate(date) {
	var string = date.toISOString();
	string = string.substr(0, string.indexOf('.'));
	string.replace("T", "%20");
	return string;
}

