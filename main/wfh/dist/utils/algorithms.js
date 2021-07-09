"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinAndMax = void 0;
/**
 * According to the book << Introduction to Algorithms, Third Edition >>, this algorithm
 * costs only (3/2n) time efficiency
 * @param items
 * @param comparator
 */
function getMinAndMax(items, comparator = (a, b) => a - b) {
    let firstOfPair = null;
    let min;
    let max;
    for (const item of items) {
        if (firstOfPair != null) { // firstOfPair must be non-null
            const res = comparator(item, firstOfPair);
            let bigger;
            let smaller;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxnb3JpdGhtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2FsZ29yaXRobXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0E7Ozs7O0dBS0c7QUFDSCxTQUFnQixZQUFZLENBQWEsS0FBa0IsRUFDekQsYUFBcUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBRSxDQUF1QixHQUFJLENBQXVCO0lBQ2xHLElBQUksV0FBVyxHQUFhLElBQUksQ0FBQztJQUNqQyxJQUFJLEdBQWtCLENBQUM7SUFDdkIsSUFBSSxHQUFrQixDQUFDO0lBQ3ZCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3hCLElBQUksV0FBVyxJQUFJLElBQUksRUFBRSxFQUFFLCtCQUErQjtZQUN4RCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLElBQUksTUFBUyxDQUFDO1lBQ2QsSUFBSSxPQUFVLENBQUM7WUFDZixJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUU7Z0JBQ1gsTUFBTSxHQUFHLFdBQVcsQ0FBQztnQkFDckIsT0FBTyxHQUFHLElBQUksQ0FBQzthQUNoQjtpQkFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0JBQ25CLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ2QsT0FBTyxHQUFHLFdBQVcsQ0FBQzthQUN2QjtZQUNELElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxPQUFRLEdBQUcsR0FBRyxFQUFFO2dCQUNqQyxHQUFHLEdBQUcsT0FBUSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLE1BQU8sR0FBRyxHQUFHLEVBQUU7Z0JBQ2hDLEdBQUcsR0FBRyxNQUFPLENBQUM7YUFDZjtZQUNELFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDcEI7YUFBTTtZQUNMLFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDcEI7S0FDRjtJQUNELElBQUksV0FBVyxFQUFFO1FBQ2YsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLFdBQVcsR0FBRyxHQUFHLEVBQUU7WUFDcEMsR0FBRyxHQUFHLFdBQVcsQ0FBQztTQUNuQjthQUFNLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxXQUFXLEdBQUcsR0FBRyxFQUFFO1lBQzNDLEdBQUcsR0FBRyxXQUFXLENBQUM7U0FDbkI7S0FDRjtJQUNELElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSTtRQUM1QixHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ1osT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDO0FBdENELG9DQXNDQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBBY2NvcmRpbmcgdG8gdGhlIGJvb2sgPDwgSW50cm9kdWN0aW9uIHRvIEFsZ29yaXRobXMsIFRoaXJkIEVkaXRpb24gPj4sIHRoaXMgYWxnb3JpdGhtXG4gKiBjb3N0cyBvbmx5ICgzLzJuKSB0aW1lIGVmZmljaWVuY3lcbiAqIEBwYXJhbSBpdGVtcyBcbiAqIEBwYXJhbSBjb21wYXJhdG9yIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWluQW5kTWF4PFQgPSBudW1iZXI+KGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgY29tcGFyYXRvcjogKGE6IFQsIGI6IFQpID0+IG51bWJlciA9IChhLCBiKSA9PiAoYSBhcyB1bmtub3duIGFzIG51bWJlcikgLSAoYiBhcyB1bmtub3duIGFzIG51bWJlcikpOiBbVCB8IHVuZGVmaW5lZCwgVCB8IHVuZGVmaW5lZF0ge1xuICBsZXQgZmlyc3RPZlBhaXI6IFQgfCBudWxsID0gbnVsbDtcbiAgbGV0IG1pbjogVCB8IHVuZGVmaW5lZDtcbiAgbGV0IG1heDogVCB8IHVuZGVmaW5lZDtcbiAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgaWYgKGZpcnN0T2ZQYWlyICE9IG51bGwpIHsgLy8gZmlyc3RPZlBhaXIgbXVzdCBiZSBub24tbnVsbFxuICAgICAgY29uc3QgcmVzID0gY29tcGFyYXRvcihpdGVtLCBmaXJzdE9mUGFpcik7XG4gICAgICBsZXQgYmlnZ2VyOiBUO1xuICAgICAgbGV0IHNtYWxsZXI6IFQ7XG4gICAgICBpZiAocmVzIDwgMCkge1xuICAgICAgICBiaWdnZXIgPSBmaXJzdE9mUGFpcjtcbiAgICAgICAgc21hbGxlciA9IGl0ZW07XG4gICAgICB9IGVsc2UgaWYgKHJlcyA+PSAwKSB7XG4gICAgICAgIGJpZ2dlciA9IGl0ZW07XG4gICAgICAgIHNtYWxsZXIgPSBmaXJzdE9mUGFpcjtcbiAgICAgIH1cbiAgICAgIGlmIChtaW4gPT0gbnVsbCB8fCBzbWFsbGVyISA8IG1pbikge1xuICAgICAgICBtaW4gPSBzbWFsbGVyITtcbiAgICAgIH1cbiAgICAgIGlmIChtYXggPT0gbnVsbCB8fCBiaWdnZXIhID4gbWF4KSB7XG4gICAgICAgIG1heCA9IGJpZ2dlciE7XG4gICAgICB9XG4gICAgICBmaXJzdE9mUGFpciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpcnN0T2ZQYWlyID0gaXRlbTtcbiAgICB9XG4gIH1cbiAgaWYgKGZpcnN0T2ZQYWlyKSB7XG4gICAgaWYgKG1pbiA9PSBudWxsIHx8IGZpcnN0T2ZQYWlyIDwgbWluKSB7XG4gICAgICBtaW4gPSBmaXJzdE9mUGFpcjtcbiAgICB9IGVsc2UgaWYgKG1heCA9PSBudWxsIHx8IGZpcnN0T2ZQYWlyID4gbWF4KSB7XG4gICAgICBtYXggPSBmaXJzdE9mUGFpcjtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbiAhPSBudWxsICYmIG1heCA9PSBudWxsKVxuICAgIG1heCA9IG1pbjtcbiAgcmV0dXJuIFttaW4sIG1heF07XG59XG4iXX0=