"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterEffect = void 0;
const operators_1 = require("rxjs/operators");
/** A React useEffect() hook like operator function */
function filterEffect(dependecies) {
    return (src) => {
        return src.pipe((0, operators_1.map)(s => dependecies(s)), (0, operators_1.distinctUntilChanged)((deps1, deps2) => {
            if (deps1.length !== deps2.length) {
                return false;
            }
            return deps1.length === deps2.length && deps1.every((dep, i) => dep === deps2[i]);
        }));
    };
}
exports.filterEffect = filterEffect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4Q0FBeUQ7QUFFekQsc0RBQXNEO0FBQ3RELFNBQWdCLFlBQVksQ0FBcUIsV0FBOEI7SUFDN0UsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ2IsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hCLElBQUEsZ0NBQW9CLEVBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEVBQUU7Z0JBQ2pDLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBWkQsb0NBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbi8qKiBBIFJlYWN0IHVzZUVmZmVjdCgpIGhvb2sgbGlrZSBvcGVyYXRvciBmdW5jdGlvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckVmZmVjdDxULCBSIGV4dGVuZHMgYW55W10+KGRlcGVuZGVjaWVzOiAoY3VycmVudDogVCkgPT4gUik6IE9wZXJhdG9yRnVuY3Rpb248VCwgUj4ge1xuICByZXR1cm4gKHNyYykgPT4ge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG1hcChzID0+IGRlcGVuZGVjaWVzKHMpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChkZXBzMSwgZGVwczIpID0+IHtcbiAgICAgICAgaWYgKGRlcHMxLmxlbmd0aCAhPT0gZGVwczIubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZXBzMS5sZW5ndGggPT09IGRlcHMyLmxlbmd0aCAmJiBkZXBzMS5ldmVyeSgoZGVwLCBpKSA9PiBkZXAgPT09IGRlcHMyW2ldKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cbiJdfQ==