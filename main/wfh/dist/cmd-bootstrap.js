#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fork_for_preserve_symlink_1 = tslib_1.__importDefault(require("./fork-for-preserve-symlink"));
(0, fork_for_preserve_symlink_1.default)('@wfh/plink/wfh/dist/_cmd-bootstrap', {
    stateExitAction: 'save',
    handleShutdownMsg: false
});
//# sourceMappingURL=cmd-bootstrap.js.map