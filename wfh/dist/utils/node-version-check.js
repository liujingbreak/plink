"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_utils_1 = require("../process-utils");
function ensureNodeVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const output = yield process_utils_1.promisifySpawn('node', '-v', { cwd: process.cwd(), silent: true });
        const match = /^v?([^]+)$/.exec(output.trim());
        if (match) {
            if (parseInt(match[1].split('.')[0], 10) < 12) {
                // tslint:disable-next-line: no-console
                console.log('Please upgrade Node.js version to v12, current version: ' + match[1]);
                try {
                    yield require('open')('https://nodejs.org/');
                }
                catch (ex) {
                    // It is OK for errors, probably dependency 'open' is not installed yet
                }
                throw new Error('Please upgrade Node.js version to v12');
            }
        }
        else {
            // tslint:disable-next-line: no-console
            console.log('Can not recognize "node -v" output:', output);
            throw new Error('Can not recognize "node -v" output:' + output);
        }
    });
}
exports.default = ensureNodeVersion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS12ZXJzaW9uLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxvREFBeUQ7QUFFekQsU0FBOEIsaUJBQWlCOztRQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLDhCQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLEtBQUssRUFBRTtZQUNULElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUM3Qyx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMERBQTBELEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25GLElBQUk7b0JBQ0YsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztpQkFDOUM7Z0JBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsdUVBQXVFO2lCQUN4RTtnQkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7YUFDMUQ7U0FDRjthQUFNO1lBQ0wsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDM0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsR0FBRyxNQUFNLENBQUMsQ0FBQztTQUNqRTtJQUNILENBQUM7Q0FBQTtBQW5CRCxvQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3Byb21pc2lmeVNwYXduIGFzIHNwYXdufSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlTm9kZVZlcnNpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IG91dHB1dCA9IGF3YWl0IHNwYXduKCdub2RlJywgJy12Jywge2N3ZDogcHJvY2Vzcy5jd2QoKSwgc2lsZW50OiB0cnVlfSk7XG4gIGNvbnN0IG1hdGNoID0gL152PyhbXl0rKSQvLmV4ZWMob3V0cHV0LnRyaW0oKSk7XG4gIGlmIChtYXRjaCkge1xuICAgIGlmIChwYXJzZUludChtYXRjaFsxXS5zcGxpdCgnLicpWzBdLCAxMCkgPCAxMikge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUGxlYXNlIHVwZ3JhZGUgTm9kZS5qcyB2ZXJzaW9uIHRvIHYxMiwgY3VycmVudCB2ZXJzaW9uOiAnICsgbWF0Y2hbMV0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgcmVxdWlyZSgnb3BlbicpKCdodHRwczovL25vZGVqcy5vcmcvJyk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAvLyBJdCBpcyBPSyBmb3IgZXJyb3JzLCBwcm9iYWJseSBkZXBlbmRlbmN5ICdvcGVuJyBpcyBub3QgaW5zdGFsbGVkIHlldFxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgdXBncmFkZSBOb2RlLmpzIHZlcnNpb24gdG8gdjEyJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdDYW4gbm90IHJlY29nbml6ZSBcIm5vZGUgLXZcIiBvdXRwdXQ6Jywgb3V0cHV0KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgcmVjb2duaXplIFwibm9kZSAtdlwiIG91dHB1dDonICsgb3V0cHV0KTtcbiAgfVxufVxuIl19