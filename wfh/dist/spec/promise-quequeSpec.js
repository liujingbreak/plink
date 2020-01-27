"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable: no-console
const promise_queque_1 = require("../utils/promise-queque");
describe('promise-queue', () => {
    it('parallel queueUp() task should work', () => __awaiter(this, void 0, void 0, function* () {
        const actions = [];
        for (let i = 0; i < 10; i++) {
            actions.push(() => {
                const idx = i;
                console.log(`${idx} start`);
                return new Promise(resolve => setTimeout(() => {
                    resolve(idx);
                    console.log(`${idx} done`);
                }, 500));
            });
        }
        const res = yield promise_queque_1.queueUp(3, actions);
        console.log(res, res.length);
    }));
    it('create queue and dynamically add async task to it', () => __awaiter(this, void 0, void 0, function* () {
        const { add } = promise_queque_1.queue(3);
        const dones = [];
        for (let i = 0; i < 10; i++) {
            const done = add(() => {
                const idx = i;
                console.log(`${idx} start ${new Date().toLocaleTimeString()}`);
                return new Promise(resolve => setTimeout(() => {
                    resolve(idx);
                    console.log(`${idx} done ${new Date().toLocaleTimeString()}`);
                }, 500));
            });
            dones.push(done);
        }
        yield new Promise(resolve => setTimeout(resolve, 1000));
        for (let i = 0; i < 5; i++) {
            const done = add(() => {
                const idx = 10 + i;
                console.log(`${idx} start ${new Date().toLocaleTimeString()}`);
                return new Promise(resolve => setTimeout(() => {
                    resolve(idx);
                    console.log(`${idx} done ${new Date().toLocaleTimeString()}`);
                }, 500));
            });
            dones.push(done);
        }
        console.log(yield Promise.all(dones));
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWVTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy9wcm9taXNlLXF1ZXF1ZVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qiw0REFBdUQ7QUFFdkQsUUFBUSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDN0IsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEdBQVMsRUFBRTtRQUNuRCxNQUFNLE9BQU8sR0FBRyxFQUErQixDQUFDO1FBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQztnQkFDNUIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDYixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztnQkFDN0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSx3QkFBTyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFL0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxHQUFTLEVBQUU7UUFDakUsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLHNCQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxLQUFLLEdBQUcsRUFBdUIsQ0FBQztRQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFVLElBQUksSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELE9BQU8sSUFBSSxPQUFPLENBQVMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsU0FBUyxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQjtRQUVELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUNwQixNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFVLElBQUksSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELE9BQU8sSUFBSSxPQUFPLENBQVMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsU0FBUyxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQjtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB7cXVldWVVcCwgcXVldWV9IGZyb20gJy4uL3V0aWxzL3Byb21pc2UtcXVlcXVlJztcblxuZGVzY3JpYmUoJ3Byb21pc2UtcXVldWUnLCAoKSA9PiB7XG4gIGl0KCdwYXJhbGxlbCBxdWV1ZVVwKCkgdGFzayBzaG91bGQgd29yaycsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBhY3Rpb25zID0gW10gYXMgQXJyYXk8KCkgPT4gUHJvbWlzZTxhbnk+PjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnRgKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShpZHgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gZG9uZWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBhd2FpdCBxdWV1ZVVwKDMsIGFjdGlvbnMpO1xuICAgIGNvbnNvbGUubG9nKHJlcywgcmVzLmxlbmd0aCk7XG5cbiAgfSk7XG5cbiAgaXQoJ2NyZWF0ZSBxdWV1ZSBhbmQgZHluYW1pY2FsbHkgYWRkIGFzeW5jIHRhc2sgdG8gaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qge2FkZH0gPSBxdWV1ZSgzKTtcbiAgICBjb25zdCBkb25lcyA9IFtdIGFzIFByb21pc2U8bnVtYmVyPltdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgY29uc3QgZG9uZSA9IGFkZCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPihyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoaWR4KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IGRvbmUgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgICAgZG9uZXMucHVzaChkb25lKTtcbiAgICB9XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHtcbiAgICAgIGNvbnN0IGRvbmUgPSBhZGQoKCkgPT4ge1xuICAgICAgICBjb25zdCBpZHggPSAxMCArIGk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gc3RhcnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPihyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoaWR4KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IGRvbmUgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICB9LCA1MDApKTtcbiAgICAgIH0pO1xuICAgICAgZG9uZXMucHVzaChkb25lKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpKTtcbiAgfSk7XG59KTtcbiJdfQ==