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
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1REFBK0I7QUFDL0IsK0RBQXNDO0FBRXRDLG1CQUE4QixPQUF1Qzs7UUFDbkUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO0lBRXRCLENBQUM7Q0FBQTtBQUpELDRCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCdW1wT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiBCdW1wT3B0aW9ucyAmIHtkaXJzOiBzdHJpbmdbXX0pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbn1cbiJdfQ==