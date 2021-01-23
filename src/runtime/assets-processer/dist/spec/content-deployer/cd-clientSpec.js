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
        yield rxjs_1.of(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), rxjs_1.asyncScheduler)
            .pipe(cd_client_1.toLines, 
        // tslint:disable-next-line: no-console
        operators_1.tap(line => console.log(JSON.stringify(line))), operators_1.reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []), operators_1.tap(all => expect(all).toEqual(['', 'abcdefg', '1234']))).toPromise();
    }));
    xit('sendAppZip should work', () => __awaiter(void 0, void 0, void 0, function* () {
        yield cd_client_1.sendAppZip({
            url: 'http://localhost:14333/_install',
            remoteFile: 'install-local/testapp',
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // tslint:disable-next-line: no-console
        console.log('-----------');
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkLWNsaWVudFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxnRUFBcUU7QUFDckUsK0JBQXdDO0FBQ3hDLDhDQUEyQztBQUUzQywyQkFBMkI7QUFDM0IsT0FBTyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFTLEVBQUU7UUFFbEQsTUFBTSxTQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUscUJBQWMsQ0FBQzthQUMzRixJQUFJLENBQ0gsbUJBQU87UUFDUCx1Q0FBdUM7UUFDdkMsZUFBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDOUMsa0JBQU0sQ0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQWMsQ0FBQyxFQUNsQixlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQ3pELENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxHQUFTLEVBQUU7UUFFdkMsTUFBTSxzQkFBVSxDQUFDO1lBQ2YsR0FBRyxFQUFFLGlDQUFpQztZQUN0QyxVQUFVLEVBQUUsdUJBQXVCO1lBQ25DLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxFQUFFLENBQUM7U0FDYixFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDekMsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHt0b0xpbmVzLCBzZW5kQXBwWmlwfSBmcm9tICcuLi8uLi9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCc7XG5pbXBvcnQge29mLCBhc3luY1NjaGVkdWxlcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3RhcCwgcmVkdWNlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSA1ICogNjAgKiAxMDAwO1xuXG5kZXNjcmliZSgnY2QtY2xpZW50JywgKCkgPT4ge1xuICB4aXQoJ3RvTGluZXMgcGlwZSBvcGVyYXRvciBzaG91bGQgd29yaycsIGFzeW5jICgpID0+IHtcblxuICAgIGF3YWl0IG9mKEJ1ZmZlci5mcm9tKCdcXG5hYmNkJyksIEJ1ZmZlci5mcm9tKCdlZmdcXG4xMjMnKSwgQnVmZmVyLmZyb20oJzRcXG4nKSwgYXN5bmNTY2hlZHVsZXIpXG4gICAgLnBpcGUoXG4gICAgICB0b0xpbmVzLFxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICB0YXAobGluZSA9PiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShsaW5lKSkpLFxuICAgICAgcmVkdWNlPHN0cmluZz4oKGFjYywgdmFsdWUpID0+IHtcbiAgICAgICAgYWNjLnB1c2godmFsdWUpO1xuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwgW10gYXMgc3RyaW5nW10pLFxuICAgICAgdGFwKGFsbCA9PiBleHBlY3QoYWxsKS50b0VxdWFsKFsnJywgJ2FiY2RlZmcnLCAnMTIzNCddKSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICB9KTtcblxuICB4aXQoJ3NlbmRBcHBaaXAgc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIHVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMvX2luc3RhbGwnLFxuICAgICAgcmVtb3RlRmlsZTogJ2luc3RhbGwtbG9jYWwvdGVzdGFwcCcsXG4gICAgICBudW1PZkNvbmM6IDIsXG4gICAgICBudW1PZk5vZGU6IDFcbiAgICB9LCAnL1VzZXJzL2xpdWppbmcvYmsvd2VidWktc3RhdGljLnppcCcpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLScpO1xuICB9KTtcbn0pO1xuIl19