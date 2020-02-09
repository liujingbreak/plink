"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const worker_threads_1 = require("worker_threads");
function default_1() {
    let stats = `[${worker_threads_1.isMainThread ? 'pid:' + process.pid : 'thread:' + worker_threads_1.threadId}]`;
    const mem = process.memoryUsage();
    for (const key of Object.keys(mem)) {
        stats += `${key}: ${Math.ceil(mem[key] / 1024 / 1024)}M, `;
    }
    const report = chalk_1.default.cyanBright(stats);
    // tslint:disable-next-line: no-console
    console.log(report);
    return report;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtLXN0YXRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbWVtLXN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG1EQUF3RDtBQUN4RDtJQUNFLElBQUksS0FBSyxHQUFHLElBQUksNkJBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyx5QkFBUSxHQUFHLENBQUM7SUFDOUUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNsQyxLQUFLLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7S0FDeEQ7SUFDRCxNQUFNLE1BQU0sR0FBRyxlQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXZDLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFYRCw0QkFXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBpc01haW5UaHJlYWQsIHRocmVhZElkIH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIGxldCBzdGF0cyA9IGBbJHtpc01haW5UaHJlYWQgPyAncGlkOicgKyBwcm9jZXNzLnBpZCA6ICd0aHJlYWQ6JyArIHRocmVhZElkfV1gO1xuICBjb25zdCBtZW0gPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG1lbSkpIHtcbiAgICBzdGF0cyArPSBgJHtrZXl9OiAke01hdGguY2VpbChtZW1ba2V5XS8xMDI0LzEwMjQpfU0sIGA7XG4gIH1cbiAgY29uc3QgcmVwb3J0ID0gY2hhbGsuY3lhbkJyaWdodChzdGF0cyk7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHJlcG9ydCk7XG4gIHJldHVybiByZXBvcnQ7XG59XG5cbiJdfQ==