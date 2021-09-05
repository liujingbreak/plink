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
const cd_client_1 = require("../../content-deployer/cd-client");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import Path from 'path';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('cd-client', () => {
    xit('toLines pipe operator should work', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, rxjs_1.of)(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), rxjs_1.asyncScheduler)
            .pipe(cd_client_1.toLines, 
        // eslint-disable-next-line no-console
        (0, operators_1.tap)(line => console.log(JSON.stringify(line))), (0, operators_1.reduce)((acc, value) => {
            acc.push(value);
            return acc;
        }, []), (0, operators_1.tap)(all => expect(all).toEqual(['', 'abcdefg', '1234']))).toPromise();
    }));
    xit('sendAppZip should work', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, cd_client_1.sendAppZip)({
            url: 'http://localhost:14333/_install',
            remoteFile: 'install-local/testapp',
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // eslint-disable-next-line no-console
        console.log('-----------');
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkLWNsaWVudFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxnRUFBcUU7QUFDckUsK0JBQXdDO0FBQ3hDLDhDQUEyQztBQUUzQywyQkFBMkI7QUFDM0IsT0FBTyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFTLEVBQUU7UUFFbEQsTUFBTSxJQUFBLFNBQUUsRUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxxQkFBYyxDQUFDO2FBQzNGLElBQUksQ0FDSCxtQkFBTztRQUNQLHNDQUFzQztRQUN0QyxJQUFBLGVBQUcsRUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQzlDLElBQUEsa0JBQU0sRUFBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQWMsQ0FBQyxFQUNsQixJQUFBLGVBQUcsRUFBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FDekQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQVMsRUFBRTtRQUV2QyxNQUFNLElBQUEsc0JBQVUsRUFBQztZQUNmLEdBQUcsRUFBRSxpQ0FBaUM7WUFDdEMsVUFBVSxFQUFFLHVCQUF1QjtZQUNuQyxTQUFTLEVBQUUsQ0FBQztZQUNaLFNBQVMsRUFBRSxDQUFDO1NBQ2IsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3pDLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7dG9MaW5lcywgc2VuZEFwcFppcH0gZnJvbSAnLi4vLi4vY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnO1xuaW1wb3J0IHtvZiwgYXN5bmNTY2hlZHVsZXJ9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXAsIHJlZHVjZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gNSAqIDYwICogMTAwMDtcblxuZGVzY3JpYmUoJ2NkLWNsaWVudCcsICgpID0+IHtcbiAgeGl0KCd0b0xpbmVzIHBpcGUgb3BlcmF0b3Igc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBvZihCdWZmZXIuZnJvbSgnXFxuYWJjZCcpLCBCdWZmZXIuZnJvbSgnZWZnXFxuMTIzJyksIEJ1ZmZlci5mcm9tKCc0XFxuJyksIGFzeW5jU2NoZWR1bGVyKVxuICAgIC5waXBlKFxuICAgICAgdG9MaW5lcyxcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICB0YXAobGluZSA9PiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShsaW5lKSkpLFxuICAgICAgcmVkdWNlPHN0cmluZz4oKGFjYywgdmFsdWUpID0+IHtcbiAgICAgICAgYWNjLnB1c2godmFsdWUpO1xuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwgW10gYXMgc3RyaW5nW10pLFxuICAgICAgdGFwKGFsbCA9PiBleHBlY3QoYWxsKS50b0VxdWFsKFsnJywgJ2FiY2RlZmcnLCAnMTIzNCddKSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICB9KTtcblxuICB4aXQoJ3NlbmRBcHBaaXAgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIHVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMvX2luc3RhbGwnLFxuICAgICAgcmVtb3RlRmlsZTogJ2luc3RhbGwtbG9jYWwvdGVzdGFwcCcsXG4gICAgICBudW1PZkNvbmM6IDIsXG4gICAgICBudW1PZk5vZGU6IDFcbiAgICB9LCAnL1VzZXJzL2xpdWppbmcvYmsvd2VidWktc3RhdGljLnppcCcpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tJyk7XG4gIH0pO1xufSk7XG4iXX0=