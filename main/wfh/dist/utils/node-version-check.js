"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process_utils_1 = require("../process-utils");
async function ensureNodeVersion() {
    const output = await (0, process_utils_1.promisifySpawn)('node', '-v', { silent: true });
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
}
exports.default = ensureNodeVersion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS12ZXJzaW9uLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQXlEO0FBRTFDLEtBQUssVUFBVSxpQkFBaUI7SUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDhCQUFLLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDL0MsSUFBSSxLQUFLLEVBQUU7UUFDVCxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUM3QyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwREFBMEQsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRixRQUFRO1lBQ1Isa0RBQWtEO1lBQ2xELGlCQUFpQjtZQUNqQiw0RUFBNEU7WUFDNUUsSUFBSTtZQUNKLDREQUE0RDtTQUM3RDtLQUNGO1NBQU07UUFDTCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0tBQ2pFO0FBQ0gsQ0FBQztBQW5CRCxvQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3Byb21pc2lmeVNwYXduIGFzIHNwYXdufSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlTm9kZVZlcnNpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IG91dHB1dCA9IGF3YWl0IHNwYXduKCdub2RlJywgJy12Jywge3NpbGVudDogdHJ1ZX0pO1xuICBjb25zdCBtYXRjaCA9IC9edj8oW15dKykkLy5leGVjKG91dHB1dC50cmltKCkpO1xuICBpZiAobWF0Y2gpIHtcbiAgICBpZiAocGFyc2VJbnQobWF0Y2hbMV0uc3BsaXQoJy4nKVswXSwgMTApIDwgMTIpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUGxlYXNlIHVwZ3JhZGUgTm9kZS5qcyB2ZXJzaW9uIHRvIHYxMiwgY3VycmVudCB2ZXJzaW9uOiAnICsgbWF0Y2hbMV0pO1xuICAgICAgLy8gdHJ5IHtcbiAgICAgIC8vICAgYXdhaXQgcmVxdWlyZSgnb3BlbicpKCdodHRwczovL25vZGVqcy5vcmcvJyk7XG4gICAgICAvLyB9IGNhdGNoIChleCkge1xuICAgICAgLy8gICAvLyBJdCBpcyBPSyBmb3IgZXJyb3JzLCBwcm9iYWJseSBkZXBlbmRlbmN5ICdvcGVuJyBpcyBub3QgaW5zdGFsbGVkIHlldFxuICAgICAgLy8gfVxuICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgdXBncmFkZSBOb2RlLmpzIHZlcnNpb24gdG8gdjEyJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0NhbiBub3QgcmVjb2duaXplIFwibm9kZSAtdlwiIG91dHB1dDonLCBvdXRwdXQpO1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCByZWNvZ25pemUgXCJub2RlIC12XCIgb3V0cHV0OicgKyBvdXRwdXQpO1xuICB9XG59XG4iXX0=