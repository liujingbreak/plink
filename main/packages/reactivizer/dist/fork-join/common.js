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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fork = void 0;
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
function fork(comp, actionName, params, returnedActionName, relatedToAction) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    if (relatedToAction)
        forkedAction.r = relatedToAction.i;
    const forkDone = rx.firstValueFrom((returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe((0, control_1.actionRelatedToAction)(forkedAction), rx.map(a => a.p)));
    if (relatedToAction)
        comp.o.dpf.fork(relatedToAction, forkedAction);
    else
        comp.o.dp.fork(forkedAction);
    return forkDone;
}
exports.fork = fork;
//# sourceMappingURL=common.js.map