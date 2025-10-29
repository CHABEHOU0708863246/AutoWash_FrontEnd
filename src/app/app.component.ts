import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbPaginationModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { NotificationComponent } from "./core/components/notification/notification.component";
@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NgbPaginationModule, NgbAlertModule, NotificationComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AutoWash_Frontend';
}
