#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fork_for_preserve_symlink_1 = __importDefault(require("./fork-for-preserve-symlink"));
void (0, fork_for_preserve_symlink_1.default)('@wfh/plink/wfh/dist/_cmd-bootstrap', {
    stateExitAction: 'save',
    handleShutdownMsg: false
});
//# sourceMappingURL=cmd-bootstrap.js.map