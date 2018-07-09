"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
class Replacement {
    constructor(start, end, text) {
        this.start = start;
        this.end = end;
        this.text = text;
        assert.notEqual(text, null, 'replacement text should not be null or undefined');
    }
}
exports.Replacement = Replacement;
function replaceCode(text, replacements) {
    replacements.sort(function (a, b) {
        return a.start - b.start;
    });
    var offset = 0;
    return replacements.reduce((text, update) => {
        var start = update.start + offset;
        var end = update.end + offset;
        var replacement = update.text == null ? update.replacement : update.text;
        offset += (replacement.length - (end - start));
        return text.slice(0, start) + replacement + text.slice(end);
    }, text);
}
exports.default = replaceCode;

//# sourceMappingURL=patch-text.js.map
