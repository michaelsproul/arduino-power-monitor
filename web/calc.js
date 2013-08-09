// ThingSpeak url: Define your channel and read key in a separate file
var thingspeakURL = "http://api.thingspeak.com/channels/" + channel + "/";

$(document).ready(function($) {
	getLivePower();
	setInterval('getLivePower()', 10000);

	getPowerHist();
});

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

function getPowerHist() {
	var url = thingspeakURL + "field/1.json?callback=?&offset=10&results=2&key=" + readKey;
	var chart_data = { data: []};
	$.getJSON(url, function(data) {
		var l = data.feeds.length;
		for (var i = 0; i < l; i++) {
			var date_string = data.feeds[i].created_at;
			var date = new Date(date_string);
			var power = parseInt(data.feeds[i].field1);
			chart_data.data.push([date, power]);
		}
		graphPower(chart_data);
	});
}

function graphPower(chart_data) {
	var options = { show_y_labels: false, label_max: true, label_min: true };
	var chart = new Charts.LineChart('powerchart', options);

	chart.add_line(chart_data);
	chart.draw();
}

// TODO: Don't hard code the time off set... Use date trickery

