import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Dev404Component } from './dev404/dev404.component';
const routes: Routes = [{
  path: __api.ngRouterPath(''),
  component: Dev404Component
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeveloperRoutingModule { }
