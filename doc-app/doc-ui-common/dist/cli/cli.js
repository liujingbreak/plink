"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const cliExt = (program) => {
    program.command('color-info <color-string...>')
        .description('Show color information', { 'color-string': 'In form of CSS color string' })
        .action(function (colors) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const info of (yield Promise.resolve().then(() => __importStar(require('../color')))).colorInfo(colors)) {
                // eslint-disable-next-line no-console
                console.log(info);
            }
        });
    });
    program.command('color-contrast <color-string1> <color-string2>')
        .description('Show color contrast information', { 'color-string1': 'In form of CSS color string' })
        .action(function (...colors) {
        return __awaiter(this, void 0, void 0, function* () {
            (yield Promise.resolve().then(() => __importStar(require('../color')))).colorContrast(...colors);
        });
    });
    program.command('color-mix <color1> <color2> [weight-interval]')
        .description('compare 2 colors', {
        color1: 'In form of CSS color string',
        color2: 'In form of CSS color string',
        'weight-interval': 'weight of color to be mixed, should be number between 0 - 1'
    })
        .action((color1, color2, weightInterval) => __awaiter(void 0, void 0, void 0, function* () {
        if (weightInterval == null) {
            weightInterval = '0.1';
        }
        (yield Promise.resolve().then(() => __importStar(require('../color')))).mixColor(color1, color2, Number(weightInterval));
    }));
    // TODO: Add more sub command here
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUM7U0FDOUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLEVBQUMsY0FBYyxFQUFFLDZCQUE2QixFQUFDLENBQUM7U0FDdEYsTUFBTSxDQUFDLFVBQWUsTUFBZ0I7O1lBQ3JDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDL0Qsc0NBQXNDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25CO1FBQ0gsQ0FBQztLQUFBLENBQUMsQ0FBQztJQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0RBQWdELENBQUM7U0FDaEUsV0FBVyxDQUFDLGlDQUFpQyxFQUFFLEVBQUMsZUFBZSxFQUFFLDZCQUE2QixFQUFDLENBQUM7U0FDaEcsTUFBTSxDQUFDLFVBQWUsR0FBRyxNQUFnQjs7WUFDeEMsQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLE1BQTBCLENBQUMsQ0FBQztRQUMxRSxDQUFDO0tBQUEsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQztTQUMvRCxXQUFXLENBQUMsa0JBQWtCLEVBQUU7UUFDL0IsTUFBTSxFQUFFLDZCQUE2QjtRQUNyQyxNQUFNLEVBQUUsNkJBQTZCO1FBQ3JDLGlCQUFpQixFQUFFLDZEQUE2RDtLQUNqRixDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sTUFBYyxFQUFFLE1BQWMsRUFBRSxjQUF1QixFQUFFLEVBQUU7UUFDeEUsSUFBSSxjQUFjLElBQUksSUFBSSxFQUFFO1lBQzFCLGNBQWMsR0FBRyxLQUFLLENBQUM7U0FDeEI7UUFDRCxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILGtDQUFrQztBQUNwQyxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1pbmZvIDxjb2xvci1zdHJpbmcuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcnOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJ30pXG4gIC5hY3Rpb24oYXN5bmMgZnVuY3Rpb24oY29sb3JzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgaW5mbyBvZiAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckluZm8oY29sb3JzKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGluZm8pO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1jb250cmFzdCA8Y29sb3Itc3RyaW5nMT4gPGNvbG9yLXN0cmluZzI+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGNvbnRyYXN0IGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcxJzogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZyd9KVxuICAuYWN0aW9uKGFzeW5jIGZ1bmN0aW9uKC4uLmNvbG9yczogc3RyaW5nW10pIHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckNvbnRyYXN0KC4uLmNvbG9ycyBhcyBbc3RyaW5nLCBzdHJpbmddKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1taXggPGNvbG9yMT4gPGNvbG9yMj4gW3dlaWdodC1pbnRlcnZhbF0nKVxuICAuZGVzY3JpcHRpb24oJ2NvbXBhcmUgMiBjb2xvcnMnLCB7XG4gICAgY29sb3IxOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJyxcbiAgICBjb2xvcjI6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnLFxuICAgICd3ZWlnaHQtaW50ZXJ2YWwnOiAnd2VpZ2h0IG9mIGNvbG9yIHRvIGJlIG1peGVkLCBzaG91bGQgYmUgbnVtYmVyIGJldHdlZW4gMCAtIDEnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGNvbG9yMTogc3RyaW5nLCBjb2xvcjI6IHN0cmluZywgd2VpZ2h0SW50ZXJ2YWw/OiBzdHJpbmcpID0+IHtcbiAgICBpZiAod2VpZ2h0SW50ZXJ2YWwgPT0gbnVsbCkge1xuICAgICAgd2VpZ2h0SW50ZXJ2YWwgPSAnMC4xJztcbiAgICB9XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vY29sb3InKSkubWl4Q29sb3IoY29sb3IxLCBjb2xvcjIsIE51bWJlcih3ZWlnaHRJbnRlcnZhbCkpO1xuICB9KTtcblxuICAvLyBUT0RPOiBBZGQgbW9yZSBzdWIgY29tbWFuZCBoZXJlXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=