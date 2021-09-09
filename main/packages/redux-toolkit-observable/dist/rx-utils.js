"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterEffect = void 0;
var operators_1 = require("rxjs/operators");
/** A React useEffect() hook like operator function */
function filterEffect(dependecies) {
    return function (src) {
        return src.pipe((0, operators_1.map)(function (s) { return dependecies(s); }), (0, operators_1.distinctUntilChanged)(function (deps1, deps2) {
            if (deps1.length !== deps2.length) {
                return false;
            }
            return deps1.length === deps2.length && deps1.every(function (dep, i) { return dep === deps2[i]; });
        }));
    };
}
exports.filterEffect = filterEffect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBeUQ7QUFFekQsc0RBQXNEO0FBQ3RELFNBQWdCLFlBQVksQ0FBcUIsV0FBOEI7SUFDN0UsT0FBTyxVQUFDLEdBQUc7UUFDVCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsSUFBQSxlQUFHLEVBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQWQsQ0FBYyxDQUFDLEVBQ3hCLElBQUEsZ0NBQW9CLEVBQUMsVUFBQyxLQUFLLEVBQUUsS0FBSztZQUNoQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sRUFBRTtnQkFDakMsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELE9BQU8sS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFHLEVBQUUsQ0FBQyxJQUFLLE9BQUEsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBaEIsQ0FBZ0IsQ0FBQyxDQUFDO1FBQ3BGLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBWkQsb0NBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbi8qKiBBIFJlYWN0IHVzZUVmZmVjdCgpIGhvb2sgbGlrZSBvcGVyYXRvciBmdW5jdGlvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckVmZmVjdDxULCBSIGV4dGVuZHMgYW55W10+KGRlcGVuZGVjaWVzOiAoY3VycmVudDogVCkgPT4gUik6IE9wZXJhdG9yRnVuY3Rpb248VCwgUj4ge1xuICByZXR1cm4gKHNyYykgPT4ge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG1hcChzID0+IGRlcGVuZGVjaWVzKHMpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChkZXBzMSwgZGVwczIpID0+IHtcbiAgICAgICAgaWYgKGRlcHMxLmxlbmd0aCAhPT0gZGVwczIubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZXBzMS5sZW5ndGggPT09IGRlcHMyLmxlbmd0aCAmJiBkZXBzMS5ldmVyeSgoZGVwLCBpKSA9PiBkZXAgPT09IGRlcHMyW2ldKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cbiJdfQ==