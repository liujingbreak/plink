#!/usr/bin/env node
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
/* tslint:disable:no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
// debugger;
const startTime = new Date().getTime();
process.on('exit', () => {
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        bootstrap_process_1.initProcess();
        (yield Promise.resolve().then(() => __importStar(require('./cmd/cli')))).drcpCommand(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQix1QkFBcUI7QUFDckIsc0RBQXNEO0FBQ3RELGtEQUEwQjtBQUMxQixpRUFBc0Q7QUFDdEQsWUFBWTtBQUVaLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFFdkMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM3RSxDQUFDLENBQUMsQ0FBQztBQUVILENBQUMsU0FBZSxHQUFHOztRQUNqQiwrQkFBVyxFQUFFLENBQUM7UUFDZCxDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FBQSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5pbXBvcnQgJy4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBjaGVja05vZGUgZnJvbSAnLi91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7aW5pdFByb2Nlc3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuLy8gZGVidWdnZXI7XG5cbmNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5wcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JlZW4oYERvbmUgaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG59KTtcblxuKGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgaW5pdFByb2Nlc3MoKTtcbiAgKGF3YWl0IGltcG9ydCgnLi9jbWQvY2xpJykpLmRyY3BDb21tYW5kKHN0YXJ0VGltZSk7XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19