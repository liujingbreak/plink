import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeveloperRoutingModule } from './developer-routing.module';
import { Dev404Component } from './dev404/dev404.component';

@NgModule({
	imports: [
		CommonModule,
		DeveloperRoutingModule
	],
	declarations: [Dev404Component]
})
export class DeveloperModule { }
