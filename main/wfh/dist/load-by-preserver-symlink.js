"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = void 0;
const child_process_1 = require("child_process");
function load(filename) {
    child_process_1.fork(filename, process.argv.slice(2), {
        env: Object.assign(Object.assign({}, process.env), { NODE_PRESERVE_SYMLINKS: '1' })
    });
}
exports.load = load;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZC1ieS1wcmVzZXJ2ZXItc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xvYWQtYnktcHJlc2VydmVyLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaURBQW1DO0FBRW5DLFNBQWdCLElBQUksQ0FBQyxRQUFnQjtJQUVuQyxvQkFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNwQyxHQUFHLGtDQUNFLE9BQU8sQ0FBQyxHQUFHLEtBQ2Qsc0JBQXNCLEVBQUUsR0FBRyxHQUM1QjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFSRCxvQkFRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKGZpbGVuYW1lOiBzdHJpbmcpIHtcblxuICBmb3JrKGZpbGVuYW1lLCBwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHtcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgTk9ERV9QUkVTRVJWRV9TWU1MSU5LUzogJzEnXG4gICAgfVxuICB9KTtcbn1cbiJdfQ==