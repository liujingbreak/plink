"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.flexBoxFac = void 0;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const border_1 = require("../border");
const flex_container_1 = require("../flex-container");
const tableFor = [
    'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
    'setBorderSeparatorStyle', 'setBorderSpacing'
];
exports.flexBoxFac = border_1.borderFac.forExtend({
    name: 'complex-flex',
    tableFor
}).defineReactor((init, opts) => {
    const flex = flex_container_1.flexContainerFac.create(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.flex' : 'HOC.flex', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.flexContainer));
    const flexEvents = new rx.Subject();
    const border = init(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.flex' : 'HOC.flex', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.border), flex);
    const { ft } = border;
    border.s.prependInterceptor(a$ => {
        const ac = reactivizer_1.ActionDispenser.ofAction$(a$);
        return rx.merge(rx.merge(ac.at.addChild, ac.at.insertChild, ac.at.removeChild, ac.at.setDirection, ac.at.alignItems, ac.at.justifyContent, ac.at.setBorderSeparatorStyle, ac.at.setBorderSeparator, ac.at.setBorderSpacing).pipe(rx.tap(flex.s.actionUpstream), rx.ignoreElements()), ac.ofOtherTypes(), flexEvents);
    });
    ft.setBorder('none').dp();
    ft.setPadding(0, 0, 0, 0).dp();
    // copy initial table values from MultiLineTextWidget
    for (const field of tableFor) {
        const value = flex.table.actionSnapshot.get(field);
        if (value == null)
            continue;
        const a = border.s.createAction(field, value);
        flexEvents.next(a);
    }
});
//# sourceMappingURL=flex-box.js.map