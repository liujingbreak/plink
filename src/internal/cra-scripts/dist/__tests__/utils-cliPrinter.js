"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
async function test() {
    const { createCliPrinter } = require('../utils');
    const print = createCliPrinter('Hello world !!!!!!!!!!!!!!!!!!!!');
    await new Promise(r => setTimeout(r, 1000));
    for (let i = 0; i < 50; i++) {
        await print('line ', i + 1, ' hahaha'.repeat(100));
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}
exports.test = test;
//# sourceMappingURL=utils-cliPrinter.js.map