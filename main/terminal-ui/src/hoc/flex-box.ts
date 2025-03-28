/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {CoreOptions, ActionDispenser, Action} from '@wfh/reactivizer';
import {borderFac, BorderContainerOpts} from '../core/border.js';
import {flexContainerFac as flexFac, FlexContainerInput, FlexContainerOpts as FlexOpts} from '../core/flex-container.js';

export interface FlexBoxOpts {
  name?: string;
  debug?: boolean;
  log?: CoreOptions['log'];
  border?: BorderContainerOpts;
  flexContainer?: FlexOpts;
}
const tableFor = [
  'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
  'setBorderSeparatorStyle', 'setBorderSpacing'
] as const;
export const flexBoxFac = borderFac.forExtend<FlexContainerInput, typeof tableFor>({
  name: 'complex-flex',
  tableFor
}).defineReactor((init, opts?: FlexBoxOpts) => {
  const flex = flexFac.create({
    name: opts?.name ? opts.name + '.flex' : 'flexBox',
    debug: opts?.debug,
    log: opts?.log,
    ...opts?.flexContainer
  });
  const flexEvents = new rx.Subject<Action>();
  const border = init({
    name: opts?.name ? opts.name + '.border' : 'flexBox.border',
    debug: opts?.debug,
    log: opts?.log,
    ...opts?.border
  }, flex);
  const {ft} = border;
  border.s.prependInterceptor(a$ => {
    const ac = ActionDispenser.ofAction$<typeof border>(a$);
    return rx.merge(
      rx.merge(
        ac.at.addChild,
        ac.at.insertChild,
        ac.at.removeChild,
        ac.at.setDirection,
        ac.at.alignItems,
        ac.at.justifyContent,
        ac.at.setBorderSeparatorStyle,
        ac.at.setBorderSeparator,
        ac.at.setBorderSpacing
      ).pipe(
        rx.tap(flex.s.actionUpstream),
        rx.ignoreElements()
      ),
      ac.ofOtherTypes(),
      flexEvents
    );
  });
  ft.setBorder('none').dp();
  ft.setPadding(0, 0, 0, 0).dp();
  // copy initial table values from MultiLineTextWidget
  for (const field of tableFor) {
    const value = flex.table.actionSnapshot.get(field);
    if (value == null)
      continue;
    const a = border.s.createAction(field as any, value);
    flexEvents.next(a);
  }
});
