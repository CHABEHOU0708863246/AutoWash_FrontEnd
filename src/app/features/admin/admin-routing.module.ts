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
import { WashNowComponent } from '../../view/admin-dashboard/wash-now/wash-now.component';
import { WashSessionsComponent } from '../../view/admin-dashboard/wash-sessions/wash-sessions.component';
import { ExpensesUtilitiesComponent } from '../../view/admin-dashboard/expenses-utilities/expenses-utilities.component';
import { ExpensesRentComponent } from '../../view/admin-dashboard/expenses-rent/expenses-rent.component';
import { ExpensesProfitabilityComponent } from '../../view/admin-dashboard/expenses-profitability/expenses-profitability.component';
import { Payment } from '../../core/models/Payments/Payment';
import { PaymentsWashersComponent } from '../../view/admin-dashboard/payments-washers/payments-washers.component';
import { PaymentsReportsComponent } from '../../view/admin-dashboard/payments-reports/payments-reports.component';
import { UsersProfilComponent } from '../../view/admin-dashboard/users-profil/users-profil.component';
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
    path: 'users-profil',
    component: UsersProfilComponent
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
  {
    path: 'wash-sessions',
    component: WashSessionsComponent
  },
  {
    path: 'wash-now',
    component: WashNowComponent
  },
  {
    path: 'expenses-utilities',
    component: ExpensesUtilitiesComponent
  },
  {
    path: 'expenses-profitability',
    component: ExpensesProfitabilityComponent
  },
  {
    path: 'payments-washers',
    component: PaymentsWashersComponent
  },
  {
    path: 'payments-reports',
    component: PaymentsReportsComponent
  },


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
