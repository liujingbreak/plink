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

//# sourceMappingURL=thread-poolSpec.js.map
