"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const plink_1 = require("@wfh/plink");
const globals_1 = require("@jest/globals");
(0, plink_1.initProcess)('none');
(0, globals_1.describe)('utility tool', () => {
    let strWidth;
    let cliLineWrapByWidth;
    beforeAll(async () => {
        strWidth = (await import('string-width')).default;
        cliLineWrapByWidth = require('../utils').cliLineWrapByWidth;
    });
    (0, globals_1.it)('cliLineWrapByWidth should work', () => {
        const res = cliLineWrapByWidth('abcdefg', 4, strWidth);
        console.log(res);
        (0, globals_1.expect)(res.length).toBe(2);
        const resCn = cliLineWrapByWidth('ab中文cd', 4, strWidth);
        console.log(resCn);
        (0, globals_1.expect)(strWidth('ab中')).toBe(4);
        (0, globals_1.expect)(resCn.length).toBe(2);
        (0, globals_1.expect)(resCn[0]).toEqual('ab中');
        (0, globals_1.expect)(resCn[1]).toEqual('文cd');
        const resCn2 = cliLineWrapByWidth('abc中文d', 4, strWidth);
        console.log(resCn2);
        (0, globals_1.expect)(resCn2[0]).toBe('abc');
        (0, globals_1.expect)(resCn2[1]).toBe('中文');
        (0, globals_1.expect)(resCn2[2]).toBe('d');
        const resCn3 = cliLineWrapByWidth('中文中文中文中文中文', 5, strWidth);
        console.log(resCn3);
        console.log(cliLineWrapByWidth('a', 5, strWidth));
        console.log(cliLineWrapByWidth('', 1, strWidth));
    });
    xit('createCliPrinter should work', async () => {
        const createCliPrinter = require('../utils').createCliPrinter;
        const print = createCliPrinter('');
        for (let i = 0; i < 50; i++) {
            await print('line ', i + 1);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }, 9999999);
});
//# sourceMappingURL=util.spec.js.map