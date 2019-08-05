"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const upgrade_viewchild_ng8_1 = require("../utils/upgrade-viewchild-ng8");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
describe('ViewChild transformer', () => {
    it('should work', () => {
        const content = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../ts/spec/upgrade-viewchild-ng8-sample.txt'), 'utf8');
        const newContent = upgrade_viewchild_ng8_1.transform(content, 'test view child upgrade');
        // tslint:disable-next-line: no-console
        console.log(newContent);
        // expect(newContent)
        // TODO
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3VwZ3JhZGUtdmlld2NoaWxkLW5nOFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMEVBQXlEO0FBQ3pELG9EQUFvQjtBQUNwQix3REFBd0I7QUFFeEIsUUFBUSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxFQUFFLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQzFDLFNBQVMsRUFBRSxnREFBZ0QsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sVUFBVSxHQUFHLGlDQUFTLENBQUMsT0FBTyxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDakUsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEIscUJBQXFCO1FBQ3JCLE9BQU87SUFDVCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvdXBncmFkZS12aWV3Y2hpbGQtbmc4U3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7dHJhbnNmb3JtfSBmcm9tICcuLi91dGlscy91cGdyYWRlLXZpZXdjaGlsZC1uZzgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5kZXNjcmliZSgnVmlld0NoaWxkIHRyYW5zZm9ybWVyJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoXG4gICAgICBfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL3VwZ3JhZGUtdmlld2NoaWxkLW5nOC1zYW1wbGUudHh0JyksICd1dGY4Jyk7XG4gICAgY29uc3QgbmV3Q29udGVudCA9IHRyYW5zZm9ybShjb250ZW50LCAndGVzdCB2aWV3IGNoaWxkIHVwZ3JhZGUnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhuZXdDb250ZW50KTtcbiAgICAvLyBleHBlY3QobmV3Q29udGVudClcbiAgICAvLyBUT0RPXG4gIH0pO1xufSk7XG5cbiJdfQ==
