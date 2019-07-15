import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeveloperRoutingModule } from './developer-routing.module';
import { Dev404Component } from './dev404/dev404.component';
import {httpInterceptorProviders} from './prerender-http-interceptor.service';

@NgModule({
  imports: [
    CommonModule,
    DeveloperRoutingModule
  ],
  declarations: [Dev404Component],
  providers: [httpInterceptorProviders]
})
export class DeveloperModule { }
