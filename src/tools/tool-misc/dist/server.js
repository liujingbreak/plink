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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const plink_1 = require("@wfh/plink");
const app_server_1 = require("@wfh/plink/wfh/dist/app-server");
const op = __importStar(require("rxjs/operators"));
const log = (0, plink_1.log4File)(__filename);
function activate(api) {
    const router = api.router();
    log.info('Plink command server is up and running');
    router.post('/plink-cli/:cmdName', (req, res) => {
        log.info('Recieve command', req.params.cmdName);
    });
    router.post('/plink-cli-stoi', (req, res) => {
        app_server_1.exit$.pipe(op.filter(action => action === 'done'), op.tap(() => {
            process.exit(0);
        })).subscribe();
        app_server_1.exit$.next('start');
    });
}
exports.activate = activate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBc0Q7QUFDdEQsK0RBQXFEO0FBQ3JELG1EQUFxQztBQUVyQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsU0FBZ0IsUUFBUSxDQUFDLEdBQXFCO0lBQzVDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7SUFFbkQsTUFBTSxDQUFDLElBQUksQ0FBb0IscUJBQXFCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakUsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUMxQyxrQkFBSyxDQUFDLElBQUksQ0FDUixFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxFQUN0QyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGtCQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWxCRCw0QkFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0V4dGVuc2lvbkNvbnRleHQsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7ZXhpdCR9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXBwLXNlcnZlcic7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHJvdXRlciA9IGFwaS5yb3V0ZXIoKTtcbiAgbG9nLmluZm8oJ1BsaW5rIGNvbW1hbmQgc2VydmVyIGlzIHVwIGFuZCBydW5uaW5nJyk7XG5cbiAgcm91dGVyLnBvc3Q8e2NtZE5hbWU6IHN0cmluZ30+KCcvcGxpbmstY2xpLzpjbWROYW1lJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgbG9nLmluZm8oJ1JlY2lldmUgY29tbWFuZCcsIHJlcS5wYXJhbXMuY21kTmFtZSk7XG4gIH0pO1xuXG4gIHJvdXRlci5wb3N0KCcvcGxpbmstY2xpLXN0b2knLCAocmVxLCByZXMpID0+IHtcbiAgICBleGl0JC5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24gPT09ICdkb25lJyksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICBleGl0JC5uZXh0KCdzdGFydCcpO1xuICB9KTtcbn1cbiJdfQ==