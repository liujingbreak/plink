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
            file: 'install-local/testapp',
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // tslint:disable-next-line: no-console
        console.log('-----------');
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9zcGVjL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50U3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLGdFQUFxRTtBQUNyRSwrQkFBd0M7QUFDeEMsOENBQTJDO0FBRTNDLDJCQUEyQjtBQUMzQixPQUFPLENBQUMsd0JBQXdCLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFFakQsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDekIsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLEdBQVMsRUFBRTtRQUVsRCxNQUFNLFNBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxxQkFBYyxDQUFDO2FBQzNGLElBQUksQ0FDSCxtQkFBTztRQUNQLHVDQUF1QztRQUN2QyxlQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUM5QyxrQkFBTSxDQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsRUFBYyxDQUFDLEVBQ2xCLGVBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FDekQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQVMsRUFBRTtRQUV2QyxNQUFNLHNCQUFVLENBQUM7WUFDZixHQUFHLEVBQUUsaUNBQWlDO1lBQ3RDLElBQUksRUFBRSx1QkFBdUI7WUFDN0IsU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLEVBQUUsQ0FBQztTQUNiLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUN6Qyx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoicnVudGltZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3Qvc3BlYy9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
