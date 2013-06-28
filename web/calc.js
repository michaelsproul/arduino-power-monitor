/* This file requires 3 global variables specific to your feed: */
/* xively_key (the API key), feedID (your feed ID) and datastreamID */

// Data points every 5 minutes
var global_interval = 300;

$(document).ready(function($) {
	init();
	live_power();
	last_x_hours(6, "#energy6h");
	last_x_hours(12, "#energy12h");
	last_x_hours(24, "#energy24h");
});

function init()
{
	cosm.setKey(xively_key);
}

function recalc_variable_energy()
{
	last_x_hours($("#energyxh_input").val(), "#energyxh");
}

function live_power()
{
	var selector = "#currentpower";
	cosm.datastream.get(feedID, datastreamID, function (datastream) {
		// Set the current power field		
		$(selector).html(datastream["current_value"]);
		
		// Keep it in sync with realtime data
		cosm.datastream.subscribe(feedID, datastreamID, function (event , datastream_updated) { 
      			$(selector).html(datastream_updated["current_value"]);
    		});
	});
}

function last_x_hours(hours, selector)
{
	var rightnow = new Date();	
	var options = {
		end: rightnow.toISOString(),
		duration: hours + "hours",
		limit: 1000,
		interval: global_interval
	};
	cosm.datastream.history (feedID, datastreamID, options, function(data) {
			var energy = 0;
			for (x in data.datapoints) {
				energy += parseInt(data.datapoints[x].value)/ (12*1000);
				// 5 minutes is 1/12th of an hour, and a W is 1000th of a kW
			}
			// Cleanup the value before displaying it
			energy = Math.round(energy*100) / 100;
			$(selector).html(energy);
		}
	);
}

// TODO: Fix this
function populate_lists()
{
	var stream_options = $("#stream_list");	
	cosm.datastream.list(feedID, function(data) {
		for (x in data.datastreams) {
			alert("HELLLO!");	
		}			
	});
}

function download()
{
	var url = "http://api.cosm.com/v2/feeds/" + feedID + ".csv?";
	url += "datastreams=" + $("#stream_list").val();
	url += "&duration=" + $("#duration_size").val() + $("#duration_units").val();
	window.open(url, '_blank');
}



