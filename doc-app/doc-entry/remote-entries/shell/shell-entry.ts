import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {dispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {bootstrapRoutes} from '../../main/clientApp';
export * from '@wfh/doc-ui-common/client/components/appLayout.state';

export function bootstrapRoutesWith(fn: (ShowTopLoadingComp: typeof ShowTopLoading, mdDispatcher: typeof dispatcher) => AnimatableRoutesProps['routes']) {
  bootstrapRoutes({routes: fn(ShowTopLoading, dispatcher)});
}

