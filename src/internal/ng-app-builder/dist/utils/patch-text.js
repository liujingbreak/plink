"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assert = tslib_1.__importStar(require("assert"));
const util = require("util");
class Replacement {
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
    var offset = 0;
    return replacements.reduce((text, update) => {
        var start = update.start + offset;
        var end = update.end + offset;
        var replacement = update.text != null ? update.text : update.replacement;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9wYXRjaC10ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVEQUFpQztBQUNqQyw2QkFBOEI7QUFpQjlCLE1BQWEsV0FBVztJQUN0QixZQUFtQixLQUFhLEVBQVMsR0FBVyxFQUMzQyxJQUFZO1FBREYsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDM0MsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNuQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUNsRixDQUFDO0NBQ0Y7QUFMRCxrQ0FLQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLFlBQThCLEVBQUUsYUFBYSxHQUFHLElBQUksRUFBRSxJQUFZO0lBQ3RHLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUUsQ0FBQztRQUM3QixPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3pCLE9BQU87SUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1FBQy9DLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNuRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLGFBQWEsRUFBRTtnQkFDakIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUMsRUFBRSxDQUFDO2FBQ0w7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQztPQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1dBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0Q7U0FDRjs7WUFDQyxDQUFDLEVBQUUsQ0FBQztLQUNQO0FBQ0gsQ0FBQztBQXRCRCxzREFzQkM7QUFFRCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUFFLFlBQThCO0lBQ3pFLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQVksRUFBRSxNQUFzQixFQUFFLEVBQUU7UUFDbEUsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7UUFDbEMsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7UUFDOUIsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDekUsTUFBTSxJQUFJLENBQUMsV0FBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQVRELHdDQVNDO0FBRUQsU0FBd0IsV0FBVyxDQUFDLElBQVksRUFBRSxZQUE4QixFQUFFLGFBQWEsR0FBRyxLQUFLO0lBQ3JHLHFCQUFxQixDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekQsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFIRCw4QkFHQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy9wYXRjaC10ZXh0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuLyoqXG4gKiBAcGFyYW0gIHtbdHlwZV19IHRleHRcbiAqIEBwYXJhbSAge29iamVjdH0gcmVwbGFjZW1lbnRzXG4gKiBAcGFyYW0gIHtudW1iZXJ9IHJlcGxhY2VtZW50cy5zdGFydFxuICogQHBhcmFtICB7bnVtYmVyfSByZXBsYWNlbWVudHMuZW5kXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJlcGxhY2VtZW50cy5yZXBsYWNlbWVudFxuICogQHJldHVybiB7c3RyaW5nfSAgICAgICAgICAgXHRyZXBsYWNlZCB0ZXh0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVwbGFjZW1lbnRJbmYge1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbiAgdGV4dD86IHN0cmluZztcbiAgcmVwbGFjZW1lbnQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBSZXBsYWNlbWVudCBpbXBsZW1lbnRzIFJlcGxhY2VtZW50SW5mIHtcbiAgY29uc3RydWN0b3IocHVibGljIHN0YXJ0OiBudW1iZXIsIHB1YmxpYyBlbmQ6IG51bWJlcixcbiAgICBwdWJsaWMgdGV4dDogc3RyaW5nKSB7XG4gICAgYXNzZXJ0Lm5vdEVxdWFsKHRleHQsIG51bGwsICdyZXBsYWNlbWVudCB0ZXh0IHNob3VsZCBub3QgYmUgbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX3NvcnRBbmRSZW1vdmVPdmVybGFwKHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSwgcmVtb3ZlT3ZlcmxhcCA9IHRydWUsIHRleHQ6IHN0cmluZykge1xuICByZXBsYWNlbWVudHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEuc3RhcnQgLSBiLnN0YXJ0O1xuICB9KTtcblxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA8IDIpXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBpID0gMSwgbCA9IHJlcGxhY2VtZW50cy5sZW5ndGg7IGkgPCBsOykge1xuICAgIGlmIChyZXBsYWNlbWVudHNbaV0uc3RhcnQgPCByZXBsYWNlbWVudHNbaSAtIDFdLmVuZCkge1xuICAgICAgY29uc3QgcHJldiA9IHJlcGxhY2VtZW50c1tpIC0gMV07XG4gICAgICBjb25zdCBjdXJyID0gcmVwbGFjZW1lbnRzW2ldO1xuICAgICAgaWYgKHJlbW92ZU92ZXJsYXApIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgbC0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBPdmVybGFwIHJlcGxhY2VtZW50czogXG5cdFx0XHRcdFwiJHt0ZXh0LnNsaWNlKGN1cnIuc3RhcnQsIGN1cnIuZW5kKX1cIiAke3V0aWwuaW5zcGVjdChjdXJyKX1cblx0XHRcdFx0YW5kIFwiJHt0ZXh0LnNsaWNlKHByZXYuc3RhcnQsIHByZXYuZW5kKX1cIiAke3V0aWwuaW5zcGVjdChwcmV2KX1gKTtcbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGkrKztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX3JlcGxhY2VTb3J0ZWQodGV4dDogc3RyaW5nLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10pIHtcbiAgdmFyIG9mZnNldCA9IDA7XG4gIHJldHVybiByZXBsYWNlbWVudHMucmVkdWNlKCh0ZXh0OiBzdHJpbmcsIHVwZGF0ZTogUmVwbGFjZW1lbnRJbmYpID0+IHtcbiAgICB2YXIgc3RhcnQgPSB1cGRhdGUuc3RhcnQgKyBvZmZzZXQ7XG4gICAgdmFyIGVuZCA9IHVwZGF0ZS5lbmQgKyBvZmZzZXQ7XG4gICAgdmFyIHJlcGxhY2VtZW50ID0gdXBkYXRlLnRleHQgIT0gbnVsbCA/IHVwZGF0ZS50ZXh0IDogdXBkYXRlLnJlcGxhY2VtZW50O1xuICAgIG9mZnNldCArPSAocmVwbGFjZW1lbnQhLmxlbmd0aCAtIChlbmQgLSBzdGFydCkpO1xuICAgIHJldHVybiB0ZXh0LnNsaWNlKDAsIHN0YXJ0KSArIHJlcGxhY2VtZW50ICsgdGV4dC5zbGljZShlbmQpO1xuICB9LCB0ZXh0KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVwbGFjZUNvZGUodGV4dDogc3RyaW5nLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sIHJlbW92ZU92ZXJsYXAgPSBmYWxzZSkge1xuICBfc29ydEFuZFJlbW92ZU92ZXJsYXAocmVwbGFjZW1lbnRzLCByZW1vdmVPdmVybGFwLCB0ZXh0KTtcbiAgcmV0dXJuIF9yZXBsYWNlU29ydGVkKHRleHQsIHJlcGxhY2VtZW50cyk7XG59XG4iXX0=
