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
        const output = yield (0, process_utils_1.promisifySpawn)('node', '-v', { silent: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS12ZXJzaW9uLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXlEO0FBRXpELFNBQThCLGlCQUFpQjs7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDhCQUFLLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDN0Msc0NBQXNDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBEQUEwRCxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRixRQUFRO2dCQUNSLGtEQUFrRDtnQkFDbEQsaUJBQWlCO2dCQUNqQiw0RUFBNEU7Z0JBQzVFLElBQUk7Z0JBQ0osNERBQTREO2FBQzdEO1NBQ0Y7YUFBTTtZQUNMLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLEdBQUcsTUFBTSxDQUFDLENBQUM7U0FDakU7SUFDSCxDQUFDO0NBQUE7QUFuQkQsb0NBbUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwcm9taXNpZnlTcGF3biBhcyBzcGF3bn0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZU5vZGVWZXJzaW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBvdXRwdXQgPSBhd2FpdCBzcGF3bignbm9kZScsICctdicsIHtzaWxlbnQ6IHRydWV9KTtcbiAgY29uc3QgbWF0Y2ggPSAvXnY/KFteXSspJC8uZXhlYyhvdXRwdXQudHJpbSgpKTtcbiAgaWYgKG1hdGNoKSB7XG4gICAgaWYgKHBhcnNlSW50KG1hdGNoWzFdLnNwbGl0KCcuJylbMF0sIDEwKSA8IDEyKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1BsZWFzZSB1cGdyYWRlIE5vZGUuanMgdmVyc2lvbiB0byB2MTIsIGN1cnJlbnQgdmVyc2lvbjogJyArIG1hdGNoWzFdKTtcbiAgICAgIC8vIHRyeSB7XG4gICAgICAvLyAgIGF3YWl0IHJlcXVpcmUoJ29wZW4nKSgnaHR0cHM6Ly9ub2RlanMub3JnLycpO1xuICAgICAgLy8gfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vICAgLy8gSXQgaXMgT0sgZm9yIGVycm9ycywgcHJvYmFibHkgZGVwZW5kZW5jeSAnb3BlbicgaXMgbm90IGluc3RhbGxlZCB5ZXRcbiAgICAgIC8vIH1cbiAgICAgIC8vIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHVwZ3JhZGUgTm9kZS5qcyB2ZXJzaW9uIHRvIHYxMicpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdDYW4gbm90IHJlY29nbml6ZSBcIm5vZGUgLXZcIiBvdXRwdXQ6Jywgb3V0cHV0KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgcmVjb2duaXplIFwibm9kZSAtdlwiIG91dHB1dDonICsgb3V0cHV0KTtcbiAgfVxufVxuIl19