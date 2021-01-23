"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable: no-console
const promise_queque_1 = require("../promise-queque");
describe('promise-queue', () => {
    it('parallel queueUp() task should work', () => __awaiter(void 0, void 0, void 0, function* () {
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
    it('create queue and dynamically add async task to it', () => __awaiter(void 0, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWVTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvbWlzZS1xdWVxdWVTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHNEQUFpRDtBQUVqRCxRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUM3QixFQUFFLENBQUMscUNBQXFDLEVBQUUsR0FBUyxFQUFFO1FBQ25ELE1BQU0sT0FBTyxHQUFHLEVBQStCLENBQUM7UUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDaEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDO2dCQUM1QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2dCQUM3QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLHdCQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUUvQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLG1EQUFtRCxFQUFFLEdBQVMsRUFBRTtRQUNqRSxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsc0JBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBRyxFQUF1QixDQUFDO1FBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDcEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDL0QsT0FBTyxJQUFJLE9BQU8sQ0FBUyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDYixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxTQUFTLElBQUksSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2xCO1FBRUQsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU0sR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDL0QsT0FBTyxJQUFJLE9BQU8sQ0FBUyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDYixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxTQUFTLElBQUksSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2xCO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHtxdWV1ZVVwLCBxdWV1ZX0gZnJvbSAnLi4vcHJvbWlzZS1xdWVxdWUnO1xuXG5kZXNjcmliZSgncHJvbWlzZS1xdWV1ZScsICgpID0+IHtcbiAgaXQoJ3BhcmFsbGVsIHF1ZXVlVXAoKSB0YXNrIHNob3VsZCB3b3JrJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGFjdGlvbnMgPSBbXSBhcyBBcnJheTwoKSA9PiBQcm9taXNlPGFueT4+O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHtcbiAgICAgICAgY29uc3QgaWR4ID0gaTtcbiAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBzdGFydGApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGlkeCk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBkb25lYCk7XG4gICAgICAgIH0sIDUwMCkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHF1ZXVlVXAoMywgYWN0aW9ucyk7XG4gICAgY29uc29sZS5sb2cocmVzLCByZXMubGVuZ3RoKTtcblxuICB9KTtcblxuICBpdCgnY3JlYXRlIHF1ZXVlIGFuZCBkeW5hbWljYWxseSBhZGQgYXN5bmMgdGFzayB0byBpdCcsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB7YWRkfSA9IHF1ZXVlKDMpO1xuICAgIGNvbnN0IGRvbmVzID0gW10gYXMgUHJvbWlzZTxudW1iZXI+W107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICBjb25zdCBkb25lID0gYWRkKCgpID0+IHtcbiAgICAgICAgY29uc3QgaWR4ID0gaTtcbiAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBzdGFydCAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXI+KHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShpZHgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gZG9uZSAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCk7XG4gICAgICAgIH0sIDUwMCkpO1xuICAgICAgfSk7XG4gICAgICBkb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgY29uc3QgZG9uZSA9IGFkZCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IDEwICsgaTtcbiAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBzdGFydCAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXI+KHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShpZHgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAke2lkeH0gZG9uZSAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCk7XG4gICAgICAgIH0sIDUwMCkpO1xuICAgICAgfSk7XG4gICAgICBkb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhhd2FpdCBQcm9taXNlLmFsbChkb25lcykpO1xuICB9KTtcbn0pO1xuIl19