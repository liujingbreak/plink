drTranslate( 'ok' ); // single line comment 1
aaadrTranslate("ok2");
function drTranslate(test: any): void {

}
function drTranslate(test2: any)
{

}
// single line comment 2
var s = 0;
/** ****  * */
if (true) {
	drTranslate
		('ok3');
}
parseInt(10, 10);

VipProfile.query().then(function() {
	if (VipProfile.vipLevelChangeEvent) {
		if (VipProfile.vipLevelChangeEvent.fromLevel < VipProfile.vipLevelChangeEvent.toLevel) {
			vipTooltip.find('.tooltip-inner').removeClass('down').addClass('up')
				.html('<p>' + drTranslate('controller.common.main.congratulation') + '</p><p>' +
				drTranslate('controller.common.main.make_persistent_efforts_oh') + '</p>');
			$scope.tooltip();
		} else if (VipProfile.vipLevelChangeEvent.fromLevel > VipProfile.vipLevelChangeEvent.toLevel) {
			var b = $('<p>' + drTranslate('controller.common.main.sorry') + '</p><p><a href="">' +
			drTranslate('controller.common.main.to_understand_why_the_drop') + '</a></p>');
			vipTooltip.find('.tooltip-inner').removeClass('up').addClass('down').html(b);
			b.find('a').click(function(e: Event) {
				e.preventDefault();
				window.open('/public/help-center');
			});
			$scope.tooltip();
		}
	}
});
