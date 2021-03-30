#!/usr/bin/env node
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
/* tslint:disable:no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const startTime = new Date().getTime();
process.on('exit', () => {
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        bootstrap_process_1.initProcess();
        yield new Promise(resolve => process.nextTick(resolve));
        require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLGlFQUFzRDtBQUd0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRXZDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUN0Qix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsR0FBRzs7UUFDakIsK0JBQVcsRUFBRSxDQUFDO1FBQ2QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsV0FBVyxDQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRSxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG4vLyBpbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2luaXRQcm9jZXNzfSBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCAqIGFzIF9jbGkgZnJvbSAnLi9jbWQvY2xpJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjaGFsay5ncmVlbihgRG9uZSBpbiAke25ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lfSBtc2ApKTtcbn0pO1xuXG4oYXN5bmMgZnVuY3Rpb24gcnVuKCkge1xuICBpbml0UHJvY2VzcygpO1xuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHByb2Nlc3MubmV4dFRpY2socmVzb2x2ZSkpO1xuICAocmVxdWlyZSgnLi9jbWQvY2xpJykgYXMgdHlwZW9mIF9jbGkpLmNyZWF0ZUNvbW1hbmRzKHN0YXJ0VGltZSk7XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19