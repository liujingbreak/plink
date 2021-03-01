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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const __plink_1 = __importDefault(require("__plink"));
const artifacts_1 = require("./artifacts");
function activate() {
    __plink_1.default.router().get('/_githash', (req, res) => __awaiter(this, void 0, void 0, function* () {
        res.setHeader('content-type', 'text/plain');
        res.send(yield artifacts_1.stringifyListAllVersions());
    }));
}
exports.activate = activate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUE0QjtBQUU1QiwyQ0FBcUQ7QUFFckQsU0FBZ0IsUUFBUTtJQUN0QixpQkFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLG9DQUF3QixFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUxELDRCQUtDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5pbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnLi9hcnRpZmFjdHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIHBsaW5rLnJvdXRlcigpLmdldCgnL19naXRoYXNoJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ3RleHQvcGxhaW4nKTtcbiAgICByZXMuc2VuZChhd2FpdCBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIH0pO1xufVxuIl19