function layoutInit() {
	fillSelectors();
	navUpdateEnable();

	// Popovers
	updateEnergyInfo();
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
function fillSelectors() {
	var select = $("#data-select");	

	for (var f in fields) {
		var option = "<option value=" + fields[f].number + ">";
		option += fields[f].name + "</option>";
		select.html(select.html() + option);
	}
}

// Create a popover with the chart info.
function updateGraphInfo(field, date) {
	var title = field.name + " on ";
	title += $.datepicker.formatDate("DD, MM d", date, {});

	var options = {
		placement: "top",
		trigger: "hover",
		title: title,
	};

	$("#graph-info").tooltip(options);
}

function updateEnergyInfo() {
	var title = "Peak & Off-peak usage, since 12am";
	var options = {
		placement: "bottom",
		title: title,
	}

	$("#energy-today").tooltip(options);
}

// TODO: Nice messages for the energy info

