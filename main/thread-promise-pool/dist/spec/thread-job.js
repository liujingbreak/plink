"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(input) {
    console.log('In thread');
    return new Promise(resolve => setTimeout(() => resolve(input * 10), 1000));
}
exports.default = default_1;

//# sourceMappingURL=thread-job.js.map
