

describe('In api i18n functions', () => {
	beforeEach(() => {
		delete require.cache[require.resolve('../browser/api')];
	});
	it('When staticAssetsURL is "http://localhost:14333" _getOtherLocaleUrl should work', () => {
		global.LEGO_CONFIG = {
			_outputAsNames: [],
			staticAssetsURL: 'http://localhost:14333',
			buildLocale: 'zh',
			locales: ['zh', 'en', 'jp']
		};
		global.window = {};
		global.__drcpEntryPage = 'test.html';
		global.location = {
			href: 'http://localhost:14333'
		};

		global.LEGO_CONFIG._outputAsNames = [];
		var Api = require('../browser/api');
		var api = new Api('@dr/test', 'test');
		var url = api._getOtherLocaleUrl('en');
		expect(url).toBe('http://localhost:14333/en');

		delete require.cache[require.resolve('../browser/api')];
		global.location = {
			href: 'http://localhost:14333/'
		};
		global.LEGO_CONFIG._outputAsNames = [];
		Api = require('../browser/api');
		api = new Api('@dr/test', 'test');
		url = api._getOtherLocaleUrl('en');
		expect(url).toBe('http://localhost:14333/en');

		delete require.cache[require.resolve('../browser/api')];
		global.location = {
			href: 'http://localhost:14333/hellow/index.html#/'
		};
		global.LEGO_CONFIG._outputAsNames = [];
		Api = require('../browser/api');
		api = new Api('@dr/test', 'test');
		url = api._getOtherLocaleUrl('en');
		expect(url).toBe('http://localhost:14333/en/hellow/index.html#/');
	});

	it('When staticAssetsURL is "http://localhost:14333/mkt/ldm" _getOtherLocaleUrl should work', () => {
		global.LEGO_CONFIG = {
			_outputAsNames: [],
			staticAssetsURL: 'http://localhost:14333/mkt/ldm',
			buildLocale: 'zh',
			locales: ['zh', 'en', 'jp']
		};
		global.window = {};
		global.__drcpEntryPage = 'test.html';
		global.location = {
			href: 'http://localhost:14333/mkt/ldm/hellow/index.html#/abc'
		};
		global.LEGO_CONFIG._outputAsNames = [];
		var Api = require('../browser/api');
		var api = new Api('@dr/test', 'test');
		var url = api._getOtherLocaleUrl('en');
		expect(url).toBe('http://localhost:14333/mkt/ldm/en/hellow/index.html#/abc');

		delete require.cache[require.resolve('../browser/api')];
		global.location = {
			href: 'http://localhost:14333/mkt/ldm/index.html#/abc'
		};
		global.LEGO_CONFIG._outputAsNames = [];
		Api = require('../browser/api');
		api = new Api('@dr/test', 'test');
		url = api._getOtherLocaleUrl('en');
		expect(url).toBe('http://localhost:14333/mkt/ldm/en/index.html#/abc');
	});

	it('When staticAssetsURL begin with "//" _getOtherLocaleUrl should work', () => {
		global.LEGO_CONFIG = {
			_outputAsNames: [],
			staticAssetsURL: '//localhost:14333/mkt/ldm',
			buildLocale: 'zh',
			locales: ['zh', 'en', 'jp']
		};
		global.window = {};
		global.__drcpEntryPage = 'test.html';
		global.location = {
			href: 'http://localhost:14333/mkt/ldm/hellow/index.html#/abc'
		};
		global.LEGO_CONFIG._outputAsNames = [];
		var Api = require('../browser/api');
		var api = new Api('@dr/test', 'test');
		var url = api._getOtherLocaleUrl('en');
		expect(url).toBe('//localhost:14333/mkt/ldm/en/hellow/index.html#/abc');
	});

	it('When staticAssetsURL is like "/mkt/ldm" _getOtherLocaleUrl should work', () => {
		global.LEGO_CONFIG = {
			_outputAsNames: [],
			staticAssetsURL: '/mkt/ldm',
			buildLocale: 'zh',
			locales: ['zh', 'en', 'jp']
		};
		global.window = {};
		global.__drcpEntryPage = 'test.html';
		global.location = {
			href: 'http://localhost:14333/mkt/ldm/hellow/index.html#/abc'
		};
		var Api = require('../browser/api');
		var api = new Api('@dr/test', 'test');
		var url = api._getOtherLocaleUrl('en');
		expect(url).toBe('/mkt/ldm/en/hellow/index.html#/abc');

		delete require.cache[require.resolve('../browser/api')];
		global.LEGO_CONFIG.staticAssetsURL = '/mkt/ldm/';
		global.LEGO_CONFIG._outputAsNames = [];
		global.location = {
			href: 'http://localhost:14333/mkt/ldm/hellow/index.html#/abc'
		};
		Api = require('../browser/api');
		api = new Api('@dr/test', 'test');
		url = api._getOtherLocaleUrl('en');
		expect(url).toBe('/mkt/ldm/en/hellow/index.html#/abc');
	});

	it('When staticAssetsURL is like "" _getOtherLocaleUrl should work', () => {
		global.LEGO_CONFIG = {
			_outputAsNames: [],
			staticAssetsURL: '',
			buildLocale: 'zh',
			locales: ['zh', 'en', 'jp']
		};
		global.window = {};
		global.__drcpEntryPage = 'test.html';
		global.location = {
			href: 'http://localhost:14333/index.html#/abc'
		};
		var Api = require('../browser/api');
		var api = new Api('@dr/test', 'test');
		var url = api._getOtherLocaleUrl('en');
		expect(url).toBe('/en/index.html#/abc');
	});
});
