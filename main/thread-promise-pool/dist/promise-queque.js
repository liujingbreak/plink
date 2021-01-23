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
    // let actionIdx = 0;
    let parallel = 0;
    function performAction() {
        return __awaiter(this, void 0, void 0, function* () {
            parallel++;
            while (actions.length > 0) {
                yield actions.shift();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9taXNlLXF1ZXF1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDQSxTQUFzQixPQUFPLENBQUksUUFBZ0IsRUFBRSxPQUFnQzs7UUFDakYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLEVBQVMsQ0FBQztRQUUxQixNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBTSxRQUFRLENBQW1CLENBQUM7UUFDeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7U0FDM0I7UUFFRCxTQUFlLGFBQWE7O2dCQUMxQixPQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUNqQyxJQUFJO3dCQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQzVDO29CQUFDLE9BQU8sR0FBRyxFQUFFO3dCQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ25CO2lCQUNGO1lBQ0gsQ0FBQztTQUFBO1FBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQXJCRCwwQkFxQkM7QUFFRCxTQUFnQixLQUFLLENBQUMsV0FBbUI7SUFDdkMsTUFBTSxPQUFPLEdBQStCLEVBQUUsQ0FBQztJQUMvQyxxQkFBcUI7SUFDckIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBRWpCLFNBQWUsYUFBYTs7WUFDMUIsUUFBUSxFQUFFLENBQUM7WUFDWCxPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN6QixNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUN2QjtZQUNELFFBQVEsRUFBRSxDQUFDO1FBQ2IsQ0FBQztLQUFBO0lBRUQsT0FBTztRQUNMLEdBQUcsQ0FBSSxNQUF3QjtZQUM3QixPQUFPLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxRQUFRLEdBQUcsV0FBVyxFQUFFO29CQUMxQixhQUFhLEVBQUUsQ0FBQztpQkFDakI7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQXZCRCxzQkF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWV1ZVVwPFQ+KHBhcmFsbGVsOiBudW1iZXIsIGFjdGlvbnM6IEFycmF5PCgpID0+IFByb21pc2U8VD4+KTogUHJvbWlzZTxUW10+IHtcbiAgbGV0IGFjdGlvbklkeCA9IDA7XG4gIGNvbnN0IHJlc3VsdHMgPSBbXSBhcyBUW107XG5cbiAgY29uc3QgZG9uZSA9IG5ldyBBcnJheTxhbnk+KHBhcmFsbGVsKSBhcyBQcm9taXNlPGFueT5bXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbGxlbDsgaSsrKSB7XG4gICAgZG9uZVtpXSA9IHBlcmZvcm1BY3Rpb24oKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1BY3Rpb24oKSB7XG4gICAgd2hpbGUgKGFjdGlvbklkeCA8IGFjdGlvbnMubGVuZ3RoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHRzLnB1c2goYXdhaXQgYWN0aW9uc1thY3Rpb25JZHgrK10oKSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGVycik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVldWUobWF4UGFyYWxsZWw6IG51bWJlcikge1xuICBjb25zdCBhY3Rpb25zOiBBcnJheTwoKSA9PiBQcm9taXNlPHZvaWQ+PiA9IFtdO1xuICAvLyBsZXQgYWN0aW9uSWR4ID0gMDtcbiAgbGV0IHBhcmFsbGVsID0gMDtcblxuICBhc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKCkge1xuICAgIHBhcmFsbGVsKys7XG4gICAgd2hpbGUgKGFjdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgYWN0aW9ucy5zaGlmdCgpO1xuICAgIH1cbiAgICBwYXJhbGxlbC0tO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhZGQ8VD4oYWN0aW9uOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4gYWN0aW9uKCkudGhlbihyZXNvbHZlKS5jYXRjaChyZWopKTtcbiAgICAgICAgaWYgKHBhcmFsbGVsIDwgbWF4UGFyYWxsZWwpIHtcbiAgICAgICAgICBwZXJmb3JtQWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuXG5cbiJdfQ==