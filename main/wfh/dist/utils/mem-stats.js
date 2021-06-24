"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
let header;
try {
    const wt = require('worker_threads');
    header = `[${wt.isMainThread ? 'pid:' + process.pid : 'thread:' + wt.threadId}]`;
}
catch (err) {
    header = `[pid: ${process.pid}]`;
}
function default_1() {
    const mem = process.memoryUsage();
    let stats = header;
    for (const key of Object.keys(mem)) {
        stats += `${key}: ${Math.ceil(mem[key] / 1024 / 1024)}M, `;
    }
    const report = chalk_1.default.cyanBright(stats);
    // eslint-disable-next-line no-console
    console.log(report);
    return report;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtLXN0YXRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbWVtLXN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0RBQTBCO0FBSTFCLElBQUksTUFBMEIsQ0FBQztBQUMvQixJQUFJO0lBQ0YsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFlLENBQUM7SUFDbkQsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsUUFBUSxHQUFHLENBQUM7Q0FDbEY7QUFBQyxPQUFPLEdBQUcsRUFBRTtJQUNaLE1BQU0sR0FBRyxTQUFTLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQztDQUNsQztBQUNEO0lBRUUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLElBQUksS0FBSyxHQUFHLE1BQU8sQ0FBQztJQUNwQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbEMsS0FBSyxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0tBQ3hEO0lBQ0QsTUFBTSxNQUFNLEdBQUcsZUFBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV2QyxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBWkQsNEJBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IHsgaXNNYWluVGhyZWFkLCB0aHJlYWRJZCB9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCAqIGFzIF93dCBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBoZWFkZXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbnRyeSB7XG4gIGNvbnN0IHd0ID0gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKSBhcyB0eXBlb2YgX3d0O1xuICBoZWFkZXIgPSBgWyR7d3QuaXNNYWluVGhyZWFkID8gJ3BpZDonICsgcHJvY2Vzcy5waWQgOiAndGhyZWFkOicgKyB3dC50aHJlYWRJZH1dYDtcbn0gY2F0Y2ggKGVycikge1xuICBoZWFkZXIgPSBgW3BpZDogJHtwcm9jZXNzLnBpZH1dYDtcbn1cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGNvbnN0IG1lbSA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKTtcbiAgbGV0IHN0YXRzID0gaGVhZGVyITtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMobWVtKSkge1xuICAgIHN0YXRzICs9IGAke2tleX06ICR7TWF0aC5jZWlsKG1lbVtrZXldLzEwMjQvMTAyNCl9TSwgYDtcbiAgfVxuICBjb25zdCByZXBvcnQgPSBjaGFsay5jeWFuQnJpZ2h0KHN0YXRzKTtcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhyZXBvcnQpO1xuICByZXR1cm4gcmVwb3J0O1xufVxuXG4iXX0=