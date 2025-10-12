import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerDashboardComponent } from '../../view/manager-dashboard/manager-dashboard.component';
import { WashersListComponent } from '../../view/manager-dashboard/washers-list/washers-list.component';
import { UsersAttendanceComponent } from '../../view/admin-dashboard/users-attendance/users-attendance.component';
import { WashersAttendanceComponent } from '../../view/manager-dashboard/washers-attendance/washers-attendance.component';

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
  {
      path: 'washers-attendance',
      component: WashersAttendanceComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }
