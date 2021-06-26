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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.log('-----------');
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkLWNsaWVudFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxnRUFBcUU7QUFDckUsK0JBQXdDO0FBQ3hDLDhDQUEyQztBQUUzQywyQkFBMkI7QUFDM0IsT0FBTyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFTLEVBQUU7UUFFbEQsTUFBTSxTQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUscUJBQWMsQ0FBQzthQUMzRixJQUFJLENBQ0gsbUJBQU87UUFDUCxzQ0FBc0M7UUFDdEMsZUFBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDOUMsa0JBQU0sQ0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQWMsQ0FBQyxFQUNsQixlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQ3pELENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxHQUFTLEVBQUU7UUFFdkMsTUFBTSxzQkFBVSxDQUFDO1lBQ2YsR0FBRyxFQUFFLGlDQUFpQztZQUN0QyxVQUFVLEVBQUUsdUJBQXVCO1lBQ25DLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxFQUFFLENBQUM7U0FDYixFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDekMsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHt0b0xpbmVzLCBzZW5kQXBwWmlwfSBmcm9tICcuLi8uLi9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCc7XG5pbXBvcnQge29mLCBhc3luY1NjaGVkdWxlcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3RhcCwgcmVkdWNlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuamFzbWluZS5ERUZBVUxUX1RJTUVPVVRfSU5URVJWQUwgPSA1ICogNjAgKiAxMDAwO1xuXG5kZXNjcmliZSgnY2QtY2xpZW50JywgKCkgPT4ge1xuICB4aXQoJ3RvTGluZXMgcGlwZSBvcGVyYXRvciBzaG91bGQgd29yaycsIGFzeW5jICgpID0+IHtcblxuICAgIGF3YWl0IG9mKEJ1ZmZlci5mcm9tKCdcXG5hYmNkJyksIEJ1ZmZlci5mcm9tKCdlZmdcXG4xMjMnKSwgQnVmZmVyLmZyb20oJzRcXG4nKSwgYXN5bmNTY2hlZHVsZXIpXG4gICAgLnBpcGUoXG4gICAgICB0b0xpbmVzLFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIHRhcChsaW5lID0+IGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKSksXG4gICAgICByZWR1Y2U8c3RyaW5nPigoYWNjLCB2YWx1ZSkgPT4ge1xuICAgICAgICBhY2MucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCBbXSBhcyBzdHJpbmdbXSksXG4gICAgICB0YXAoYWxsID0+IGV4cGVjdChhbGwpLnRvRXF1YWwoWycnLCAnYWJjZGVmZycsICcxMjM0J10pKVxuICAgICkudG9Qcm9taXNlKCk7XG4gIH0pO1xuXG4gIHhpdCgnc2VuZEFwcFppcCBzaG91bGQgd29yaycsIGFzeW5jICgpID0+IHtcblxuICAgIGF3YWl0IHNlbmRBcHBaaXAoe1xuICAgICAgdXJsOiAnaHR0cDovL2xvY2FsaG9zdDoxNDMzMy9faW5zdGFsbCcsXG4gICAgICByZW1vdGVGaWxlOiAnaW5zdGFsbC1sb2NhbC90ZXN0YXBwJyxcbiAgICAgIG51bU9mQ29uYzogMixcbiAgICAgIG51bU9mTm9kZTogMVxuICAgIH0sICcvVXNlcnMvbGl1amluZy9iay93ZWJ1aS1zdGF0aWMuemlwJyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0nKTtcbiAgfSk7XG59KTtcbiJdfQ==