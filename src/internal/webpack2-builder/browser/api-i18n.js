/* eslint no-console: 0 */
/* no import-lodash-loader */
var Url = require('url');

module.exports = {
	getPrefLanguage() {
		var _ = this._ensureLodash();
		var availables = this.config().locales;

		var chooseLang = [
			navigator.language,
			navigator.browserLanguage,
			navigator.systemLanguage,
			navigator.userLanguage
		];
		if (navigator.languages  && navigator.languages.length > 0) {
			chooseLang.unshift(navigator.languages[0]);
		}

		if (navigator.languages && navigator.languages.length > 1) {
			chooseLang = chooseLang.concat(navigator.languages.slice(1));
		}
		var pref;
		if (!_.some(chooseLang, function(language) {
			if (language && _.includes(availables, language)) {
				pref = language;
				return true;
			}
			return false;
		})) {
			_.some(chooseLang, function(language) {
				var forbackLang = /[a-zA-Z]*/.exec(language);
				forbackLang = forbackLang ? forbackLang[0] : false;
				if (forbackLang && _.includes(availables, forbackLang)) {
					pref = forbackLang;
					return true;
				}
			});
		}
		pref = pref ? pref : this.config.get('locales[0]', 'zh');
		return pref;
	},

	_getOtherLocaleUrl: function(lang) {
		var _ = this._ensureLodash();
		lang = _.trim(lang, '/');
		var url;
		var publicUrl = this.config().staticAssetsURL;
		if (!publicUrl)
			publicUrl = '/';
		var publicUrlObj = Url.parse(_.startsWith(publicUrl, '//') ? 'http:' + publicUrl : publicUrl);
		var publicPath = publicUrlObj.path;
		var currUrlObj = Url.parse(location.href);
		var currPath = currUrlObj.path + (currUrlObj.hash ? currUrlObj.hash : '');
		if (currPath.indexOf(publicPath) !== 0) {
			console.log('DRCP does not support different CDN yet.');
			return url;
		}
		if (lang === this.config.get('locales[0]', 'zh')) // default locale
			url = this.assetsUrl(this.entryPage); // should not need to handle default locale
		else
			url = this._joinUrl(this.config().staticAssetsURL, lang, currPath.substring(publicPath.length));
		return /^(https?:|data:|\/)/.test(url) ? url : '/' + url;
	},

	reloadToLocale(lang) {
		if (!this.isDefaultLocale())
			return false;
		var _ = this._ensureLodash();
		lang = _.trim(lang, '/');
		if (this.buildLocale !== lang) {
			window.location = this._getOtherLocaleUrl(lang);
			return true;
		}
		return false;
	},

	isDefaultLocale() {
		return this.buildLocale === this.config.get('locales[0]', 'zh');
	},

	getBuildLocale() {
		return this.buildLocale;
	}
};
