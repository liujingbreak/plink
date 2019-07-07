import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Type } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Dev404Component } from './dev404/dev404.component';
import { httpInterceptorProviders } from './prerender-http-interceptor.service';
import { WelcomeComponent } from './welcome/welcome.component';


@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [Dev404Component, WelcomeComponent],
  providers: [httpInterceptorProviders]
})
export class DeveloperModule { }

export function getModules(baseRoute: string): Array<Type<any> | ModuleWithProviders<RouterModule>> {
  return [
    DeveloperModule,
    RouterModule.forChild([
      {
        path: baseRoute + 'ng-app-builder',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: WelcomeComponent
          },
          {
            path: '**',
            component: Dev404Component
          }
        ]
      }
    ])
  ];
}
