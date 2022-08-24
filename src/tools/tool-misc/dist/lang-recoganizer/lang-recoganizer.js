"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = exports.parse = exports.loop = exports.isNotLa = exports.choice = exports.scope = exports.cmp = exports.splitActionByType = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const lang_reactive_ops_1 = require("./lang-reactive-ops");
const childStepActions = {
    process(payload) { },
    sucess(result) { },
    failed(reason) { }
};
function createDispatcher(action$) {
    const dispatcher = {};
    for (const type of Object.keys(childStepActions)) {
        dispatcher[type] = (arg1) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            action$.next({ type: type, payload: arg1 });
        };
    }
    return dispatcher;
}
function splitActionByType(action$) {
    const source = action$.pipe(op.share());
    const actionByType = {};
    for (const type of Object.keys(childStepActions)) {
        Object.defineProperty(actionByType, type, {
            get() {
                return source.pipe(op.filter(action => action.type === type));
            }
        });
    }
    return actionByType;
}
exports.splitActionByType = splitActionByType;
function createStep(interceptor) {
    const source = new rx.Subject();
    const dispatcher = createDispatcher(source);
    const actions = interceptor ? source.pipe(op.observeOn(rx.queueScheduler), interceptor()) :
        source.pipe(op.observeOn(rx.queueScheduler));
    return { dispatcher, actions };
}
/**
 * simplest comparison step
 * @param expectStr
 * @returns
 */
function cmp(...expectStr) {
    return (mr) => {
        const { dispatcher, actions } = createStep();
        const actionByType = splitActionByType(actions);
        let index = 0;
        let startPosition = -1;
        if (expectStr.length === 1 && typeof expectStr[0] === 'string' && expectStr[0].length > 1) {
            // console.log('here');
            expectStr = expectStr[0].split('');
        }
        let last = expectStr.length - 1;
        actionByType.process.pipe(op.tap(({ payload: { d: input, i: offset } }) => {
            if (startPosition === -1)
                startPosition = offset;
            let expect = expectStr[index];
            // console.log('compare @' + offset, input, 'with', this.expect);
            if (input === expect) {
                if (index < last) {
                    index++;
                }
                else {
                    index = 0;
                    dispatcher.sucess({ start: startPosition, end: offset + 1 });
                }
            }
            else {
                dispatcher.failed([`at offset ${offset}, expect: ${expect + ''}, got: ${input + ''}`]);
            }
        })).subscribe();
        return { dispatcher, actions };
    };
}
exports.cmp = cmp;
/** scope step */
function scope(name, stepFactories, opts) {
    return (mr) => {
        let onSuccessResultTransformer;
        if (opts)
            onSuccessResultTransformer = opts.onSuccess;
        const { dispatcher, actions } = createStep();
        const actionByType = splitActionByType(actions);
        const steps = stepFactories.map((fac) => fac(mr));
        let currStepIdx = 0;
        const last = steps.length - 1;
        let startPosition = -1;
        let currPosition = -1;
        const stepResults = [];
        const subscribeStep = () => {
            const step = steps[currStepIdx];
            const childStepActions = splitActionByType(step.actions);
            rx.merge(rx.merge(childStepActions.sucess.pipe(op.map(({ payload }) => {
                stepResults.push(payload);
                if (currStepIdx < last) {
                    currStepIdx++;
                    subscribeStep();
                }
                else {
                    const result = {
                        name,
                        start: startPosition,
                        end: currPosition + 1,
                        children: stepResults
                    };
                    dispatcher.sucess(onSuccessResultTransformer ? onSuccessResultTransformer(result.children) : result);
                    return null;
                }
            })), childStepActions.failed.pipe(op.map(({ payload: reason }) => { dispatcher.failed([name, ...reason]); }))).pipe(op.take(1))).pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        };
        subscribeStep();
        actionByType.process.pipe(op.map(({ payload }) => {
            if (startPosition === -1)
                startPosition = payload.i;
            currPosition = payload.i;
            steps[currStepIdx].dispatcher.process(payload);
        })).pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        return { dispatcher, actions };
    };
}
exports.scope = scope;
/** Choice */
function choice(laNum = 2, ...choiceFactories) {
    return (mr) => {
        const { dispatcher, actions } = createStep();
        const failedChoiceResult = [];
        const choices = choiceFactories.map((fac, idx) => fac(mr));
        const actionByType = splitActionByType(actions);
        let currChoiceIdx = 0;
        let replayPos;
        actionByType.process.pipe(op.map(({ payload }) => {
            if (replayPos == null) {
                replayPos = payload.i;
                mr.mark(laNum);
            }
            choices[currChoiceIdx].dispatcher.process(payload);
        })).pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        const subscribeCurrentChoice = () => {
            const choiceActions = splitActionByType(choices[currChoiceIdx].actions);
            rx.merge().pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
            choiceActions.sucess.pipe(op.tap(({ payload }) => {
                dispatcher.sucess(payload);
            }), op.take(1), op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
            const last = choices.length - 1;
            choiceActions.failed.pipe(op.tap(({ payload }) => {
                failedChoiceResult.push(payload);
                if (currChoiceIdx < last) {
                    currChoiceIdx++;
                    subscribeCurrentChoice();
                    mr.replay(replayPos);
                }
                else {
                    dispatcher.failed(['None is matched: ' + failedChoiceResult.map(str => str.join(' - ')).join('; ')]);
                }
            }), op.take(1), op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        };
        subscribeCurrentChoice();
        return { dispatcher, actions };
    };
}
exports.choice = choice;
function isNotLa(step) {
    return (mr) => {
        const { dispatcher, actions } = createStep();
        const actionByType = splitActionByType(actions);
        const predicateStep = step(mr);
        const predActions = splitActionByType(predicateStep.actions);
        let startPos;
        let currPos;
        rx.merge(actionByType.process.pipe(op.take(1), op.map(({ payload: { d, i } }) => {
            startPos = i;
            mr.mark(Number.MAX_VALUE);
        })), actionByType.process.pipe(op.tap(({ payload }) => {
            currPos = payload.i;
            predicateStep.dispatcher.process(payload);
        })), predActions.failed.pipe(op.tap(() => {
            dispatcher.sucess({ start: startPos, end: currPos });
            mr.replay(startPos);
        }))).subscribe();
        return { dispatcher, actions };
    };
}
exports.isNotLa = isNotLa;
const defaultLoopOptions = { greedy: true, laNum: 2, minTimes: 0, maxTimes: Number.MAX_VALUE };
/** Loop */
function loop(factory, opts) {
    return (mr) => {
        const { dispatcher, actions } = createStep();
        let options;
        if (opts == null) {
            options = defaultLoopOptions;
        }
        else {
            options = Object.assign(Object.assign({}, defaultLoopOptions), opts);
        }
        const actionByType = splitActionByType(actions);
        let loopCount = 0;
        let currentLoopable;
        let markedPos;
        let startPosition = -1;
        let currPostion = -1;
        let loopResults = [];
        const markAtLoopableBegin = () => {
            actionByType.process.pipe(op.take(1), op.map(({ payload }) => {
                markedPos = payload.i;
                mr.mark(options.laNum);
            })).subscribe();
        };
        markAtLoopableBegin();
        const createNewLoopable = () => {
            currentLoopable = factory(mr);
            const childStepActions = splitActionByType(currentLoopable.actions);
            rx.merge(rx.merge(childStepActions.sucess.pipe(op.map(loopResult => {
                loopResults.push(loopResult.payload);
                loopCount++;
                if (loopCount < options.maxTimes) {
                    markAtLoopableBegin();
                    createNewLoopable();
                }
                else {
                    const result = {
                        start: startPosition,
                        end: currPostion + 1,
                        children: loopResults
                    };
                    dispatcher.sucess(result);
                }
            })), childStepActions.failed.pipe(op.map(({ payload: reason }) => {
                if (loopCount > options.minTimes) {
                    const result = {
                        start: startPosition,
                        end: markedPos,
                        children: loopResults
                    };
                    dispatcher.sucess(result);
                    mr.replay(markedPos);
                }
                else {
                    dispatcher.failed(reason);
                }
            }))).pipe(op.take(1))).pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        };
        createNewLoopable();
        actionByType.process.pipe(op.map(({ payload }) => {
            if (startPosition === -1) {
                startPosition = payload.i;
            }
            currPostion = payload.i;
            currentLoopable.dispatcher.process(payload);
        })).pipe(op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed))).subscribe();
        return { dispatcher, actions };
    };
}
exports.loop = loop;
function parse(stateMachine, debug = false) {
    return (input$) => {
        return rx.defer(() => {
            const mark$ = new rx.Subject();
            const replay$ = new rx.Subject();
            const mr = {
                mark(laNum) {
                    mark$.next(laNum);
                },
                replay(pos) {
                    replay$.next(pos);
                }
            };
            const rootStep = stateMachine(mr);
            const actionByType = splitActionByType(rootStep.actions);
            return rx.merge(rx.merge(actionByType.sucess, actionByType.failed)
                .pipe(op.take(1)), debug ? rootStep.actions.pipe(
            // eslint-disable-next-line no-console
            op.tap(action => console.log('::', action)), op.ignoreElements()) : rx.EMPTY, 
            // input$ must be the last one being subscribed in merge list, otherwise other subscription night don't have change to 
            // observe emitted result after input$.pipe() has completed
            input$.pipe((0, lang_reactive_ops_1.cacheAndReplay)(mark$, replay$), op.map(({ value, idx }, totalIndex) => {
                if (debug) {
                    // eslint-disable-next-line no-console
                    console.log(`[${totalIndex}] offset:${idx}, value: ${'' + value}`);
                }
                rootStep.dispatcher.process({ d: value, i: idx });
            }), op.takeUntil(rx.merge(actionByType.sucess, actionByType.failed)), op.ignoreElements()));
        });
    };
}
exports.parse = parse;
function test() {
    rx.from('abcxdefdef1'.split('')).pipe(parse(scope('hellow', [
        cmp('ab'),
        choice(2, cmp('1x'), cmp('cx')),
        loop(scope('loop de', [cmp('def')])),
        cmp('1')
    ]), true), 
    // eslint-disable-next-line no-console
    op.tap(r => console.log('---> ', JSON.stringify(r, null, '  ')))).subscribe();
}
exports.test = test;
//# sourceMappingURL=lang-recoganizer.js.map