// ThingSpeak url: Define your channel and read key in a separate file
var thingspeakUrl = "http://api.thingspeak.com/channels/" + channel + "/";

$(document).ready(function($) {
	getLivePower();
	setInterval('getLivePower()', 10000);
});

function getLivePower() {
	var url = thingspeakUrl + "feeds/last.json?callback=?&offset=10&key=" + readKey;
	$.getJSON(url, function(data) {
		if (data.field1) {
			$("#totalpower").html(data.field1);
			$("#peakpower").html(data.field2);
			$("#offpeakpower").html(data.field3);	
		}
	});
}
