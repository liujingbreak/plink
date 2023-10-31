var loader = require('../webpack-loader');

describe('require-injector-loader', () => {
	xit('parseQuery() should work', ()=> {
		expect(loader.parseQuery('?injector=a/bced/fe&something').injector).toBe('a/bced/fe');
		expect(loader.parseQuery('?injector="f f"').injector).toBe('"f f"');
	});
});
