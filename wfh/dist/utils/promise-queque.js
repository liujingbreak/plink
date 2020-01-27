"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9wcm9taXNlLXF1ZXF1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0EsU0FBc0IsT0FBTyxDQUFJLFFBQWdCLEVBQUUsT0FBZ0M7O1FBQ2pGLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixNQUFNLE9BQU8sR0FBRyxFQUFTLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQU0sUUFBUSxDQUFtQixDQUFDO1FBQ3hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDakMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDO1NBQzNCO1FBRUQsU0FBZSxhQUFhOztnQkFDMUIsT0FBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDakMsSUFBSTt3QkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUM1QztvQkFBQyxPQUFPLEdBQUcsRUFBRTt3QkFDWixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNuQjtpQkFDRjtZQUNILENBQUM7U0FBQTtRQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQUE7QUFyQkQsMEJBcUJDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLFdBQW1CO0lBQ3ZDLE1BQU0sT0FBTyxHQUErQixFQUFFLENBQUM7SUFDL0MsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUVqQixTQUFlLGFBQWE7O1lBQzFCLFFBQVEsRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDakMsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQzlCO1lBQ0QsUUFBUSxFQUFFLENBQUM7UUFDYixDQUFDO0tBQUE7SUFFRCxPQUFPO1FBQ0wsR0FBRyxDQUFJLE1BQXdCO1lBQzdCLE9BQU8sSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLFFBQVEsR0FBRyxXQUFXLEVBQUU7b0JBQzFCLGFBQWEsRUFBRSxDQUFDO2lCQUNqQjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBdkJELHNCQXVCQyIsInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXVlVXA8VD4ocGFyYWxsZWw6IG51bWJlciwgYWN0aW9uczogQXJyYXk8KCkgPT4gUHJvbWlzZTxUPj4pOiBQcm9taXNlPFRbXT4ge1xuICBsZXQgYWN0aW9uSWR4ID0gMDtcbiAgY29uc3QgcmVzdWx0cyA9IFtdIGFzIFRbXTtcblxuICBjb25zdCBkb25lID0gbmV3IEFycmF5PGFueT4ocGFyYWxsZWwpIGFzIFByb21pc2U8YW55PltdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFsbGVsOyBpKyspIHtcbiAgICBkb25lW2ldID0gcGVyZm9ybUFjdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbigpIHtcbiAgICB3aGlsZSAoYWN0aW9uSWR4IDwgYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdHMucHVzaChhd2FpdCBhY3Rpb25zW2FjdGlvbklkeCsrXSgpKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXN1bHRzLnB1c2goZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lKTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWV1ZShtYXhQYXJhbGxlbDogbnVtYmVyKSB7XG4gIGNvbnN0IGFjdGlvbnM6IEFycmF5PCgpID0+IFByb21pc2U8dm9pZD4+ID0gW107XG4gIGxldCBhY3Rpb25JZHggPSAwO1xuICBsZXQgcGFyYWxsZWwgPSAwO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1BY3Rpb24oKSB7XG4gICAgcGFyYWxsZWwrKztcbiAgICB3aGlsZSAoYWN0aW9uSWR4IDwgYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGF3YWl0IGFjdGlvbnNbYWN0aW9uSWR4KytdKCk7XG4gICAgfVxuICAgIHBhcmFsbGVsLS07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFkZDxUPihhY3Rpb246ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiBhY3Rpb24oKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlaikpO1xuICAgICAgICBpZiAocGFyYWxsZWwgPCBtYXhQYXJhbGxlbCkge1xuICAgICAgICAgIHBlcmZvcm1BY3Rpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuXG5cblxuIl19