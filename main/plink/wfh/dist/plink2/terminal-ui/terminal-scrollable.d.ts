import { SimplexReactor } from '@wfh/reactivizer';
import { tableForBase, BaseWidgetActions } from './terminal-widget';
export declare function createScrollable<I extends BaseWidgetActions, LI extends typeof tableForBase>(component: SimplexReactor<I, LI>): SimplexReactor<BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"]>;
