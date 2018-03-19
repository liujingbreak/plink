module.exports = function replaceCode(text, replacements) {
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
};
