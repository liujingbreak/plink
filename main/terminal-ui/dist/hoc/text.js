/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import { ActionDispenser } from '@wfh/reactivizer';
import { borderFac } from '../core/border.js';
import { textWidgetFac } from '../core/text.js';
export const tableFor = ['setContent', 'setStyle'];
export const textFac = borderFac.forExtend({
    name: 'complex-text',
    tableFor
}).defineReactor((init, initialText, opts) => {
    const oText = textWidgetFac.create(initialText, Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.text' : 'text', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.text));
    const service = init(Object.assign({ name: (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name + '.text' : 'text.border', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log }, opts === null || opts === void 0 ? void 0 : opts.border), oText);
    const { s, ft } = service;
    const textEvents = new rx.Subject();
    s.prependInterceptor(a$ => {
        const ac = ActionDispenser.ofAction$(a$);
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