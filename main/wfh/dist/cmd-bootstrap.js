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
/* eslint-disable no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const startTime = new Date().getTime();
process.on('exit', () => {
    // eslint-disable-next-line no-console
    console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.send) {
            // current process is forked
            bootstrap_process_1.initAsChildProcess(true);
        }
        else {
            bootstrap_process_1.initProcess();
        }
        yield new Promise(resolve => process.nextTick(resolve));
        return require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLGlFQUEwRTtBQUcxRSxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRXZDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUN0QixzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsR0FBRzs7UUFDakIsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hCLDRCQUE0QjtZQUM1QixzQ0FBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMxQjthQUFNO1lBQ0wsK0JBQVcsRUFBRSxDQUFDO1NBQ2Y7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQVEsT0FBTyxDQUFDLFdBQVcsQ0FBaUIsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekUsQ0FBQztDQUFBLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAnLi9ub2RlLXBhdGgnO1xuLy8gaW1wb3J0IGNoZWNrTm9kZSBmcm9tICcuL3V0aWxzL25vZGUtdmVyc2lvbi1jaGVjayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCAqIGFzIF9jbGkgZnJvbSAnLi9jbWQvY2xpJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWV9IG1zYCkpO1xufSk7XG5cbihhc3luYyBmdW5jdGlvbiBydW4oKSB7XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gICAgaW5pdEFzQ2hpbGRQcm9jZXNzKHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcbiAgcmV0dXJuIChyZXF1aXJlKCcuL2NtZC9jbGknKSBhcyB0eXBlb2YgX2NsaSkuY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lKTtcbn0pKCkuY2F0Y2goZXJyID0+IHtcbiAgY29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=