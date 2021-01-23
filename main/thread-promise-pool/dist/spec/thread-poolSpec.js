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
// tslint:disable:no-console
const index_1 = require("../index");
describe('Thread pool', () => {
    it('all worker should run simultaneously', () => __awaiter(void 0, void 0, void 0, function* () {
        const pool = new index_1.Pool(3, 999);
        const dones = [];
        for (let i = 1; i <= 3; i++) {
            dones.push(pool.submit({
                file: require.resolve('./thread-job'),
                exportFn: 'default',
                args: [i]
            }));
        }
        const res = yield Promise.all(dones);
        console.log('--- end ----', res);
        expect(res).toEqual([10, 20, 30]);
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2xTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGhyZWFkLXBvb2xTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLG9DQUE4QjtBQUU5QixRQUFRLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUMzQixFQUFFLENBQUMsc0NBQXNDLEVBQUUsR0FBUyxFQUFFO1FBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksWUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBc0IsRUFBRSxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFTO2dCQUM3QixJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7Z0JBQ3JDLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDVixDQUFDLENBQUMsQ0FBQztTQUNMO1FBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0IHtQb29sfSBmcm9tICcuLi9pbmRleCc7XG5cbmRlc2NyaWJlKCdUaHJlYWQgcG9vbCcsICgpID0+IHtcbiAgaXQoJ2FsbCB3b3JrZXIgc2hvdWxkIHJ1biBzaW11bHRhbmVvdXNseScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwb29sID0gbmV3IFBvb2woMywgOTk5KTtcbiAgICBjb25zdCBkb25lczogUHJvbWlzZTxudW1iZXI+W10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICAgIGRvbmVzLnB1c2gocG9vbC5zdWJtaXQ8bnVtYmVyPih7XG4gICAgICAgIGZpbGU6IHJlcXVpcmUucmVzb2x2ZSgnLi90aHJlYWQtam9iJyksXG4gICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgIGFyZ3M6IFtpXVxuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gICAgY29uc29sZS5sb2coJy0tLSBlbmQgLS0tLScsIHJlcyk7XG4gICAgZXhwZWN0KHJlcykudG9FcXVhbChbMTAsIDIwLCAzMF0pO1xuICB9KTtcbn0pO1xuIl19