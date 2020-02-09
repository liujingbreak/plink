"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const worker_threads_1 = require("worker_threads");
function default_1() {
    let stats = `[${process.pid}, is main:${worker_threads_1.isMainThread}]`;
    const mem = process.memoryUsage();
    for (const key of Object.keys(mem)) {
        stats += `${key}: ${mem[key] / 1024 / 1024}M, `;
    }
    return chalk_1.default.greenBright(stats);
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtLXN0YXRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbWVtLXN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG1EQUE0QztBQUM1QztJQUNFLElBQUksS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsYUFBYSw2QkFBWSxHQUFHLENBQUM7SUFDeEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNsQyxLQUFLLElBQUksR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFDLElBQUksR0FBQyxJQUFJLEtBQUssQ0FBQztLQUM3QztJQUNELE9BQU8sZUFBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBUEQsNEJBT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtpc01haW5UaHJlYWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBsZXQgc3RhdHMgPSBgWyR7cHJvY2Vzcy5waWR9LCBpcyBtYWluOiR7aXNNYWluVGhyZWFkfV1gO1xuICBjb25zdCBtZW0gPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG1lbSkpIHtcbiAgICBzdGF0cyArPSBgJHtrZXl9OiAke21lbVtrZXldLzEwMjQvMTAyNH1NLCBgO1xuICB9XG4gIHJldHVybiBjaGFsay5ncmVlbkJyaWdodChzdGF0cyk7XG59XG4iXX0=