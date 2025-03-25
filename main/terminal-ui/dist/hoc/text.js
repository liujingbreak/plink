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
exports.textFac = exports.tableFor = void 0;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const border_1 = require("../core/border");
const text_1 = require("../core/text");
exports.tableFor = ['setContent', 'setStyle'];
exports.textFac = border_1.borderFac.forExtend({
    name: 'complex-text',
    tableFor: exports.tableFor
}).defineReactor((init, initialText, opts) => {
    const oText = text_1.textWidgetFac.create(initialText, Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.text' : 'text', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.text));
    const service = init(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.text' : 'text.border', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.border), oText);
    const { s, ft } = service;
    const textEvents = new rx.Subject();
    s.prependInterceptor(a$ => {
        const ac = reactivizer_1.ActionDispenser.ofAction$(a$);
        return rx.merge(rx.merge(ac.at.setContent, ac.at.setStyle, ac.at.setForeground).pipe(rx.tap(oText.s.actionUpstream), rx.ignoreElements()), ac.ofOtherTypes(), textEvents // initial table values of MultiLineTextWidget
        );
    });
    ft.setBorder('none').dp();
    ft.setPadding(0, 0, 0, 0).dp();
    const textTableFields = [
        'setContent', 'setStyle', 'onDisplayLines'
    ];
    // copy initial table values from MultiLineTextWidget
    for (const textTableField of textTableFields) {
        const value = oText.table.actionSnapshot.get(textTableField);
        if (value == null)
            continue;
        const a = service.s.createAction(textTableField, value);
        textEvents.next(a);
    }
    service.r('port text events to output stream', rx.merge(oText.at.setStyle, oText.at.setContent).pipe(rx.tap(textEvents)));
});
//# sourceMappingURL=text.js.map