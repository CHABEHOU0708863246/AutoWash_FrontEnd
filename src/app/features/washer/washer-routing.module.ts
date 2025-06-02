import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WasherDashboardComponent } from '../../view/washer-dashboard/washer-dashboard.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: WasherDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WasherRoutingModule { }
