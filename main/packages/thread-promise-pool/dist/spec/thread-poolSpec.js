"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const globals_1 = require("@jest/globals");
const index_1 = require("../index");
(0, globals_1.describe)('Thread pool', () => {
    (0, globals_1.it)('all worker should run simultaneously', async () => {
        const pool = new index_1.Pool(3, 999);
        const dones = [];
        for (let i = 1; i <= 3; i++) {
            dones.push(pool.submit({
                file: require.resolve('./thread-job'),
                exportFn: 'default',
                args: [i]
            }));
        }
        const res = await Promise.all(dones);
        console.log('--- end ----', res);
        (0, globals_1.expect)(res).toEqual([10, 20, 30]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2xTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy90aHJlYWQtcG9vbFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBK0I7QUFDL0IsMkNBQW9EO0FBQ3BELG9DQUE4QjtBQUU5QixJQUFBLGtCQUFRLEVBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFBLFlBQUUsRUFBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLFlBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDOUIsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQztRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBUztnQkFDN0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO2dCQUNyQyxRQUFRLEVBQUUsU0FBUztnQkFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ1YsQ0FBQyxDQUFDLENBQUM7U0FDTDtRQUNELE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqQyxJQUFBLGdCQUFNLEVBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQge2Rlc2NyaWJlLCBpdCwgZXhwZWN0fSAgZnJvbSAnQGplc3QvZ2xvYmFscyc7XG5pbXBvcnQge1Bvb2x9IGZyb20gJy4uL2luZGV4JztcblxuZGVzY3JpYmUoJ1RocmVhZCBwb29sJywgKCkgPT4ge1xuICBpdCgnYWxsIHdvcmtlciBzaG91bGQgcnVuIHNpbXVsdGFuZW91c2x5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHBvb2wgPSBuZXcgUG9vbCgzLCA5OTkpO1xuICAgIGNvbnN0IGRvbmVzOiBQcm9taXNlPG51bWJlcj5bXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDM7IGkrKykge1xuICAgICAgZG9uZXMucHVzaChwb29sLnN1Ym1pdDxudW1iZXI+KHtcbiAgICAgICAgZmlsZTogcmVxdWlyZS5yZXNvbHZlKCcuL3RocmVhZC1qb2InKSxcbiAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgYXJnczogW2ldXG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbiAgICBjb25zb2xlLmxvZygnLS0tIGVuZCAtLS0tJywgcmVzKTtcbiAgICBleHBlY3QocmVzKS50b0VxdWFsKFsxMCwgMjAsIDMwXSk7XG4gIH0pO1xufSk7XG4iXX0=