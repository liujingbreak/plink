"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_util_1 = require("@wfh/webpack-common/dist/webpack-util");
const path_1 = __importDefault(require("path"));
const handler = {
    changeCraPaths(craPaths) {
    },
    webpack(cfg, env, cmdOpt) {
        var _a;
        if ((_a = cfg.module) === null || _a === void 0 ? void 0 : _a.rules) {
            webpack_util_1.findLoader(cfg.module.rules, (loader, ruleSet, idx, useItems) => {
                if (/node_modules[/\\]sass-loader[/\\]/.test(loader)) {
                    useItems.push(path_1.default.resolve(__dirname, 'sass-theme-loader.js'));
                    return true;
                }
                return false;
            });
        }
    }
};
exports.default = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHdFQUFpRTtBQUNqRSxnREFBd0I7QUFFeEIsTUFBTSxPQUFPLEdBQXdCO0lBQ25DLGNBQWMsQ0FBQyxRQUF5QjtJQUN4QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTTs7UUFDdEIsVUFBSSxHQUFHLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEVBQUU7WUFDckIseUJBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUM5RCxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRixDQUFDO0FBR0Ysa0JBQWUsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZWFjdFNjcmlwdHNIYW5kbGVyLCBDcmFTY3JpcHRzUGF0aHN9IGZyb20gJ0B3ZmgvY3JhLXNjcmlwdHMvZGlzdC90eXBlcyc7XG5pbXBvcnQge2ZpbmRMb2FkZXJ9IGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC93ZWJwYWNrLXV0aWwnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGhhbmRsZXI6IFJlYWN0U2NyaXB0c0hhbmRsZXIgPSB7XG4gIGNoYW5nZUNyYVBhdGhzKGNyYVBhdGhzOiBDcmFTY3JpcHRzUGF0aHMpIHtcbiAgfSxcbiAgd2VicGFjayhjZmcsIGVudiwgY21kT3B0KSB7XG4gICAgaWYgKGNmZy5tb2R1bGU/LnJ1bGVzKSB7XG4gICAgICBmaW5kTG9hZGVyKGNmZy5tb2R1bGUucnVsZXMsIChsb2FkZXIsIHJ1bGVTZXQsIGlkeCwgdXNlSXRlbXMpID0+IHtcbiAgICAgICAgaWYgKC9ub2RlX21vZHVsZXNbL1xcXFxdc2Fzcy1sb2FkZXJbL1xcXFxdLy50ZXN0KGxvYWRlcikpIHtcbiAgICAgICAgICB1c2VJdGVtcy5wdXNoKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzYXNzLXRoZW1lLWxvYWRlci5qcycpKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiJdfQ==