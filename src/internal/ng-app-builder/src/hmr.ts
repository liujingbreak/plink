import { NgModuleRef, ApplicationRef } from '@angular/core';
import { createNewHosts } from '@angularclass/hmr';

export default function(module: any, bootstrap: () => Promise<NgModuleRef<any>>):
  Promise<NgModuleRef<any>> | undefined {
  if (module.hot == null)
    return bootstrap();
  let ngModule: NgModuleRef<any>;
  module.hot.accept();
  bootstrap().then(mod => {
    ngModule = mod;
  });
  module.hot.dispose(() => {
    const appRef: ApplicationRef = ngModule.injector.get(ApplicationRef);
    const elements = appRef.components.map(c => c.location.nativeElement);
    const makeVisible = createNewHosts(elements);
    ngModule.destroy();
    makeVisible();
  });
}
