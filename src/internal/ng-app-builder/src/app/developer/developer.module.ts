import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Dev404Component } from './dev404/dev404.component';
import { httpInterceptorProviders } from './prerender-http-interceptor.service';
import { WelcomeComponent } from './welcome/welcome.component';


@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'ng-app-builder',
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
  ],
  declarations: [Dev404Component, WelcomeComponent],
  providers: [httpInterceptorProviders]
})
export class DeveloperModule {
}

