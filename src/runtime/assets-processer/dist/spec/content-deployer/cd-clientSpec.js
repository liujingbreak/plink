"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cd_client_1 = require("../../content-deployer/cd-client");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import Path from 'path';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('cd-client', () => {
    xit('toLines pipe operator should work', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield rxjs_1.of(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), rxjs_1.asyncScheduler)
            .pipe(cd_client_1.toLines, 
        // tslint:disable-next-line: no-console
        operators_1.tap(line => console.log(JSON.stringify(line))), operators_1.reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []), operators_1.tap(all => expect(all).toEqual(['', 'abcdefg', '1234']))).toPromise();
    }));
    xit('sendAppZip should work', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield cd_client_1.sendAppZip({
            url: 'http://localhost:14333/_install',
            appName: 'testapp',
            version: 4,
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // tslint:disable-next-line: no-console
        console.log('-----------');
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3NwZWMvY29udGVudC1kZXBsb3llci9jZC1jbGllbnRTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdFQUFxRTtBQUNyRSwrQkFBd0M7QUFDeEMsOENBQTJDO0FBRTNDLDJCQUEyQjtBQUMzQixPQUFPLENBQUMsd0JBQXdCLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFFakQsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDekIsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLEdBQVMsRUFBRTtRQUVsRCxNQUFNLFNBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxxQkFBYyxDQUFDO2FBQzNGLElBQUksQ0FDSCxtQkFBTztRQUNQLHVDQUF1QztRQUN2QyxlQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUM5QyxrQkFBTSxDQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsRUFBYyxDQUFDLEVBQ2xCLGVBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FDekQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQVMsRUFBRTtRQUV2QyxNQUFNLHNCQUFVLENBQUM7WUFDZixHQUFHLEVBQUUsaUNBQWlDO1lBQ3RDLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxDQUFDO1lBQ1YsU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLEVBQUUsQ0FBQztTQUNiLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUN6Qyx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9zcGVjL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50U3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7dG9MaW5lcywgc2VuZEFwcFppcH0gZnJvbSAnLi4vLi4vY29udGVudC1kZXBsb3llci9jZC1jbGllbnQnO1xuaW1wb3J0IHtvZiwgYXN5bmNTY2hlZHVsZXJ9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXAsIHJlZHVjZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmphc21pbmUuREVGQVVMVF9USU1FT1VUX0lOVEVSVkFMID0gNSAqIDYwICogMTAwMDtcblxuZGVzY3JpYmUoJ2NkLWNsaWVudCcsICgpID0+IHtcbiAgeGl0KCd0b0xpbmVzIHBpcGUgb3BlcmF0b3Igc2hvdWxkIHdvcmsnLCBhc3luYyAoKSA9PiB7XG5cbiAgICBhd2FpdCBvZihCdWZmZXIuZnJvbSgnXFxuYWJjZCcpLCBCdWZmZXIuZnJvbSgnZWZnXFxuMTIzJyksIEJ1ZmZlci5mcm9tKCc0XFxuJyksIGFzeW5jU2NoZWR1bGVyKVxuICAgIC5waXBlKFxuICAgICAgdG9MaW5lcyxcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgdGFwKGxpbmUgPT4gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGluZSkpKSxcbiAgICAgIHJlZHVjZTxzdHJpbmc+KChhY2MsIHZhbHVlKSA9PiB7XG4gICAgICAgIGFjYy5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sIFtdIGFzIHN0cmluZ1tdKSxcbiAgICAgIHRhcChhbGwgPT4gZXhwZWN0KGFsbCkudG9FcXVhbChbJycsICdhYmNkZWZnJywgJzEyMzQnXSkpXG4gICAgKS50b1Byb21pc2UoKTtcbiAgfSk7XG5cbiAgeGl0KCdzZW5kQXBwWmlwIHNob3VsZCB3b3JrJywgYXN5bmMgKCkgPT4ge1xuXG4gICAgYXdhaXQgc2VuZEFwcFppcCh7XG4gICAgICB1cmw6ICdodHRwOi8vbG9jYWxob3N0OjE0MzMzL19pbnN0YWxsJyxcbiAgICAgIGFwcE5hbWU6ICd0ZXN0YXBwJyxcbiAgICAgIHZlcnNpb246IDQsXG4gICAgICBudW1PZkNvbmM6IDIsXG4gICAgICBudW1PZk5vZGU6IDFcbiAgICB9LCAnL1VzZXJzL2xpdWppbmcvYmsvd2VidWktc3RhdGljLnppcCcpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLScpO1xuICB9KTtcbn0pO1xuIl19
