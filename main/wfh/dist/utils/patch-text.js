"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._replaceSorted = exports._sortAndRemoveOverlap = exports.Replacement = void 0;
const assert = __importStar(require("assert"));
const util = require("util");
class Replacement {
    /**
     * Replacement
     * @param start included index
     * @param end excluded index
     * @param text
     */
    constructor(start, end, text) {
        this.start = start;
        this.end = end;
        this.text = text;
        assert.notEqual(text, null, 'replacement text should not be null or undefined');
    }
}
exports.Replacement = Replacement;
function _sortAndRemoveOverlap(replacements, removeOverlap = true, text) {
    replacements.sort(function (a, b) {
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
            }
            else {
                throw new Error(`Overlap replacements: 
				"${text.slice(curr.start, curr.end)}" ${util.inspect(curr)}
				and "${text.slice(prev.start, prev.end)}" ${util.inspect(prev)}`);
            }
        }
        else
            i++;
    }
}
exports._sortAndRemoveOverlap = _sortAndRemoveOverlap;
function _replaceSorted(text, replacements) {
    let offset = 0;
    return replacements.reduce((text, update) => {
        const start = update.start + offset;
        const end = update.end + offset;
        const replacement = update.text != null ? update.text : update.replacement;
        offset += (replacement.length - (end - start));
        return text.slice(0, start) + replacement + text.slice(end);
    }, text);
}
exports._replaceSorted = _replaceSorted;
function replaceCode(text, replacements, removeOverlap = false) {
    _sortAndRemoveOverlap(replacements, removeOverlap, text);
    return _replaceSorted(text, replacements);
}
exports.default = replaceCode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2gtdGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL3BhdGNoLXRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQyw2QkFBOEI7QUFvQjlCLE1BQWEsV0FBVztJQUN0Qjs7Ozs7T0FLRztJQUNILFlBQW1CLEtBQWEsRUFBUyxHQUFXLEVBQzNDLElBQVk7UUFERixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUMzQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ25CLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7Q0FDRjtBQVhELGtDQVdDO0FBRUQsU0FBZ0IscUJBQXFCLENBQUMsWUFBOEIsRUFBRSxhQUFhLEdBQUcsSUFBSSxFQUFFLElBQVk7SUFDdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDekIsT0FBTztJQUNULEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUc7UUFDL0MsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO1lBQ25ELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLElBQUksYUFBYSxFQUFFO2dCQUNqQixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxFQUFFLENBQUM7YUFDTDtpQkFBTTtnQkFDTCxNQUFNLElBQUksS0FBSyxDQUFDO09BQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7V0FDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUMvRDtTQUNGOztZQUNDLENBQUMsRUFBRSxDQUFDO0tBQ1A7QUFDSCxDQUFDO0FBdEJELHNEQXNCQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxJQUFZLEVBQUUsWUFBOEI7SUFDekUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBWSxFQUFFLE1BQXNCLEVBQUUsRUFBRTtRQUNsRSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUNoQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUMzRSxNQUFNLElBQUksQ0FBQyxXQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5RCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDWCxDQUFDO0FBVEQsd0NBU0M7QUFFRCxTQUF3QixXQUFXLENBQUMsSUFBWSxFQUFFLFlBQThCLEVBQUUsYUFBYSxHQUFHLEtBQUs7SUFDckcscUJBQXFCLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6RCxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUhELDhCQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuLyoqXG4gKiBAcGFyYW0gIHtbdHlwZV19IHRleHRcbiAqIEBwYXJhbSAge29iamVjdH0gcmVwbGFjZW1lbnRzXG4gKiBAcGFyYW0gIHtudW1iZXJ9IHJlcGxhY2VtZW50cy5zdGFydFxuICogQHBhcmFtICB7bnVtYmVyfSByZXBsYWNlbWVudHMuZW5kXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJlcGxhY2VtZW50cy5yZXBsYWNlbWVudFxuICogQHJldHVybiB7c3RyaW5nfSAgICAgICAgICAgXHRyZXBsYWNlZCB0ZXh0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVwbGFjZW1lbnRJbmYge1xuICBzdGFydDogbnVtYmVyO1xuICAvKipcbiAgICogZXhjbHVkZWQgaW5kZXhcbiAgICovXG4gIGVuZDogbnVtYmVyO1xuICB0ZXh0Pzogc3RyaW5nO1xuICByZXBsYWNlbWVudD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFJlcGxhY2VtZW50IGltcGxlbWVudHMgUmVwbGFjZW1lbnRJbmYge1xuICAvKipcbiAgICogUmVwbGFjZW1lbnRcbiAgICogQHBhcmFtIHN0YXJ0IGluY2x1ZGVkIGluZGV4XG4gICAqIEBwYXJhbSBlbmQgZXhjbHVkZWQgaW5kZXhcbiAgICogQHBhcmFtIHRleHRcbiAgICovXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBzdGFydDogbnVtYmVyLCBwdWJsaWMgZW5kOiBudW1iZXIsXG4gICAgcHVibGljIHRleHQ6IHN0cmluZykge1xuICAgIGFzc2VydC5ub3RFcXVhbCh0ZXh0LCBudWxsLCAncmVwbGFjZW1lbnQgdGV4dCBzaG91bGQgbm90IGJlIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9zb3J0QW5kUmVtb3ZlT3ZlcmxhcChyZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sIHJlbW92ZU92ZXJsYXAgPSB0cnVlLCB0ZXh0OiBzdHJpbmcpIHtcbiAgcmVwbGFjZW1lbnRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLnN0YXJ0IC0gYi5zdGFydDtcbiAgfSk7XG5cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPCAyKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgaSA9IDEsIGwgPSByZXBsYWNlbWVudHMubGVuZ3RoOyBpIDwgbDspIHtcbiAgICBpZiAocmVwbGFjZW1lbnRzW2ldLnN0YXJ0IDwgcmVwbGFjZW1lbnRzW2kgLSAxXS5lbmQpIHtcbiAgICAgIGNvbnN0IHByZXYgPSByZXBsYWNlbWVudHNbaSAtIDFdO1xuICAgICAgY29uc3QgY3VyciA9IHJlcGxhY2VtZW50c1tpXTtcbiAgICAgIGlmIChyZW1vdmVPdmVybGFwKSB7XG4gICAgICAgIHJlcGxhY2VtZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGwtLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgT3ZlcmxhcCByZXBsYWNlbWVudHM6IFxuXHRcdFx0XHRcIiR7dGV4dC5zbGljZShjdXJyLnN0YXJ0LCBjdXJyLmVuZCl9XCIgJHt1dGlsLmluc3BlY3QoY3Vycil9XG5cdFx0XHRcdGFuZCBcIiR7dGV4dC5zbGljZShwcmV2LnN0YXJ0LCBwcmV2LmVuZCl9XCIgJHt1dGlsLmluc3BlY3QocHJldil9YCk7XG4gICAgICB9XG4gICAgfSBlbHNlXG4gICAgICBpKys7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9yZXBsYWNlU29ydGVkKHRleHQ6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gIGxldCBvZmZzZXQgPSAwO1xuICByZXR1cm4gcmVwbGFjZW1lbnRzLnJlZHVjZSgodGV4dDogc3RyaW5nLCB1cGRhdGU6IFJlcGxhY2VtZW50SW5mKSA9PiB7XG4gICAgY29uc3Qgc3RhcnQgPSB1cGRhdGUuc3RhcnQgKyBvZmZzZXQ7XG4gICAgY29uc3QgZW5kID0gdXBkYXRlLmVuZCArIG9mZnNldDtcbiAgICBjb25zdCByZXBsYWNlbWVudCA9IHVwZGF0ZS50ZXh0ICE9IG51bGwgPyB1cGRhdGUudGV4dCA6IHVwZGF0ZS5yZXBsYWNlbWVudDtcbiAgICBvZmZzZXQgKz0gKHJlcGxhY2VtZW50IS5sZW5ndGggLSAoZW5kIC0gc3RhcnQpKTtcbiAgICByZXR1cm4gdGV4dC5zbGljZSgwLCBzdGFydCkgKyByZXBsYWNlbWVudCArIHRleHQuc2xpY2UoZW5kKTtcbiAgfSwgdGV4dCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlcGxhY2VDb2RlKHRleHQ6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdLCByZW1vdmVPdmVybGFwID0gZmFsc2UpIHtcbiAgX3NvcnRBbmRSZW1vdmVPdmVybGFwKHJlcGxhY2VtZW50cywgcmVtb3ZlT3ZlcmxhcCwgdGV4dCk7XG4gIHJldHVybiBfcmVwbGFjZVNvcnRlZCh0ZXh0LCByZXBsYWNlbWVudHMpO1xufVxuIl19