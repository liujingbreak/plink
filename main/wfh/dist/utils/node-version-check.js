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
const process_utils_1 = require("../process-utils");
function ensureNodeVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const output = yield process_utils_1.promisifySpawn('node', '-v', { cwd: process.cwd(), silent: true });
        const match = /^v?([^]+)$/.exec(output.trim());
        if (match) {
            if (parseInt(match[1].split('.')[0], 10) < 12) {
                // eslint-disable-next-line no-console
                console.log('Please upgrade Node.js version to v12, current version: ' + match[1]);
                // try {
                //   await require('open')('https://nodejs.org/');
                // } catch (ex) {
                //   // It is OK for errors, probably dependency 'open' is not installed yet
                // }
                // throw new Error('Please upgrade Node.js version to v12');
            }
        }
        else {
            // eslint-disable-next-line no-console
            console.log('Can not recognize "node -v" output:', output);
            throw new Error('Can not recognize "node -v" output:' + output);
        }
    });
}
exports.default = ensureNodeVersion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS12ZXJzaW9uLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXlEO0FBRXpELFNBQThCLGlCQUFpQjs7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSw4QkFBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDN0Msc0NBQXNDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBEQUEwRCxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRixRQUFRO2dCQUNSLGtEQUFrRDtnQkFDbEQsaUJBQWlCO2dCQUNqQiw0RUFBNEU7Z0JBQzVFLElBQUk7Z0JBQ0osNERBQTREO2FBQzdEO1NBQ0Y7YUFBTTtZQUNMLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLEdBQUcsTUFBTSxDQUFDLENBQUM7U0FDakU7SUFDSCxDQUFDO0NBQUE7QUFuQkQsb0NBbUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwcm9taXNpZnlTcGF3biBhcyBzcGF3bn0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZU5vZGVWZXJzaW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBvdXRwdXQgPSBhd2FpdCBzcGF3bignbm9kZScsICctdicsIHtjd2Q6IHByb2Nlc3MuY3dkKCksIHNpbGVudDogdHJ1ZX0pO1xuICBjb25zdCBtYXRjaCA9IC9edj8oW15dKykkLy5leGVjKG91dHB1dC50cmltKCkpO1xuICBpZiAobWF0Y2gpIHtcbiAgICBpZiAocGFyc2VJbnQobWF0Y2hbMV0uc3BsaXQoJy4nKVswXSwgMTApIDwgMTIpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUGxlYXNlIHVwZ3JhZGUgTm9kZS5qcyB2ZXJzaW9uIHRvIHYxMiwgY3VycmVudCB2ZXJzaW9uOiAnICsgbWF0Y2hbMV0pO1xuICAgICAgLy8gdHJ5IHtcbiAgICAgIC8vICAgYXdhaXQgcmVxdWlyZSgnb3BlbicpKCdodHRwczovL25vZGVqcy5vcmcvJyk7XG4gICAgICAvLyB9IGNhdGNoIChleCkge1xuICAgICAgLy8gICAvLyBJdCBpcyBPSyBmb3IgZXJyb3JzLCBwcm9iYWJseSBkZXBlbmRlbmN5ICdvcGVuJyBpcyBub3QgaW5zdGFsbGVkIHlldFxuICAgICAgLy8gfVxuICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgdXBncmFkZSBOb2RlLmpzIHZlcnNpb24gdG8gdjEyJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0NhbiBub3QgcmVjb2duaXplIFwibm9kZSAtdlwiIG91dHB1dDonLCBvdXRwdXQpO1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCByZWNvZ25pemUgXCJub2RlIC12XCIgb3V0cHV0OicgKyBvdXRwdXQpO1xuICB9XG59XG4iXX0=