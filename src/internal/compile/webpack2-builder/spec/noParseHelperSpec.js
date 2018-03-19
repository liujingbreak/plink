var noParseHalper = require('../configs/noParseHelper');
var log = require('log4js').getLogger(__filename);
describe('noParseHalper', () => {
	it('Result of glob2regexp() should work as regular expression', () => {
		var r = noParseHalper.glob2regexp('/**/*');
		log.info(r);
		r = new RegExp(r);
		expect(r.test('/liujing')).toBe(true);
		expect(r.test('/liu/jing')).toBe(true);
		expect(r.test('/li/uj/ing')).toBe(true);
	});
});
