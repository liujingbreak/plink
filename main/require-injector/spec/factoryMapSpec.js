//var _ = require('lodash');
var {FactoryMap} = require('../dist/factory-map');

describe('FactoryMap', ()=> {
	it('matchRequire() should work for Regex', ()=> {
		var fm = new FactoryMap();
		fm.substitute(/[^\{]*\{\{([^\{]+)\}\}/, function() {});
		expect(fm.regexSettings.length === 1);
		var setting = fm.matchRequire('foo{{bar}}');
		console.log(setting);
		expect(setting.execResult[1]).toBe('bar');
	});
});
