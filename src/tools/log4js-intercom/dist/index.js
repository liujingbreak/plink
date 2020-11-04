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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const pm2_1 = __importDefault(require("@growth/pm2"));
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

//# sourceMappingURL=index.js.map
