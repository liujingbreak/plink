"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterEffect = void 0;
var operators_1 = require("rxjs/operators");
/** A React useEffect() hook like operator function */
function filterEffect(dependecies) {
    return function (src) {
        var prev;
        return src.pipe((0, operators_1.filter)(function (s) {
            var curr = dependecies(s);
            if (prev == null) {
                prev = curr;
                return true;
            }
            if (curr.length !== prev.length) {
                prev = curr;
                return true;
            }
            if (prev.some(function (item, i) { return item !== curr[i]; })) {
                prev = curr;
                return true;
            }
            return false;
        }));
    };
}
exports.filterEffect = filterEffect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBc0M7QUFFdEMsc0RBQXNEO0FBQ3RELFNBQWdCLFlBQVksQ0FBSSxXQUFrQztJQUNoRSxPQUFPLFVBQUMsR0FBRztRQUNULElBQUksSUFBdUIsQ0FBQztRQUM1QixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsSUFBQSxrQkFBTSxFQUFDLFVBQUEsQ0FBQztZQUNOLElBQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ1osT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNaLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJLEVBQUUsQ0FBQyxJQUFLLE9BQUEsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBaEIsQ0FBZ0IsQ0FBQyxFQUFFO2dCQUM1QyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNaLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBdEJELG9DQXNCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vKiogQSBSZWFjdCB1c2VFZmZlY3QoKSBob29rIGxpa2Ugb3BlcmF0b3IgZnVuY3Rpb24gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJFZmZlY3Q8VD4oZGVwZW5kZWNpZXM6IChjdXJyZW50OiBUKSA9PiBhbnlbXSk6IE9wZXJhdG9yRnVuY3Rpb248VCwgVD4ge1xuICByZXR1cm4gKHNyYykgPT4ge1xuICAgIGxldCBwcmV2OiBhbnlbXSB8IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICBmaWx0ZXIocyA9PiB7XG4gICAgICAgIGNvbnN0IGN1cnIgPSBkZXBlbmRlY2llcyhzKTtcbiAgICAgICAgaWYgKHByZXYgPT0gbnVsbCkge1xuICAgICAgICAgIHByZXYgPSBjdXJyO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJyLmxlbmd0aCAhPT0gcHJldi5sZW5ndGgpIHtcbiAgICAgICAgICBwcmV2ID0gY3VycjtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJldi5zb21lKChpdGVtLCBpKSA9PiBpdGVtICE9PSBjdXJyW2ldKSkge1xuICAgICAgICAgIHByZXYgPSBjdXJyO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cbiJdfQ==