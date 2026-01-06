import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WasherDashboardComponent } from '../../view/washer-dashboard/washer-dashboard.component';
import { WashTodayComponent } from '../../view/washer-dashboard/wash-today/wash-today.component';
import { PaymentsHistoryComponent } from '../../view/washer-dashboard/payments-history/payments-history.component';
import { AttendanceTodayComponent } from '../../view/washer-dashboard/attendance-today/attendance-today.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: WasherDashboardComponent
  },
  {
    path: 'wash-today',
    component: WashTodayComponent
  },
  {
    path: 'payments-history',
    component: PaymentsHistoryComponent
  },
  {
    path: 'attendance-today',
    component: AttendanceTodayComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WasherRoutingModule { }
