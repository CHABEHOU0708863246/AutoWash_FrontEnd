import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/Auth/auth.service';

@Component({
    selector: 'app-not-found',
    imports: [RouterLink],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {

constructor(private authService: AuthService) {}

    getDashboardRoute(): string {
        const role = this.authService.getUserRole();

        switch(role) {
            case 'admin':
                return '/admin/dashboard';
            case 'manager':
                return '/manager/dashboard';
            case 'washer':
                return '/washer/dashboard';
            default:
                return '/';
        }
      }

}
