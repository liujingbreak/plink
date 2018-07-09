import * as assert from 'assert';

/**
 * @param  {[type]} text
 * @param  {object} replacements
 * @param  {number} replacements.start
 * @param  {number} replacements.end
 * @param  {string} replacements.replacement
 * @return {string}           	replaced text
 */
export interface ReplacementInf {
	start: number;
	end: number;
	text?: string;
	replacement?: string;
}

export class Replacement implements ReplacementInf {
	constructor(public start: number, public end: number,
		public text: string) {
		assert.notEqual(text, null, 'replacement text should not be null or undefined');
	}
}

export default function replaceCode(text: string, replacements: ReplacementInf[]) {
	replacements.sort(function(a, b) {
		return a.start - b.start;
	});
	var offset = 0;
	return replacements.reduce((text: string, update: ReplacementInf) => {
		var start = update.start + offset;
		var end = update.end + offset;
		var replacement = update.text == null ? update.replacement : update.text;
		offset += (replacement.length - (end - start));
		return text.slice(0, start) + replacement + text.slice(end);
	}, text);
}
