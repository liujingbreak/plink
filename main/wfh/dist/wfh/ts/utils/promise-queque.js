"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = exports.queueUp = void 0;
function queueUp(parallel, actions) {
    return __awaiter(this, void 0, void 0, function* () {
        let actionIdx = 0;
        const results = [];
        const done = new Array(parallel);
        for (let i = 0; i < parallel; i++) {
            done[i] = performAction();
        }
        function performAction() {
            return __awaiter(this, void 0, void 0, function* () {
                while (actionIdx < actions.length) {
                    try {
                        results.push(yield actions[actionIdx++]());
                    }
                    catch (err) {
                        results.push(err);
                    }
                }
            });
        }
        yield Promise.all(done);
        return results;
    });
}
exports.queueUp = queueUp;
function queue(maxParallel) {
    const actions = [];
    let actionIdx = 0;
    let parallel = 0;
    function performAction() {
        return __awaiter(this, void 0, void 0, function* () {
            parallel++;
            while (actionIdx < actions.length) {
                yield actions[actionIdx++]();
            }
            parallel--;
        });
    }
    return {
        add(action) {
            return new Promise((resolve, rej) => {
                actions.push(() => action().then(resolve).catch(rej));
                if (parallel < maxParallel) {
                    performAction();
                }
            });
        }
    };
}
exports.queue = queue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90cy91dGlscy9wcm9taXNlLXF1ZXF1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDQSxTQUFzQixPQUFPLENBQUksUUFBZ0IsRUFBRSxPQUFnQzs7UUFDakYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLEVBQVMsQ0FBQztRQUUxQixNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBTSxRQUFRLENBQW1CLENBQUM7UUFDeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7U0FDM0I7UUFFRCxTQUFlLGFBQWE7O2dCQUMxQixPQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUNqQyxJQUFJO3dCQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQzVDO29CQUFDLE9BQU8sR0FBRyxFQUFFO3dCQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ25CO2lCQUNGO1lBQ0gsQ0FBQztTQUFBO1FBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQXJCRCwwQkFxQkM7QUFFRCxTQUFnQixLQUFLLENBQUMsV0FBbUI7SUFDdkMsTUFBTSxPQUFPLEdBQStCLEVBQUUsQ0FBQztJQUMvQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBRWpCLFNBQWUsYUFBYTs7WUFDMUIsUUFBUSxFQUFFLENBQUM7WUFDWCxPQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDOUI7WUFDRCxRQUFRLEVBQUUsQ0FBQztRQUNiLENBQUM7S0FBQTtJQUVELE9BQU87UUFDTCxHQUFHLENBQUksTUFBd0I7WUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDckMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELElBQUksUUFBUSxHQUFHLFdBQVcsRUFBRTtvQkFDMUIsYUFBYSxFQUFFLENBQUM7aUJBQ2pCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUF2QkQsc0JBdUJDIiwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVldWVVcDxUPihwYXJhbGxlbDogbnVtYmVyLCBhY3Rpb25zOiBBcnJheTwoKSA9PiBQcm9taXNlPFQ+Pik6IFByb21pc2U8VFtdPiB7XG4gIGxldCBhY3Rpb25JZHggPSAwO1xuICBjb25zdCByZXN1bHRzID0gW10gYXMgVFtdO1xuXG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXk8YW55PihwYXJhbGxlbCkgYXMgUHJvbWlzZTxhbnk+W107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYWxsZWw7IGkrKykge1xuICAgIGRvbmVbaV0gPSBwZXJmb3JtQWN0aW9uKCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKCkge1xuICAgIHdoaWxlIChhY3Rpb25JZHggPCBhY3Rpb25zLmxlbmd0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGF3YWl0IGFjdGlvbnNbYWN0aW9uSWR4KytdKCkpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaChlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmUpO1xuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXVlKG1heFBhcmFsbGVsOiBudW1iZXIpIHtcbiAgY29uc3QgYWN0aW9uczogQXJyYXk8KCkgPT4gUHJvbWlzZTx2b2lkPj4gPSBbXTtcbiAgbGV0IGFjdGlvbklkeCA9IDA7XG4gIGxldCBwYXJhbGxlbCA9IDA7XG5cbiAgYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbigpIHtcbiAgICBwYXJhbGxlbCsrO1xuICAgIHdoaWxlIChhY3Rpb25JZHggPCBhY3Rpb25zLmxlbmd0aCkge1xuICAgICAgYXdhaXQgYWN0aW9uc1thY3Rpb25JZHgrK10oKTtcbiAgICB9XG4gICAgcGFyYWxsZWwtLTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWRkPFQ+KGFjdGlvbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IGFjdGlvbigpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqKSk7XG4gICAgICAgIGlmIChwYXJhbGxlbCA8IG1heFBhcmFsbGVsKSB7XG4gICAgICAgICAgcGVyZm9ybUFjdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5cblxuXG4iXX0=