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
const promise_queque_1 = require("../utils/promise-queque");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS1xdWVxdWVTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy9wcm9taXNlLXF1ZXF1ZVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsNERBQXVEO0FBRXZELFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzdCLEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFTLEVBQUU7UUFDbkQsTUFBTSxPQUFPLEdBQUcsRUFBK0IsQ0FBQztRQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNoQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUM7Z0JBQzVCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUM7Z0JBQzdCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE1BQU0sR0FBRyxHQUFHLE1BQU0sd0JBQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRS9CLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsbURBQW1ELEVBQUUsR0FBUyxFQUFFO1FBQ2pFLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxzQkFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLEVBQXVCLENBQUM7UUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUNwQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBVSxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRCxPQUFPLElBQUksT0FBTyxDQUFTLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLFNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbEI7UUFFRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXhELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDcEIsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBVSxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRCxPQUFPLElBQUksT0FBTyxDQUFTLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLFNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbEI7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQge3F1ZXVlVXAsIHF1ZXVlfSBmcm9tICcuLi91dGlscy9wcm9taXNlLXF1ZXF1ZSc7XG5cbmRlc2NyaWJlKCdwcm9taXNlLXF1ZXVlJywgKCkgPT4ge1xuICBpdCgncGFyYWxsZWwgcXVldWVVcCgpIHRhc2sgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYWN0aW9ucyA9IFtdIGFzIEFycmF5PCgpID0+IFByb21pc2U8YW55Pj47XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICBhY3Rpb25zLnB1c2goKCkgPT4ge1xuICAgICAgICBjb25zdCBpZHggPSBpO1xuICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IHN0YXJ0YCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoaWR4KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IGRvbmVgKTtcbiAgICAgICAgfSwgNTAwKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVzID0gYXdhaXQgcXVldWVVcCgzLCBhY3Rpb25zKTtcbiAgICBjb25zb2xlLmxvZyhyZXMsIHJlcy5sZW5ndGgpO1xuXG4gIH0pO1xuXG4gIGl0KCdjcmVhdGUgcXVldWUgYW5kIGR5bmFtaWNhbGx5IGFkZCBhc3luYyB0YXNrIHRvIGl0JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHthZGR9ID0gcXVldWUoMyk7XG4gICAgY29uc3QgZG9uZXMgPSBbXSBhcyBQcm9taXNlPG51bWJlcj5bXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgIGNvbnN0IGRvbmUgPSBhZGQoKCkgPT4ge1xuICAgICAgICBjb25zdCBpZHggPSBpO1xuICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IHN0YXJ0ICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX1gKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlcj4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGlkeCk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBkb25lICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX1gKTtcbiAgICAgICAgfSwgNTAwKSk7XG4gICAgICB9KTtcbiAgICAgIGRvbmVzLnB1c2goZG9uZSk7XG4gICAgfVxuXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICBjb25zdCBkb25lID0gYWRkKCgpID0+IHtcbiAgICAgICAgY29uc3QgaWR4ID0gMTAgKyBpO1xuICAgICAgICBjb25zb2xlLmxvZyhgJHtpZHh9IHN0YXJ0ICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX1gKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlcj4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZXNvbHZlKGlkeCk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCR7aWR4fSBkb25lICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX1gKTtcbiAgICAgICAgfSwgNTAwKSk7XG4gICAgICB9KTtcbiAgICAgIGRvbmVzLnB1c2goZG9uZSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKSk7XG4gIH0pO1xufSk7XG4iXX0=