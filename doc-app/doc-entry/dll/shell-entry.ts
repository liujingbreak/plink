import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {bootstrapRoutes} from '../main/clientApp';
export * from '@wfh/doc-ui-common/client/components/appLayout.state';
export {default as react} from 'react';

export function bootstrapRoutesWith(fn: (ShowTopLoadingComp: typeof ShowTopLoading) => AnimatableRoutesProps['routes']) {
  bootstrapRoutes({routes: fn(ShowTopLoading)});
}

