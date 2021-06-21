"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
// import { isMainThread, threadId } from 'worker_threads';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtLXN0YXRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbWVtLXN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLDJEQUEyRDtBQUUzRCxJQUFJLE1BQTBCLENBQUM7QUFDL0IsSUFBSTtJQUNGLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLFFBQVEsR0FBRyxDQUFDO0NBQ2xGO0FBQUMsT0FBTyxHQUFHLEVBQUU7SUFDWixNQUFNLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7Q0FDbEM7QUFDRDtJQUVFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNsQyxJQUFJLEtBQUssR0FBRyxNQUFPLENBQUM7SUFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2xDLEtBQUssSUFBSSxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztLQUN4RDtJQUNELE1BQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFdkMsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQVpELDRCQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCB7IGlzTWFpblRocmVhZCwgdGhyZWFkSWQgfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBoZWFkZXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbnRyeSB7XG4gIGNvbnN0IHd0ID0gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKTtcbiAgaGVhZGVyID0gYFske3d0LmlzTWFpblRocmVhZCA/ICdwaWQ6JyArIHByb2Nlc3MucGlkIDogJ3RocmVhZDonICsgd3QudGhyZWFkSWR9XWA7XG59IGNhdGNoIChlcnIpIHtcbiAgaGVhZGVyID0gYFtwaWQ6ICR7cHJvY2Vzcy5waWR9XWA7XG59XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICBjb25zdCBtZW0gPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XG4gIGxldCBzdGF0cyA9IGhlYWRlciE7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG1lbSkpIHtcbiAgICBzdGF0cyArPSBgJHtrZXl9OiAke01hdGguY2VpbChtZW1ba2V5XS8xMDI0LzEwMjQpfU0sIGA7XG4gIH1cbiAgY29uc3QgcmVwb3J0ID0gY2hhbGsuY3lhbkJyaWdodChzdGF0cyk7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2cocmVwb3J0KTtcbiAgcmV0dXJuIHJlcG9ydDtcbn1cblxuIl19