/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import { ActionDispenser } from '@wfh/reactivizer';
import { borderFac } from '../core/border.js';
import { flexContainerFac as flexFac } from '../core/flex-container.js';
const tableFor = [
    'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
    'setBorderSeparatorStyle', 'setBorderSpacing'
];
export const flexBoxFac = borderFac.forExtend({
    name: 'complex-flex',
    tableFor
}).defineReactor(({ init, setting: opts }) => {
    const flex = flexFac.setting(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.flex' : 'flexBox', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.flexContainer)).create();
    const flexEvents = new rx.Subject();
    const border = init(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.border' : 'flexBox.border', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.border), flex);
    const { ft } = border;
    border.s.prependInterceptor(a$ => {
        const ac = ActionDispenser.ofAction$(a$);
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