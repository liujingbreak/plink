/**
 * According to the book << Introduction to Algorithms, Third Edition >>, this algorithm
 * costs only (3/2n) time efficiency
 * @param items
 * @param comparator
 */
export function getMinAndMax(items, comparator = (a, b) => a - b) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluTWF4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdHMvc2hhcmUvYWxnb3JpdGhtcy9taW5NYXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFhLEtBQWtCLEVBQ3pELGFBQXFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUUsQ0FBdUIsR0FBSSxDQUF1QjtJQUNsRyxJQUFJLFdBQVcsR0FBYSxJQUFJLENBQUM7SUFDakMsSUFBSSxHQUFrQixDQUFDO0lBQ3ZCLElBQUksR0FBa0IsQ0FBQztJQUN2QixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUUsRUFBRSwrQkFBK0I7WUFDeEQsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMxQyxJQUFJLE1BQVMsQ0FBQztZQUNkLElBQUksT0FBVSxDQUFDO1lBQ2YsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO2dCQUNYLE1BQU0sR0FBRyxXQUFXLENBQUM7Z0JBQ3JCLE9BQU8sR0FBRyxJQUFJLENBQUM7YUFDaEI7aUJBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO2dCQUNuQixNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUNkLE9BQU8sR0FBRyxXQUFXLENBQUM7YUFDdkI7WUFDRCxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksT0FBUSxHQUFHLEdBQUcsRUFBRTtnQkFDakMsR0FBRyxHQUFHLE9BQVEsQ0FBQzthQUNoQjtZQUNELElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxNQUFPLEdBQUcsR0FBRyxFQUFFO2dCQUNoQyxHQUFHLEdBQUcsTUFBTyxDQUFDO2FBQ2Y7WUFDRCxXQUFXLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO2FBQU07WUFDTCxXQUFXLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO0tBQ0Y7SUFDRCxJQUFJLFdBQVcsRUFBRTtRQUNmLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxXQUFXLEdBQUcsR0FBRyxFQUFFO1lBQ3BDLEdBQUcsR0FBRyxXQUFXLENBQUM7U0FDbkI7YUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUMzQyxHQUFHLEdBQUcsV0FBVyxDQUFDO1NBQ25CO0tBQ0Y7SUFDRCxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUk7UUFDNUIsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNaLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBBY2NvcmRpbmcgdG8gdGhlIGJvb2sgPDwgSW50cm9kdWN0aW9uIHRvIEFsZ29yaXRobXMsIFRoaXJkIEVkaXRpb24gPj4sIHRoaXMgYWxnb3JpdGhtXG4gKiBjb3N0cyBvbmx5ICgzLzJuKSB0aW1lIGVmZmljaWVuY3lcbiAqIEBwYXJhbSBpdGVtcyBcbiAqIEBwYXJhbSBjb21wYXJhdG9yIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWluQW5kTWF4PFQgPSBudW1iZXI+KGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgY29tcGFyYXRvcjogKGE6IFQsIGI6IFQpID0+IG51bWJlciA9IChhLCBiKSA9PiAoYSBhcyB1bmtub3duIGFzIG51bWJlcikgLSAoYiBhcyB1bmtub3duIGFzIG51bWJlcikpOiBbVCB8IHVuZGVmaW5lZCwgVCB8IHVuZGVmaW5lZF0ge1xuICBsZXQgZmlyc3RPZlBhaXI6IFQgfCBudWxsID0gbnVsbDtcbiAgbGV0IG1pbjogVCB8IHVuZGVmaW5lZDtcbiAgbGV0IG1heDogVCB8IHVuZGVmaW5lZDtcbiAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgaWYgKGZpcnN0T2ZQYWlyICE9IG51bGwpIHsgLy8gZmlyc3RPZlBhaXIgbXVzdCBiZSBub24tbnVsbFxuICAgICAgY29uc3QgcmVzID0gY29tcGFyYXRvcihpdGVtLCBmaXJzdE9mUGFpcik7XG4gICAgICBsZXQgYmlnZ2VyOiBUO1xuICAgICAgbGV0IHNtYWxsZXI6IFQ7XG4gICAgICBpZiAocmVzIDwgMCkge1xuICAgICAgICBiaWdnZXIgPSBmaXJzdE9mUGFpcjtcbiAgICAgICAgc21hbGxlciA9IGl0ZW07XG4gICAgICB9IGVsc2UgaWYgKHJlcyA+PSAwKSB7XG4gICAgICAgIGJpZ2dlciA9IGl0ZW07XG4gICAgICAgIHNtYWxsZXIgPSBmaXJzdE9mUGFpcjtcbiAgICAgIH1cbiAgICAgIGlmIChtaW4gPT0gbnVsbCB8fCBzbWFsbGVyISA8IG1pbikge1xuICAgICAgICBtaW4gPSBzbWFsbGVyITtcbiAgICAgIH1cbiAgICAgIGlmIChtYXggPT0gbnVsbCB8fCBiaWdnZXIhID4gbWF4KSB7XG4gICAgICAgIG1heCA9IGJpZ2dlciE7XG4gICAgICB9XG4gICAgICBmaXJzdE9mUGFpciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpcnN0T2ZQYWlyID0gaXRlbTtcbiAgICB9XG4gIH1cbiAgaWYgKGZpcnN0T2ZQYWlyKSB7XG4gICAgaWYgKG1pbiA9PSBudWxsIHx8IGZpcnN0T2ZQYWlyIDwgbWluKSB7XG4gICAgICBtaW4gPSBmaXJzdE9mUGFpcjtcbiAgICB9IGVsc2UgaWYgKG1heCA9PSBudWxsIHx8IGZpcnN0T2ZQYWlyID4gbWF4KSB7XG4gICAgICBtYXggPSBmaXJzdE9mUGFpcjtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbiAhPSBudWxsICYmIG1heCA9PSBudWxsKVxuICAgIG1heCA9IG1pbjtcbiAgcmV0dXJuIFttaW4sIG1heF07XG59XG4iXX0=