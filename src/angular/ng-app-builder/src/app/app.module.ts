import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import {RouterModule, Routes} from '@angular/router';
import { environment } from '../../environments/environment';
// import api from '__api';

const appRoutes: Routes = [
	{path: 'ng-app-builder/drcp-admin', loadChildren: './drcp-admin/drcp-admin.module#DrcpAdminModule'},
	{path: '**', redirectTo: '/ng-app-builder/drcp-admin'}
];
@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		RouterModule,
		RouterModule.forRoot(appRoutes, {enableTracing: !environment.production})
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }

// console.log(api.config());
