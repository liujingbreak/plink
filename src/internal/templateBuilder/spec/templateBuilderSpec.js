var templateBuilder = require('../templateBuilder.js');
var Path = require('path');
var fs = require('fs');
// var log4js = require('log4js');
// log4js.getLogger('@dr/template-builder').setLevel('DEBUG');

describe('templateBuilder', () => {
	xit('.preParseTemplate() should work', () => {
		var file = Path.resolve(__dirname, 'res', 'layout.html');
		var template = fs.readFileSync(file, 'utf8');
		var mock = {
			replaceHandler: function(old) {
				return 'AAA';
			}
		};
		spyOn(mock, 'replaceHandler').and.callThrough();
		var newTemplate = templateBuilder.testable.preParseTemplate(file, template, mock.replaceHandler);
		expect(mock.replaceHandler).toHaveBeenCalledTimes(9);
		console.log(newTemplate);
	});
});
