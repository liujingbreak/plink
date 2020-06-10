import {Injectable, PLATFORM_ID, Inject} from '@angular/core';
import { EventReplayer } from 'preboot';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PrebootReplayService {
  constructor(private replayer: EventReplayer, @Inject(PLATFORM_ID) private platformId: any) {
  }

  manualReplay() {
    if (isPlatformBrowser(this.platformId)) {
      const serverRenderedStyles = document.querySelectorAll('style[ssr]');
      if (serverRenderedStyles.length > 0) {
        this.replayer.replayAll();
        serverRenderedStyles.forEach(el => {
          el.remove();
        });
      }
    }
  }
}
