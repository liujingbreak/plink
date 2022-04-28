"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
/* eslint-disable no-console */
const stream = __importStar(require("stream"));
const utils_1 = require("../utils");
function test() {
    let readStarts = false;
    const input = new stream.Readable({
        read(_size) {
            if (readStarts) {
                return;
            }
            readStarts = true;
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.push(i + ', '), 0);
            }
            setTimeout(() => {
                this.push('over');
                this.push(null);
            }, 50);
        }
    });
    const fac = (0, utils_1.createReplayReadableFactory)(input);
    function readOnce() {
        let sentance = '';
        stream.pipeline(fac(), new stream.Writable({
            write(str, _enc, cb) {
                cb();
                sentance += str;
            },
            final(cb) {
                cb();
                console.log(sentance);
            }
        }), () => { });
    }
    readOnce();
    readOnce();
    setTimeout(readOnce, 0);
}
exports.test = test;
// import {testable} from '../utils';
// describe('Utils', () => {
//   test('keyOfUri', () => {
//     console.log('here');
//     const key = testable.keyOfUri('GET', '/foobar/it');
//     expect(key).toBe('GET/foobar/it');
//   });
// });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsK0NBQWlDO0FBQ2pDLG9DQUFxRDtBQUVyRCxTQUFnQixJQUFJO0lBQ2xCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztJQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUs7WUFDUixJQUFJLFVBQVUsRUFBRTtnQkFDZCxPQUFPO2FBQ1I7WUFDRCxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzNCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMxQztZQUNELFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDVCxDQUFDO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxHQUFHLEdBQUcsSUFBQSxtQ0FBMkIsRUFBQyxLQUFLLENBQUMsQ0FBQztJQUUvQyxTQUFTLFFBQVE7UUFDZixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDekMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDakIsRUFBRSxFQUFFLENBQUM7Z0JBQ0wsUUFBUSxJQUFJLEdBQUcsQ0FBQztZQUNsQixDQUFDO1lBQ0QsS0FBSyxDQUFDLEVBQUU7Z0JBQ04sRUFBRSxFQUFFLENBQUM7Z0JBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4QixDQUFDO1NBQUMsQ0FDSCxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUNELFFBQVEsRUFBRSxDQUFDO0lBQ1gsUUFBUSxFQUFFLENBQUM7SUFDWCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFuQ0Qsb0JBbUNDO0FBQ0QscUNBQXFDO0FBRXJDLDRCQUE0QjtBQUM1Qiw2QkFBNkI7QUFDN0IsMkJBQTJCO0FBQzNCLDBEQUEwRDtBQUMxRCx5Q0FBeUM7QUFDekMsUUFBUTtBQUNSLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7Y3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5fSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0KCkge1xuICBsZXQgcmVhZFN0YXJ0cyA9IGZhbHNlO1xuICBjb25zdCBpbnB1dCA9IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgIHJlYWQoX3NpemUpIHtcbiAgICAgIGlmIChyZWFkU3RhcnRzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJlYWRTdGFydHMgPSB0cnVlO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wdXNoKGkgKyAnLCAnKSwgMCk7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5wdXNoKCdvdmVyJyk7XG4gICAgICAgIHRoaXMucHVzaChudWxsKTtcbiAgICAgIH0sIDUwKTtcbiAgICB9XG4gIH0pO1xuICBjb25zdCBmYWMgPSBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkoaW5wdXQpO1xuXG4gIGZ1bmN0aW9uIHJlYWRPbmNlKCkge1xuICAgIGxldCBzZW50YW5jZSA9ICcnO1xuICAgIHN0cmVhbS5waXBlbGluZShmYWMoKSwgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICB3cml0ZShzdHIsIF9lbmMsIGNiKSB7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIHNlbnRhbmNlICs9IHN0cjtcbiAgICAgIH0sXG4gICAgICBmaW5hbChjYikge1xuICAgICAgICBjYigpO1xuICAgICAgICBjb25zb2xlLmxvZyhzZW50YW5jZSk7XG4gICAgICB9fVxuICAgICksICgpID0+IHt9KTtcbiAgfVxuICByZWFkT25jZSgpO1xuICByZWFkT25jZSgpO1xuICBzZXRUaW1lb3V0KHJlYWRPbmNlLCAwKTtcbn1cbi8vIGltcG9ydCB7dGVzdGFibGV9IGZyb20gJy4uL3V0aWxzJztcblxuLy8gZGVzY3JpYmUoJ1V0aWxzJywgKCkgPT4ge1xuLy8gICB0ZXN0KCdrZXlPZlVyaScsICgpID0+IHtcbi8vICAgICBjb25zb2xlLmxvZygnaGVyZScpO1xuLy8gICAgIGNvbnN0IGtleSA9IHRlc3RhYmxlLmtleU9mVXJpKCdHRVQnLCAnL2Zvb2Jhci9pdCcpO1xuLy8gICAgIGV4cGVjdChrZXkpLnRvQmUoJ0dFVC9mb29iYXIvaXQnKTtcbi8vICAgfSk7XG4vLyB9KTtcblxuIl19