"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const stream = tslib_1.__importStar(require("stream"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInV0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLCtCQUErQjtBQUMvQix1REFBaUM7QUFDakMsb0NBQXFEO0FBRXJELFNBQWdCLElBQUk7SUFDbEIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQyxJQUFJLENBQUMsS0FBSztZQUNSLElBQUksVUFBVSxFQUFFO2dCQUNkLE9BQU87YUFDUjtZQUNELFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1lBQ0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNULENBQUM7S0FDRixDQUFDLENBQUM7SUFDSCxNQUFNLEdBQUcsR0FBRyxJQUFBLG1DQUEyQixFQUFDLEtBQUssQ0FBQyxDQUFDO0lBRS9DLFNBQVMsUUFBUTtRQUNmLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNsQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUN6QyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNqQixFQUFFLEVBQUUsQ0FBQztnQkFDTCxRQUFRLElBQUksR0FBRyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxLQUFLLENBQUMsRUFBRTtnQkFDTixFQUFFLEVBQUUsQ0FBQztnQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7U0FBQyxDQUNILEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7SUFDZixDQUFDO0lBQ0QsUUFBUSxFQUFFLENBQUM7SUFDWCxRQUFRLEVBQUUsQ0FBQztJQUNYLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQW5DRCxvQkFtQ0M7QUFDRCxxQ0FBcUM7QUFFckMsNEJBQTRCO0FBQzVCLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFDM0IsMERBQTBEO0FBQzFELHlDQUF5QztBQUN6QyxRQUFRO0FBQ1IsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHtjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3Rvcnl9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHRlc3QoKSB7XG4gIGxldCByZWFkU3RhcnRzID0gZmFsc2U7XG4gIGNvbnN0IGlucHV0ID0gbmV3IHN0cmVhbS5SZWFkYWJsZSh7XG4gICAgcmVhZChfc2l6ZSkge1xuICAgICAgaWYgKHJlYWRTdGFydHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmVhZFN0YXJ0cyA9IHRydWU7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnB1c2goaSArICcsICcpLCAwKTtcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnB1c2goJ292ZXInKTtcbiAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgfSwgNTApO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGZhYyA9IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShpbnB1dCk7XG5cbiAgZnVuY3Rpb24gcmVhZE9uY2UoKSB7XG4gICAgbGV0IHNlbnRhbmNlID0gJyc7XG4gICAgc3RyZWFtLnBpcGVsaW5lKGZhYygpLCBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgIHdyaXRlKHN0ciwgX2VuYywgY2IpIHtcbiAgICAgICAgY2IoKTtcbiAgICAgICAgc2VudGFuY2UgKz0gc3RyO1xuICAgICAgfSxcbiAgICAgIGZpbmFsKGNiKSB7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKHNlbnRhbmNlKTtcbiAgICAgIH19XG4gICAgKSwgKCkgPT4ge30pO1xuICB9XG4gIHJlYWRPbmNlKCk7XG4gIHJlYWRPbmNlKCk7XG4gIHNldFRpbWVvdXQocmVhZE9uY2UsIDApO1xufVxuLy8gaW1wb3J0IHt0ZXN0YWJsZX0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vLyBkZXNjcmliZSgnVXRpbHMnLCAoKSA9PiB7XG4vLyAgIHRlc3QoJ2tleU9mVXJpJywgKCkgPT4ge1xuLy8gICAgIGNvbnNvbGUubG9nKCdoZXJlJyk7XG4vLyAgICAgY29uc3Qga2V5ID0gdGVzdGFibGUua2V5T2ZVcmkoJ0dFVCcsICcvZm9vYmFyL2l0Jyk7XG4vLyAgICAgZXhwZWN0KGtleSkudG9CZSgnR0VUL2Zvb2Jhci9pdCcpO1xuLy8gICB9KTtcbi8vIH0pO1xuXG4iXX0=