"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// describe('Utils', () => {
//   test('keyOfUri', () => {
//     console.log('here');
//     const key = testable.keyOfUri('GET', '/foobar/it');
//     expect(key).toBe('GET/foobar/it');
//   });
// });
test('keyOfUri', () => {
    console.log('here');
    const key = utils_1.testable.keyOfUri('GET', '/foobar/it');
    expect(key).toBe('GET/foobar/it');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMtamVzdC1zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXRpbHMtamVzdC1zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0NBQWtDO0FBRWxDLDRCQUE0QjtBQUM1Qiw2QkFBNkI7QUFDN0IsMkJBQTJCO0FBQzNCLDBEQUEwRDtBQUMxRCx5Q0FBeUM7QUFDekMsUUFBUTtBQUNSLE1BQU07QUFFTixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNuRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHt0ZXN0YWJsZX0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vLyBkZXNjcmliZSgnVXRpbHMnLCAoKSA9PiB7XG4vLyAgIHRlc3QoJ2tleU9mVXJpJywgKCkgPT4ge1xuLy8gICAgIGNvbnNvbGUubG9nKCdoZXJlJyk7XG4vLyAgICAgY29uc3Qga2V5ID0gdGVzdGFibGUua2V5T2ZVcmkoJ0dFVCcsICcvZm9vYmFyL2l0Jyk7XG4vLyAgICAgZXhwZWN0KGtleSkudG9CZSgnR0VUL2Zvb2Jhci9pdCcpO1xuLy8gICB9KTtcbi8vIH0pO1xuXG50ZXN0KCdrZXlPZlVyaScsICgpID0+IHtcbiAgY29uc29sZS5sb2coJ2hlcmUnKTtcbiAgY29uc3Qga2V5ID0gdGVzdGFibGUua2V5T2ZVcmkoJ0dFVCcsICcvZm9vYmFyL2l0Jyk7XG4gIGV4cGVjdChrZXkpLnRvQmUoJ0dFVC9mb29iYXIvaXQnKTtcbn0pO1xuIl19