"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = exports.queueUp = void 0;
async function queueUp(parallel, actions) {
    let actionIdx = 0;
    const results = [];
    const done = new Array(parallel);
    for (let i = 0; i < parallel; i++) {
        done[i] = performAction();
    }
    async function performAction() {
        while (actionIdx < actions.length) {
            try {
                results.push(await actions[actionIdx++]());
            }
            catch (err) {
                results.push(err);
            }
        }
    }
    await Promise.all(done);
    return results;
}
exports.queueUp = queueUp;
function queue(maxParallel) {
    const actions = [];
    // let actionIdx = 0;
    let parallel = 0;
    async function performAction() {
        parallel++;
        while (actions.length > 0) {
            await (actions.shift())();
        }
        parallel--;
    }
    return {
        add(action) {
            return new Promise((resolve, rej) => {
                actions.push(() => action().then(resolve).catch(rej));
                if (parallel < maxParallel) {
                    // TODO: handle promise rejection
                    void performAction();
                }
            });
        }
    };
}
exports.queue = queue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wcm9taXNlLXF1ZXF1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDTyxLQUFLLFVBQVUsT0FBTyxDQUFJLFFBQWdCLEVBQUUsT0FBZ0M7SUFDakYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLE1BQU0sT0FBTyxHQUFHLEVBQVMsQ0FBQztJQUUxQixNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBTSxRQUFRLENBQW1CLENBQUM7SUFDeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNqQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7S0FDM0I7SUFFRCxLQUFLLFVBQVUsYUFBYTtRQUMxQixPQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO1lBQ2pDLElBQUk7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM1QztZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDbkI7U0FDRjtJQUNILENBQUM7SUFFRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQXJCRCwwQkFxQkM7QUFFRCxTQUFnQixLQUFLLENBQUMsV0FBbUI7SUFDdkMsTUFBTSxPQUFPLEdBQStCLEVBQUUsQ0FBQztJQUMvQyxxQkFBcUI7SUFDckIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBRWpCLEtBQUssVUFBVSxhQUFhO1FBQzFCLFFBQVEsRUFBRSxDQUFDO1FBQ1gsT0FBTyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFFLEVBQUUsQ0FBQztTQUM1QjtRQUNELFFBQVEsRUFBRSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQU87UUFDTCxHQUFHLENBQUksTUFBd0I7WUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDckMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELElBQUksUUFBUSxHQUFHLFdBQVcsRUFBRTtvQkFDMUIsaUNBQWlDO29CQUNqQyxLQUFLLGFBQWEsRUFBRSxDQUFDO2lCQUN0QjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBeEJELHNCQXdCQyIsInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXVlVXA8VD4ocGFyYWxsZWw6IG51bWJlciwgYWN0aW9uczogQXJyYXk8KCkgPT4gUHJvbWlzZTxUPj4pOiBQcm9taXNlPFRbXT4ge1xuICBsZXQgYWN0aW9uSWR4ID0gMDtcbiAgY29uc3QgcmVzdWx0cyA9IFtdIGFzIFRbXTtcblxuICBjb25zdCBkb25lID0gbmV3IEFycmF5PGFueT4ocGFyYWxsZWwpIGFzIFByb21pc2U8YW55PltdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFsbGVsOyBpKyspIHtcbiAgICBkb25lW2ldID0gcGVyZm9ybUFjdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbigpIHtcbiAgICB3aGlsZSAoYWN0aW9uSWR4IDwgYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdHMucHVzaChhd2FpdCBhY3Rpb25zW2FjdGlvbklkeCsrXSgpKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXN1bHRzLnB1c2goZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lKTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWV1ZShtYXhQYXJhbGxlbDogbnVtYmVyKSB7XG4gIGNvbnN0IGFjdGlvbnM6IEFycmF5PCgpID0+IFByb21pc2U8dm9pZD4+ID0gW107XG4gIC8vIGxldCBhY3Rpb25JZHggPSAwO1xuICBsZXQgcGFyYWxsZWwgPSAwO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1BY3Rpb24oKSB7XG4gICAgcGFyYWxsZWwrKztcbiAgICB3aGlsZSAoYWN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCAoYWN0aW9ucy5zaGlmdCgpKSEoKTtcbiAgICB9XG4gICAgcGFyYWxsZWwtLTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWRkPFQ+KGFjdGlvbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IGFjdGlvbigpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqKSk7XG4gICAgICAgIGlmIChwYXJhbGxlbCA8IG1heFBhcmFsbGVsKSB7XG4gICAgICAgICAgLy8gVE9ETzogaGFuZGxlIHByb21pc2UgcmVqZWN0aW9uXG4gICAgICAgICAgdm9pZCBwZXJmb3JtQWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuXG5cbiJdfQ==