/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {CoreOptions, ActionDispenser, Action} from '@wfh/reactivizer';
import {borderFac, BorderContainerOpts} from '../border';
import {MultiLineTextInput, textWidgetFac, MultiLineTextWidgetOpts} from '../text';

export interface TextOptions {
  name?: string;
  debug?: boolean;
  log?: CoreOptions['log'];
  border?: BorderContainerOpts;
  text?: MultiLineTextWidgetOpts;
}

export interface TextInput {
  setContent: MultiLineTextInput['setContent'];
  setStyle: MultiLineTextInput['setStyle'];
}
export const tableFor = ['setContent', 'setStyle'] as const;
export const textFac = borderFac.forExtend<TextInput, typeof tableFor>({
  name: 'complex-text',
  tableFor
}).defineReactor((init, initialText: string, opts?: TextOptions) => {
  const oText = textWidgetFac.create(initialText, {
    name: opts?.name ? opts.name + '.text' : 'text',
    debug: opts?.debug,
    log: opts?.log,
    ...opts?.text
  });
  const service = init(
    {
      name: opts?.name ? opts.name + '.text' : 'text.border',
      debug: opts?.debug,
      log: opts?.log,
      ...opts?.border
    },
    oText
  );
  const {s, ft} = service;
  const textEvents = new rx.Subject<Action>();
  s.prependInterceptor(a$ => {
    const ac = ActionDispenser.ofAction$<typeof service>(a$);
    return rx.merge(
      rx.merge(
        ac.at.setContent,
        ac.at.setStyle
      ).pipe(
        rx.tap(oText.s.actionUpstream),
        rx.ignoreElements()
      ),
      ac.ofOtherTypes(),
      textEvents // initial table values of MultiLineTextWidget
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
    const a = service.s.createAction(textTableField as any, value);
    textEvents.next(a);
  }
  service.r('port text events to output stream',
    rx.merge(
      oText.at.setStyle,
      oText.at.setContent
    ).pipe(
      rx.tap(textEvents)
    )
  );
});

