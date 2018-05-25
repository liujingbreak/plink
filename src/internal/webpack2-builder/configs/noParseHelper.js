var Path = require('path');
const log = require('log4js').getLogger('wfh.noParseHelper');

function glob2regexp(str) {
	var replacements = [];
	var i = 0;
	if (Path.sep === '\\')
		while (i >= 0) {
			i = str.indexOf('/', i);
			if (i >= 0) {
				replacements.push({start: i, end: i + 1, replacement: '\\\\'});
				i++;
			} else
				break;
		}
	i = 0;
	while (i >= 0) {
		i = str.indexOf('.', i);
		if (i >= 0) {
			replacements.push({start: i, end: i + 1, replacement: '\\.'});
			i++;
		} else
			break;
	}
	i = 0;
	while (i >= 0) {
		i = str.indexOf('**/', i);
		if (i >= 0) {
			replacements.push({start: i, end: i + '**/'.length, replacement: '(?:[^\\\\/]+[/\\\\])*'});
			i++;
		} else
			break;
	}
	i = 0;
	while (i >= 0) {
		i = str.indexOf('*', i);
		if (i >= 0) {
			if (str.charAt(i - 1) !== '*' && str.charAt(i + 1) !== '*') {
				replacements.push({start: i, end: i + 1, replacement: '[^/\\\\]+'});
			}
			i++;
		} else
			break;
	}
	var reg = patchText(str, replacements) + '$';
	return reg;
}

function patchText(text, replacements) {
	replacements.sort(function(a, b) {
		return a.start - b.start;
	});
	var offset = 0;
	return replacements.reduce(function(text, update) {
		var start = update.start + offset;
		var end = update.end + offset;
		var replacement = update.replacement;
		offset += (replacement.length - (end - start));
		return text.slice(0, start) + replacement + text.slice(end);
	}, text);
}

class NoParseChecker {
	constructor(noParseArray) {
		this.fileParsableCache = new Map();
		this.patterns = [];
		this.set = new Set();

		noParseArray.forEach(row => {
			if (row instanceof RegExp)
				this.patterns.push(row);
			else
				this.set.add(row);
		});
	}

	isNoParseFor(request) {
		let file = request.substring(request.lastIndexOf('!') + 1);
		if (this.fileParsableCache.has(file))
			return !this.fileParsableCache.get(file);

		let res = false;
		if (this.set.has(file))
			res = true;
		else {
			var unixStyleFile = (Path.sep === '\\') ? file.replace(/\\/g, '/') : file;
			res = this.patterns.some(pat => pat.test(unixStyleFile));
		}
		if (res)
			log.info('noParse:', file);
		this.fileParsableCache.set(file, !res);
		return res;
	}
}

module.exports = {glob2regexp, NoParseChecker};
