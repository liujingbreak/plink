/// <reference path="../react-app-env.d.ts" />
/// <reference path="../types.d.ts" />
import '../index.scss';
import type {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import reportWebVitals from '../reportWebVitals';
import {renderDom} from './MainComponent';

export function bootstrap(providers: {routes: AnimatableRoutesProps['routes']} & Record<string, any>) {
  const container = document.getElementById('root')!;
  renderDom(container, providers);
  reportWebVitals();
}
