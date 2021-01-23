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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const pm2_1 = __importDefault(require("pm2"));
const _ = __importStar(require("lodash"));
const util_1 = require("util");
const connect = util_1.promisify(pm2_1.default.connect.bind(pm2_1.default));
const list = util_1.promisify(pm2_1.default.list.bind(pm2_1.default));
const launchBus = util_1.promisify(pm2_1.default.launchBus.bind(pm2_1.default));
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log('start pm2-intercom');
        yield connect();
        const apps = yield list();
        // tslint:disable-next-line: no-console
        console.log(apps.map(pc => pc.name + ': ' + pc.pm_id));
        const bus = yield launchBus();
        const targets = new Map();
        bus.on('process:msg', (packet) => {
            // console.log(JSON.stringify(packet, null, '  '));
            const topic = _.get(packet, 'raw.topic');
            const name = _.get(packet, 'process.name');
            if (topic === 'log4js:master') {
                targets.set(name, packet.process.pm_id);
                // tslint:disable-next-line: no-console
                console.log('--- App master process start ---\n', targets);
            }
            if (topic !== 'log4js:message') {
                return;
            }
            const masterProcId = targets.get(name);
            if (masterProcId != null) {
                pm2_1.default.sendDataToProcessId(masterProcId, packet.raw, () => { });
            }
        });
    });
}
exports.start = start;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQXNCO0FBQ3RCLDBDQUE0QjtBQUM1QiwrQkFBdUM7QUFFdkMsTUFBTSxPQUFPLEdBQUcsZ0JBQUksQ0FBQyxhQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sSUFBSSxHQUFHLGdCQUFJLENBQUMsYUFBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBRyxDQUFDLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxnQkFBSSxDQUFDLGFBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQUcsQ0FBQyxDQUFDLENBQUM7QUFZaEQsU0FBc0IsS0FBSzs7UUFDekIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNsQyxNQUFNLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxHQUE2QixNQUFNLElBQUksRUFBRSxDQUFDO1FBQ3BELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLEdBQUcsR0FBRyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBRTlCLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsTUFBaUIsRUFBRSxFQUFFO1lBQzFDLG1EQUFtRDtZQUNuRCxNQUFNLEtBQUssR0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNqRCxNQUFNLElBQUksR0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNuRCxJQUFJLEtBQUssS0FBSyxlQUFlLEVBQUU7Z0JBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hDLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUM1RDtZQUNELElBQUksS0FBSyxLQUFLLGdCQUFnQixFQUFFO2dCQUM5QixPQUFPO2FBQ1I7WUFDRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLElBQUksWUFBWSxJQUFJLElBQUksRUFBRTtnQkFDeEIsYUFBRyxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzdEO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUE1QkQsc0JBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBtMiBmcm9tICdwbTInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtwcm9taXNpZnkgYXMgcGlmeX0gZnJvbSAndXRpbCc7XG5cbmNvbnN0IGNvbm5lY3QgPSBwaWZ5KHBtMi5jb25uZWN0LmJpbmQocG0yKSk7XG5jb25zdCBsaXN0ID0gcGlmeShwbTIubGlzdC5iaW5kKHBtMikpO1xuY29uc3QgbGF1bmNoQnVzID0gcGlmeShwbTIubGF1bmNoQnVzLmJpbmQocG0yKSk7XG5cbmludGVyZmFjZSBQbTJQb2NrZXQge1xuICByYXc6IHtcbiAgICB0b3BpYzogc3RyaW5nO1xuICB9O1xuICBwcm9jZXNzOiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHBtX2lkOiBudW1iZXI7XG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydCgpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdzdGFydCBwbTItaW50ZXJjb20nKTtcbiAgYXdhaXQgY29ubmVjdCgpO1xuICBjb25zdCBhcHBzOiBwbTIuUHJvY2Vzc0Rlc2NyaXB0aW9uW10gPSBhd2FpdCBsaXN0KCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhhcHBzLm1hcChwYyA9PiBwYy5uYW1lICsgJzogJyArIHBjLnBtX2lkKSk7XG4gIGNvbnN0IGJ1cyA9IGF3YWl0IGxhdW5jaEJ1cygpO1xuXG4gIGNvbnN0IHRhcmdldHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuXG4gIGJ1cy5vbigncHJvY2Vzczptc2cnLCAocGFja2V0OiBQbTJQb2NrZXQpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShwYWNrZXQsIG51bGwsICcgICcpKTtcbiAgICBjb25zdCB0b3BpYzogc3RyaW5nID0gXy5nZXQocGFja2V0LCAncmF3LnRvcGljJyk7XG4gICAgY29uc3QgbmFtZTogc3RyaW5nID0gXy5nZXQocGFja2V0LCAncHJvY2Vzcy5uYW1lJyk7XG4gICAgaWYgKHRvcGljID09PSAnbG9nNGpzOm1hc3RlcicpIHtcbiAgICAgIHRhcmdldHMuc2V0KG5hbWUsIHBhY2tldC5wcm9jZXNzLnBtX2lkKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJy0tLSBBcHAgbWFzdGVyIHByb2Nlc3Mgc3RhcnQgLS0tXFxuJywgdGFyZ2V0cyk7XG4gICAgfVxuICAgIGlmICh0b3BpYyAhPT0gJ2xvZzRqczptZXNzYWdlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBtYXN0ZXJQcm9jSWQgPSB0YXJnZXRzLmdldChuYW1lKTtcbiAgICBpZiAobWFzdGVyUHJvY0lkICE9IG51bGwpIHtcbiAgICAgIHBtMi5zZW5kRGF0YVRvUHJvY2Vzc0lkKG1hc3RlclByb2NJZCwgcGFja2V0LnJhdywgKCkgPT4ge30pO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=