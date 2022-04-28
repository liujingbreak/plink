"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2gtdGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL3BhdGNoLXRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFDakMsNkJBQThCO0FBb0I5QixNQUFhLFdBQVc7SUFDdEI7Ozs7O09BS0c7SUFDSCxZQUFtQixLQUFhLEVBQVMsR0FBVyxFQUMzQyxJQUFZO1FBREYsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDM0MsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNuQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUNsRixDQUFDO0NBQ0Y7QUFYRCxrQ0FXQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLFlBQThCLEVBQUUsYUFBYSxHQUFHLElBQUksRUFBRSxJQUFZO0lBQ3RHLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUUsQ0FBQztRQUM3QixPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3pCLE9BQU87SUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1FBQy9DLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNuRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLGFBQWEsRUFBRTtnQkFDakIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUMsRUFBRSxDQUFDO2FBQ0w7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQztPQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1dBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0Q7U0FDRjs7WUFDQyxDQUFDLEVBQUUsQ0FBQztLQUNQO0FBQ0gsQ0FBQztBQXRCRCxzREFzQkM7QUFFRCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUFFLFlBQThCO0lBQ3pFLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQVksRUFBRSxNQUFzQixFQUFFLEVBQUU7UUFDbEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7UUFDaEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDM0UsTUFBTSxJQUFJLENBQUMsV0FBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQVRELHdDQVNDO0FBRUQsU0FBd0IsV0FBVyxDQUFDLElBQVksRUFBRSxZQUE4QixFQUFFLGFBQWEsR0FBRyxLQUFLO0lBQ3JHLHFCQUFxQixDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekQsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFIRCw4QkFHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8qKlxuICogQHBhcmFtICB7W3R5cGVdfSB0ZXh0XG4gKiBAcGFyYW0gIHtvYmplY3R9IHJlcGxhY2VtZW50c1xuICogQHBhcmFtICB7bnVtYmVyfSByZXBsYWNlbWVudHMuc3RhcnRcbiAqIEBwYXJhbSAge251bWJlcn0gcmVwbGFjZW1lbnRzLmVuZFxuICogQHBhcmFtICB7c3RyaW5nfSByZXBsYWNlbWVudHMucmVwbGFjZW1lbnRcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgIFx0cmVwbGFjZWQgdGV4dFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlcGxhY2VtZW50SW5mIHtcbiAgc3RhcnQ6IG51bWJlcjtcbiAgLyoqXG4gICAqIGV4Y2x1ZGVkIGluZGV4XG4gICAqL1xuICBlbmQ6IG51bWJlcjtcbiAgdGV4dD86IHN0cmluZztcbiAgcmVwbGFjZW1lbnQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBSZXBsYWNlbWVudCBpbXBsZW1lbnRzIFJlcGxhY2VtZW50SW5mIHtcbiAgLyoqXG4gICAqIFJlcGxhY2VtZW50XG4gICAqIEBwYXJhbSBzdGFydCBpbmNsdWRlZCBpbmRleFxuICAgKiBAcGFyYW0gZW5kIGV4Y2x1ZGVkIGluZGV4XG4gICAqIEBwYXJhbSB0ZXh0XG4gICAqL1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgc3RhcnQ6IG51bWJlciwgcHVibGljIGVuZDogbnVtYmVyLFxuICAgIHB1YmxpYyB0ZXh0OiBzdHJpbmcpIHtcbiAgICBhc3NlcnQubm90RXF1YWwodGV4dCwgbnVsbCwgJ3JlcGxhY2VtZW50IHRleHQgc2hvdWxkIG5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfc29ydEFuZFJlbW92ZU92ZXJsYXAocmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdLCByZW1vdmVPdmVybGFwID0gdHJ1ZSwgdGV4dDogc3RyaW5nKSB7XG4gIHJlcGxhY2VtZW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYS5zdGFydCAtIGIuc3RhcnQ7XG4gIH0pO1xuXG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoIDwgMilcbiAgICByZXR1cm47XG4gIGZvciAobGV0IGkgPSAxLCBsID0gcmVwbGFjZW1lbnRzLmxlbmd0aDsgaSA8IGw7KSB7XG4gICAgaWYgKHJlcGxhY2VtZW50c1tpXS5zdGFydCA8IHJlcGxhY2VtZW50c1tpIC0gMV0uZW5kKSB7XG4gICAgICBjb25zdCBwcmV2ID0gcmVwbGFjZW1lbnRzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGN1cnIgPSByZXBsYWNlbWVudHNbaV07XG4gICAgICBpZiAocmVtb3ZlT3ZlcmxhcCkge1xuICAgICAgICByZXBsYWNlbWVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgICBsLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE92ZXJsYXAgcmVwbGFjZW1lbnRzOiBcblx0XHRcdFx0XCIke3RleHQuc2xpY2UoY3Vyci5zdGFydCwgY3Vyci5lbmQpfVwiICR7dXRpbC5pbnNwZWN0KGN1cnIpfVxuXHRcdFx0XHRhbmQgXCIke3RleHQuc2xpY2UocHJldi5zdGFydCwgcHJldi5lbmQpfVwiICR7dXRpbC5pbnNwZWN0KHByZXYpfWApO1xuICAgICAgfVxuICAgIH0gZWxzZVxuICAgICAgaSsrO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfcmVwbGFjZVNvcnRlZCh0ZXh0OiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuICBsZXQgb2Zmc2V0ID0gMDtcbiAgcmV0dXJuIHJlcGxhY2VtZW50cy5yZWR1Y2UoKHRleHQ6IHN0cmluZywgdXBkYXRlOiBSZXBsYWNlbWVudEluZikgPT4ge1xuICAgIGNvbnN0IHN0YXJ0ID0gdXBkYXRlLnN0YXJ0ICsgb2Zmc2V0O1xuICAgIGNvbnN0IGVuZCA9IHVwZGF0ZS5lbmQgKyBvZmZzZXQ7XG4gICAgY29uc3QgcmVwbGFjZW1lbnQgPSB1cGRhdGUudGV4dCAhPSBudWxsID8gdXBkYXRlLnRleHQgOiB1cGRhdGUucmVwbGFjZW1lbnQ7XG4gICAgb2Zmc2V0ICs9IChyZXBsYWNlbWVudCEubGVuZ3RoIC0gKGVuZCAtIHN0YXJ0KSk7XG4gICAgcmV0dXJuIHRleHQuc2xpY2UoMCwgc3RhcnQpICsgcmVwbGFjZW1lbnQgKyB0ZXh0LnNsaWNlKGVuZCk7XG4gIH0sIHRleHQpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXBsYWNlQ29kZSh0ZXh0OiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSwgcmVtb3ZlT3ZlcmxhcCA9IGZhbHNlKSB7XG4gIF9zb3J0QW5kUmVtb3ZlT3ZlcmxhcChyZXBsYWNlbWVudHMsIHJlbW92ZU92ZXJsYXAsIHRleHQpO1xuICByZXR1cm4gX3JlcGxhY2VTb3J0ZWQodGV4dCwgcmVwbGFjZW1lbnRzKTtcbn1cbiJdfQ==