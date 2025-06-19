import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from '../../view/admin-dashboard/admin-dashboard.component';
import { UsersListComponent } from '../../view/admin-dashboard/users-list/users-list.component';
import { UsersCreateComponent } from '../../view/admin-dashboard/users-create/users-create.component';
import { UsersPermissionsComponent } from '../../view/admin-dashboard/users-permissions/users-permissions.component';
import { CentresListComponent } from '../../view/admin-dashboard/centres-list/centres-list.component';
import { CentresCreateComponent } from '../../view/admin-dashboard/centres-create/centres-create.component';
import { SettingsScheduleComponent } from '../../view/admin-dashboard/settings-schedule/settings-schedule.component';
import { SettingsServicesComponent } from '../../view/admin-dashboard/settings-services/settings-services.component';
import { SettingsVehiclesComponent } from '../../view/admin-dashboard/settings-vehicles/settings-vehicles.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent
  },
  {
    path: 'users-list',
    component: UsersListComponent
  },
   {
    path: 'users-create',
    component: UsersCreateComponent
  },
  {
    path: 'users-permissions',
    component: UsersPermissionsComponent
  },
  {
    path: 'centres-list',
    component: CentresListComponent
  },
  {
    path: 'centres-create',
    component: CentresCreateComponent
  },
  {
    path: 'settings-schedule',
    component: SettingsScheduleComponent
  },
  {
    path: 'settings-services',
    component: SettingsServicesComponent
  },
  {
    path: 'settings-vehicles',
    component: SettingsVehiclesComponent
  },


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
