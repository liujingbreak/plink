"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinAndMax = void 0;
/**
 * According to the book << Introduction to Algorithms, Third Edition >>, this algorithm
 * costs only (3/2n) time efficiency
 * @param items
 * @param comparator
 */
function getMinAndMax(items, comparator) {
    var e_1, _a;
    if (comparator === void 0) { comparator = function (a, b) { return a - b; }; }
    var firstOfPair = null;
    var min;
    var max;
    try {
        for (var items_1 = __values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
            var item = items_1_1.value;
            if (firstOfPair != null) { // firstOfPair must be non-null
                var res = comparator(item, firstOfPair);
                var bigger = void 0;
                var smaller = void 0;
                if (res < 0) {
                    bigger = firstOfPair;
                    smaller = item;
                }
                else if (res >= 0) {
                    bigger = item;
                    smaller = firstOfPair;
                }
                if (min == null || smaller < min) {
                    min = smaller;
                }
                if (max == null || bigger > max) {
                    max = bigger;
                }
                firstOfPair = null;
            }
            else {
                firstOfPair = item;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (firstOfPair) {
        if (min == null || firstOfPair < min) {
            min = firstOfPair;
        }
        else if (max == null || firstOfPair > max) {
            max = firstOfPair;
        }
    }
    if (min != null && max == null)
        max = min;
    return [min, max];
}
exports.getMinAndMax = getMinAndMax;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxnb3JpdGhtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2FsZ29yaXRobXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQTs7Ozs7R0FLRztBQUNILFNBQWdCLFlBQVksQ0FBYSxLQUFrQixFQUN6RCxVQUFrRzs7SUFBbEcsMkJBQUEsRUFBQSx1QkFBc0MsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFDLENBQXVCLEdBQUksQ0FBdUIsRUFBbkQsQ0FBbUQ7SUFDbEcsSUFBSSxXQUFXLEdBQWEsSUFBSSxDQUFDO0lBQ2pDLElBQUksR0FBa0IsQ0FBQztJQUN2QixJQUFJLEdBQWtCLENBQUM7O1FBQ3ZCLEtBQW1CLElBQUEsVUFBQSxTQUFBLEtBQUssQ0FBQSw0QkFBQSwrQ0FBRTtZQUFyQixJQUFNLElBQUksa0JBQUE7WUFDYixJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUUsRUFBRSwrQkFBK0I7Z0JBQ3hELElBQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQzFDLElBQUksTUFBTSxTQUFHLENBQUM7Z0JBQ2QsSUFBSSxPQUFPLFNBQUcsQ0FBQztnQkFDZixJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUU7b0JBQ1gsTUFBTSxHQUFHLFdBQVcsQ0FBQztvQkFDckIsT0FBTyxHQUFHLElBQUksQ0FBQztpQkFDaEI7cUJBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO29CQUNuQixNQUFNLEdBQUcsSUFBSSxDQUFDO29CQUNkLE9BQU8sR0FBRyxXQUFXLENBQUM7aUJBQ3ZCO2dCQUNELElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxPQUFRLEdBQUcsR0FBRyxFQUFFO29CQUNqQyxHQUFHLEdBQUcsT0FBUSxDQUFDO2lCQUNoQjtnQkFDRCxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksTUFBTyxHQUFHLEdBQUcsRUFBRTtvQkFDaEMsR0FBRyxHQUFHLE1BQU8sQ0FBQztpQkFDZjtnQkFDRCxXQUFXLEdBQUcsSUFBSSxDQUFDO2FBQ3BCO2lCQUFNO2dCQUNMLFdBQVcsR0FBRyxJQUFJLENBQUM7YUFDcEI7U0FDRjs7Ozs7Ozs7O0lBQ0QsSUFBSSxXQUFXLEVBQUU7UUFDZixJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUNwQyxHQUFHLEdBQUcsV0FBVyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLFdBQVcsR0FBRyxHQUFHLEVBQUU7WUFDM0MsR0FBRyxHQUFHLFdBQVcsQ0FBQztTQUNuQjtLQUNGO0lBQ0QsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJO1FBQzVCLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDWixPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUF0Q0Qsb0NBc0NDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEFjY29yZGluZyB0byB0aGUgYm9vayA8PCBJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtcywgVGhpcmQgRWRpdGlvbiA+PiwgdGhpcyBhbGdvcml0aG1cbiAqIGNvc3RzIG9ubHkgKDMvMm4pIHRpbWUgZWZmaWNpZW5jeVxuICogQHBhcmFtIGl0ZW1zIFxuICogQHBhcmFtIGNvbXBhcmF0b3IgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaW5BbmRNYXg8VCA9IG51bWJlcj4oaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICBjb21wYXJhdG9yOiAoYTogVCwgYjogVCkgPT4gbnVtYmVyID0gKGEsIGIpID0+IChhIGFzIHVua25vd24gYXMgbnVtYmVyKSAtIChiIGFzIHVua25vd24gYXMgbnVtYmVyKSk6IFtUIHwgdW5kZWZpbmVkLCBUIHwgdW5kZWZpbmVkXSB7XG4gIGxldCBmaXJzdE9mUGFpcjogVCB8IG51bGwgPSBudWxsO1xuICBsZXQgbWluOiBUIHwgdW5kZWZpbmVkO1xuICBsZXQgbWF4OiBUIHwgdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICBpZiAoZmlyc3RPZlBhaXIgIT0gbnVsbCkgeyAvLyBmaXJzdE9mUGFpciBtdXN0IGJlIG5vbi1udWxsXG4gICAgICBjb25zdCByZXMgPSBjb21wYXJhdG9yKGl0ZW0sIGZpcnN0T2ZQYWlyKTtcbiAgICAgIGxldCBiaWdnZXI6IFQ7XG4gICAgICBsZXQgc21hbGxlcjogVDtcbiAgICAgIGlmIChyZXMgPCAwKSB7XG4gICAgICAgIGJpZ2dlciA9IGZpcnN0T2ZQYWlyO1xuICAgICAgICBzbWFsbGVyID0gaXRlbTtcbiAgICAgIH0gZWxzZSBpZiAocmVzID49IDApIHtcbiAgICAgICAgYmlnZ2VyID0gaXRlbTtcbiAgICAgICAgc21hbGxlciA9IGZpcnN0T2ZQYWlyO1xuICAgICAgfVxuICAgICAgaWYgKG1pbiA9PSBudWxsIHx8IHNtYWxsZXIhIDwgbWluKSB7XG4gICAgICAgIG1pbiA9IHNtYWxsZXIhO1xuICAgICAgfVxuICAgICAgaWYgKG1heCA9PSBudWxsIHx8IGJpZ2dlciEgPiBtYXgpIHtcbiAgICAgICAgbWF4ID0gYmlnZ2VyITtcbiAgICAgIH1cbiAgICAgIGZpcnN0T2ZQYWlyID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlyc3RPZlBhaXIgPSBpdGVtO1xuICAgIH1cbiAgfVxuICBpZiAoZmlyc3RPZlBhaXIpIHtcbiAgICBpZiAobWluID09IG51bGwgfHwgZmlyc3RPZlBhaXIgPCBtaW4pIHtcbiAgICAgIG1pbiA9IGZpcnN0T2ZQYWlyO1xuICAgIH0gZWxzZSBpZiAobWF4ID09IG51bGwgfHwgZmlyc3RPZlBhaXIgPiBtYXgpIHtcbiAgICAgIG1heCA9IGZpcnN0T2ZQYWlyO1xuICAgIH1cbiAgfVxuICBpZiAobWluICE9IG51bGwgJiYgbWF4ID09IG51bGwpXG4gICAgbWF4ID0gbWluO1xuICByZXR1cm4gW21pbiwgbWF4XTtcbn1cbiJdfQ==