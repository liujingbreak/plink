import * as assert from 'assert';
import util from 'util';

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
  /**
   * excluded index
   */
  end: number;
  text?: string;
  replacement?: string;
}

export class Replacement implements ReplacementInf {
  /**
   * Replacement
   * @param start included index
   * @param end excluded index
   * @param text
   */
  constructor(public start: number, public end: number,
    public text: string) {
    assert.notEqual(text, null, 'replacement text should not be null or undefined');
  }
}

export function _sortAndRemoveOverlap(replacements: ReplacementInf[], removeOverlap = true, text: string) {
  replacements.sort(function(a, b) {
    return a.start - b.start;
  });

  if (replacements.length < 2)
    return;
  for (let i = 1, l = replacements.length; i < l;) {
    if (replacements[i].start < replacements[i - 1].end) {
      const prev = replacements[i - 1];
      const curr = replacements[i];
      if (removeOverlap) {
        replacements.splice(i, 1);
        l--;
      } else {
        throw new Error(`Overlap replacements: 
				"${text.slice(curr.start, curr.end)}" ${util.inspect(curr)}
				and "${text.slice(prev.start, prev.end)}" ${util.inspect(prev)}`);
      }
    } else
      i++;
  }
}

export function _replaceSorted(text: string, replacements: ReplacementInf[]) {
  let offset = 0;
  return replacements.reduce((text: string, update: ReplacementInf) => {
    const start = update.start + offset;
    const end = update.end + offset;
    const replacement = update.text != null ? update.text : update.replacement;
    offset += (replacement!.length - (end - start));
    return text.slice(0, start) + replacement + text.slice(end);
  }, text);
}

export default function replaceCode(text: string, replacements: ReplacementInf[], removeOverlap = false) {
  _sortAndRemoveOverlap(replacements, removeOverlap, text);
  return _replaceSorted(text, replacements);
}
