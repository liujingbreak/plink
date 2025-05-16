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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2xTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy90aHJlYWQtcG9vbFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBK0I7QUFDL0IsMkNBQW9EO0FBQ3BELG9DQUE4QjtBQUU5QixJQUFBLGtCQUFRLEVBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFBLFlBQUUsRUFBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLFlBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDOUIsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQztRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFTO2dCQUM3QixJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7Z0JBQ3JDLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDVixDQUFDLENBQUMsQ0FBQztRQUNOLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDakMsSUFBQSxnQkFBTSxFQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHtkZXNjcmliZSwgaXQsIGV4cGVjdH0gIGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi9pbmRleCc7XG5cbmRlc2NyaWJlKCdUaHJlYWQgcG9vbCcsICgpID0+IHtcbiAgaXQoJ2FsbCB3b3JrZXIgc2hvdWxkIHJ1biBzaW11bHRhbmVvdXNseScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwb29sID0gbmV3IFBvb2woMywgOTk5KTtcbiAgICBjb25zdCBkb25lczogUHJvbWlzZTxudW1iZXI+W10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICAgIGRvbmVzLnB1c2gocG9vbC5zdWJtaXQ8bnVtYmVyPih7XG4gICAgICAgIGZpbGU6IHJlcXVpcmUucmVzb2x2ZSgnLi90aHJlYWQtam9iJyksXG4gICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgIGFyZ3M6IFtpXVxuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gICAgY29uc29sZS5sb2coJy0tLSBlbmQgLS0tLScsIHJlcyk7XG4gICAgZXhwZWN0KHJlcykudG9FcXVhbChbMTAsIDIwLCAzMF0pO1xuICB9KTtcbn0pO1xuIl19