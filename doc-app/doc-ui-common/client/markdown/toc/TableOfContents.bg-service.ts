// import * as rx from 'rxjs';
import {ReactorComposite} from '@wfh/reactivizer';

interface TocBgActions {
  subscribeTitleInters(ContainerDom: Record<string, [top: number, bottom: number]>): void;
  querySectionOfPoint(x: number, y: number): void;
}

export function createTocBackgroundService() {
  const tocBackgroundService = new ReactorComposite<TocBgActions>({name: 'toc-background-service'});
  return tocBackgroundService;
}

