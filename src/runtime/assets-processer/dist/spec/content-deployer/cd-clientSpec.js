"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cd_client_1 = require("../../content-deployer/cd-client");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import Path from 'path';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('cd-client', () => {
    xit('toLines pipe operator should work', async () => {
        await (0, rxjs_1.of)(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), rxjs_1.asyncScheduler)
            .pipe(cd_client_1.toLines, 
        // eslint-disable-next-line no-console
        (0, operators_1.tap)(line => console.log(JSON.stringify(line))), (0, operators_1.reduce)((acc, value) => {
            acc.push(value);
            return acc;
        }, []), (0, operators_1.tap)(all => expect(all).toEqual(['', 'abcdefg', '1234']))).toPromise();
    });
    xit('sendAppZip should work', async () => {
        await (0, cd_client_1.sendAppZip)({
            url: 'http://localhost:14333/_install',
            remoteFile: 'install-local/testapp',
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // eslint-disable-next-line no-console
        console.log('-----------');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkLWNsaWVudFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnRUFBcUU7QUFDckUsK0JBQXdDO0FBQ3hDLDhDQUEyQztBQUUzQywyQkFBMkI7QUFDM0IsT0FBTyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUVsRCxNQUFNLElBQUEsU0FBRSxFQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLHFCQUFjLENBQUM7YUFDM0YsSUFBSSxDQUNILG1CQUFPO1FBQ1Asc0NBQXNDO1FBQ3RDLElBQUEsZUFBRyxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDOUMsSUFBQSxrQkFBTSxFQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsRUFBYyxDQUFDLEVBQ2xCLElBQUEsZUFBRyxFQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUN6RCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBRXZDLE1BQU0sSUFBQSxzQkFBVSxFQUFDO1lBQ2YsR0FBRyxFQUFFLGlDQUFpQztZQUN0QyxVQUFVLEVBQUUsdUJBQXVCO1lBQ25DLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxFQUFFLENBQUM7U0FDYixFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDekMsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7dG9MaW5lcywgc2VuZEFwcFppcH0gZnJvbSAnLi4vLi4vY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnO1xuaW1wb3J0IHtvZiwgYXN5bmNTY2hlZHVsZXJ9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXAsIHJlZHVjZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gNSAqIDYwICogMTAwMDtcblxuZGVzY3JpYmUoJ2NkLWNsaWVudCcsICgpID0+IHtcbiAgeGl0KCd0b0xpbmVzIHBpcGUgb3BlcmF0b3Igc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBvZihCdWZmZXIuZnJvbSgnXFxuYWJjZCcpLCBCdWZmZXIuZnJvbSgnZWZnXFxuMTIzJyksIEJ1ZmZlci5mcm9tKCc0XFxuJyksIGFzeW5jU2NoZWR1bGVyKVxuICAgIC5waXBlKFxuICAgICAgdG9MaW5lcyxcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICB0YXAobGluZSA9PiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShsaW5lKSkpLFxuICAgICAgcmVkdWNlPHN0cmluZz4oKGFjYywgdmFsdWUpID0+IHtcbiAgICAgICAgYWNjLnB1c2godmFsdWUpO1xuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwgW10gYXMgc3RyaW5nW10pLFxuICAgICAgdGFwKGFsbCA9PiBleHBlY3QoYWxsKS50b0VxdWFsKFsnJywgJ2FiY2RlZmcnLCAnMTIzNCddKSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICB9KTtcblxuICB4aXQoJ3NlbmRBcHBaaXAgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIHVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMvX2luc3RhbGwnLFxuICAgICAgcmVtb3RlRmlsZTogJ2luc3RhbGwtbG9jYWwvdGVzdGFwcCcsXG4gICAgICBudW1PZkNvbmM6IDIsXG4gICAgICBudW1PZk5vZGU6IDFcbiAgICB9LCAnL1VzZXJzL2xpdWppbmcvYmsvd2VidWktc3RhdGljLnppcCcpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tJyk7XG4gIH0pO1xufSk7XG4iXX0=