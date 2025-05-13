import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from '../../view/admin-dashboard/admin-dashboard.component';
import { UsersListComponent } from '../../view/admin-dashboard/users-list/users-list.component';
import { UsersCreateComponent } from '../../view/admin-dashboard/users-create/users-create.component';
import { UsersPermissionsComponent } from '../../view/admin-dashboard/users-permissions/users-permissions.component';

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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
