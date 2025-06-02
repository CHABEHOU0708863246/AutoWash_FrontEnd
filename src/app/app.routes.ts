import { Routes } from '@angular/router';
import { NotFoundComponent } from './core/components/not-found/not-found.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule),
    canActivate: [authGuard],
    data: {
      requiredRoles: ['admin'],
    },
  },
  {
    path: 'manager',
    loadChildren: () => import('./features/manager/manager.module').then((m) => m.ManagerModule),
    canActivate: [authGuard],
    data: {
      requiredRoles: ['manager'],
    },
  },
  {
    path: 'washer',
    loadChildren: () => import('./features/washer/washer.module').then((m) => m.WasherModule),
    canActivate: [authGuard],
    data: {
      requiredRoles: ['washer'],
    },
  },
  { path: '**', component: NotFoundComponent },
];
