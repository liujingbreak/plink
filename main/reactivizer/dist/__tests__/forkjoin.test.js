"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
void (0, node_test_1.describe)('forkjoin worker', () => {
    const { forkMergeSort } = require('./fork-merge-sort');
    void node_test_1.it.skip('main worker can recursively fork main worker and perform merge-sort', async () => {
        await forkMergeSort('mainOnly');
    });
    void node_test_1.it.skip('single worker can fork another worker and perform merge-sort', async () => {
        await forkMergeSort('singleWorker');
    });
    void node_test_1.it.skip('Exclude main thread', async () => {
        await forkMergeSort('excludeMainThread');
    });
    void (0, node_test_1.it)('Scheduled workers can fork another worker or main worker itself', async () => {
        await forkMergeSort('scheduler');
    });
    void node_test_1.it.skip('Exclude main thread', async () => {
        await forkMergeSort('excludeMainThread', undefined, 2000);
    });
    void node_test_1.it.skip('Scheduled workers can fork another worker or main worker itself', async () => {
        await forkMergeSort('scheduler', undefined, 1000);
    });
});
//# sourceMappingURL=forkjoin.test.js.map