"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2gtdGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL3BhdGNoLXRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBQ2pDLDZCQUE4QjtBQW9COUIsTUFBYSxXQUFXO0lBQ3RCOzs7OztPQUtHO0lBQ0gsWUFBbUIsS0FBYSxFQUFTLEdBQVcsRUFDM0MsSUFBWTtRQURGLFVBQUssR0FBTCxLQUFLLENBQVE7UUFBUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQzNDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDbkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGtEQUFrRCxDQUFDLENBQUM7SUFDbEYsQ0FBQztDQUNGO0FBWEQsa0NBV0M7QUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxZQUE4QixFQUFFLGFBQWEsR0FBRyxJQUFJLEVBQUUsSUFBWTtJQUN0RyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUN6QixPQUFPO0lBQ1QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRztRQUMvQyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDbkQsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsSUFBSSxhQUFhLEVBQUU7Z0JBQ2pCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEVBQUUsQ0FBQzthQUNMO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxLQUFLLENBQUM7T0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztXQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQy9EO1NBQ0Y7O1lBQ0MsQ0FBQyxFQUFFLENBQUM7S0FDUDtBQUNILENBQUM7QUF0QkQsc0RBc0JDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLElBQVksRUFBRSxZQUE4QjtJQUN6RSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFZLEVBQUUsTUFBc0IsRUFBRSxFQUFFO1FBQ2xFLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDO1FBQzlCLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQ3pFLE1BQU0sSUFBSSxDQUFDLFdBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlELENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNYLENBQUM7QUFURCx3Q0FTQztBQUVELFNBQXdCLFdBQVcsQ0FBQyxJQUFZLEVBQUUsWUFBOEIsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUNyRyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pELE9BQU8sY0FBYyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBSEQsOEJBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG4vKipcbiAqIEBwYXJhbSAge1t0eXBlXX0gdGV4dFxuICogQHBhcmFtICB7b2JqZWN0fSByZXBsYWNlbWVudHNcbiAqIEBwYXJhbSAge251bWJlcn0gcmVwbGFjZW1lbnRzLnN0YXJ0XG4gKiBAcGFyYW0gIHtudW1iZXJ9IHJlcGxhY2VtZW50cy5lbmRcbiAqIEBwYXJhbSAge3N0cmluZ30gcmVwbGFjZW1lbnRzLnJlcGxhY2VtZW50XG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICAgICAgICBcdHJlcGxhY2VkIHRleHRcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXBsYWNlbWVudEluZiB7XG4gIHN0YXJ0OiBudW1iZXI7XG4gIC8qKlxuICAgKiBleGNsdWRlZCBpbmRleFxuICAgKi9cbiAgZW5kOiBudW1iZXI7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIHJlcGxhY2VtZW50Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUmVwbGFjZW1lbnQgaW1wbGVtZW50cyBSZXBsYWNlbWVudEluZiB7XG4gIC8qKlxuICAgKiBSZXBsYWNlbWVudFxuICAgKiBAcGFyYW0gc3RhcnQgaW5jbHVkZWQgaW5kZXhcbiAgICogQHBhcmFtIGVuZCBleGNsdWRlZCBpbmRleFxuICAgKiBAcGFyYW0gdGV4dFxuICAgKi9cbiAgY29uc3RydWN0b3IocHVibGljIHN0YXJ0OiBudW1iZXIsIHB1YmxpYyBlbmQ6IG51bWJlcixcbiAgICBwdWJsaWMgdGV4dDogc3RyaW5nKSB7XG4gICAgYXNzZXJ0Lm5vdEVxdWFsKHRleHQsIG51bGwsICdyZXBsYWNlbWVudCB0ZXh0IHNob3VsZCBub3QgYmUgbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX3NvcnRBbmRSZW1vdmVPdmVybGFwKHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSwgcmVtb3ZlT3ZlcmxhcCA9IHRydWUsIHRleHQ6IHN0cmluZykge1xuICByZXBsYWNlbWVudHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEuc3RhcnQgLSBiLnN0YXJ0O1xuICB9KTtcblxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA8IDIpXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBpID0gMSwgbCA9IHJlcGxhY2VtZW50cy5sZW5ndGg7IGkgPCBsOykge1xuICAgIGlmIChyZXBsYWNlbWVudHNbaV0uc3RhcnQgPCByZXBsYWNlbWVudHNbaSAtIDFdLmVuZCkge1xuICAgICAgY29uc3QgcHJldiA9IHJlcGxhY2VtZW50c1tpIC0gMV07XG4gICAgICBjb25zdCBjdXJyID0gcmVwbGFjZW1lbnRzW2ldO1xuICAgICAgaWYgKHJlbW92ZU92ZXJsYXApIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgbC0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBPdmVybGFwIHJlcGxhY2VtZW50czogXG5cdFx0XHRcdFwiJHt0ZXh0LnNsaWNlKGN1cnIuc3RhcnQsIGN1cnIuZW5kKX1cIiAke3V0aWwuaW5zcGVjdChjdXJyKX1cblx0XHRcdFx0YW5kIFwiJHt0ZXh0LnNsaWNlKHByZXYuc3RhcnQsIHByZXYuZW5kKX1cIiAke3V0aWwuaW5zcGVjdChwcmV2KX1gKTtcbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGkrKztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX3JlcGxhY2VTb3J0ZWQodGV4dDogc3RyaW5nLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10pIHtcbiAgdmFyIG9mZnNldCA9IDA7XG4gIHJldHVybiByZXBsYWNlbWVudHMucmVkdWNlKCh0ZXh0OiBzdHJpbmcsIHVwZGF0ZTogUmVwbGFjZW1lbnRJbmYpID0+IHtcbiAgICB2YXIgc3RhcnQgPSB1cGRhdGUuc3RhcnQgKyBvZmZzZXQ7XG4gICAgdmFyIGVuZCA9IHVwZGF0ZS5lbmQgKyBvZmZzZXQ7XG4gICAgdmFyIHJlcGxhY2VtZW50ID0gdXBkYXRlLnRleHQgIT0gbnVsbCA/IHVwZGF0ZS50ZXh0IDogdXBkYXRlLnJlcGxhY2VtZW50O1xuICAgIG9mZnNldCArPSAocmVwbGFjZW1lbnQhLmxlbmd0aCAtIChlbmQgLSBzdGFydCkpO1xuICAgIHJldHVybiB0ZXh0LnNsaWNlKDAsIHN0YXJ0KSArIHJlcGxhY2VtZW50ICsgdGV4dC5zbGljZShlbmQpO1xuICB9LCB0ZXh0KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVwbGFjZUNvZGUodGV4dDogc3RyaW5nLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sIHJlbW92ZU92ZXJsYXAgPSBmYWxzZSkge1xuICBfc29ydEFuZFJlbW92ZU92ZXJsYXAocmVwbGFjZW1lbnRzLCByZW1vdmVPdmVybGFwLCB0ZXh0KTtcbiAgcmV0dXJuIF9yZXBsYWNlU29ydGVkKHRleHQsIHJlcGxhY2VtZW50cyk7XG59XG4iXX0=