// Navigation bar updating
$('.nav li').click(function(event) {
	$('.nav li').each(function(index) {
		$(this).removeClass('active');
	});
	
	$(this).addClass('active');
});
