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
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = exports.queueUp = void 0;
function queueUp(parallel, actions) {
    return __awaiter(this, void 0, void 0, function* () {
        let actionIdx = 0;
        const results = [];
        const done = new Array(parallel);
        for (let i = 0; i < parallel; i++) {
            done[i] = performAction();
        }
        function performAction() {
            return __awaiter(this, void 0, void 0, function* () {
                while (actionIdx < actions.length) {
                    try {
                        results.push(yield actions[actionIdx++]());
                    }
                    catch (err) {
                        results.push(err);
                    }
                }
            });
        }
        yield Promise.all(done);
        return results;
    });
}
exports.queueUp = queueUp;
function queue(maxParallel) {
    const actions = [];
    // let actionIdx = 0;
    let parallel = 0;
    function performAction() {
        return __awaiter(this, void 0, void 0, function* () {
            parallel++;
            while (actions.length > 0) {
                yield actions.shift();
            }
            parallel--;
        });
    }
    return {
        add(action) {
            return new Promise((resolve, rej) => {
                actions.push(() => action().then(resolve).catch(rej));
                if (parallel < maxParallel) {
                    performAction();
                }
            });
        }
    };
}
exports.queue = queue;

//# sourceMappingURL=promise-queque.js.map
