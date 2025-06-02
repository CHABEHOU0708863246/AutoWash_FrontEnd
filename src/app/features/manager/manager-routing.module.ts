import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerDashboardComponent } from '../../view/manager-dashboard/manager-dashboard.component';
import { WashersListComponent } from '../../view/manager-dashboard/washers-list/washers-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: ManagerDashboardComponent
  },
  {
      path: 'washers-list',
      component: WashersListComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }
