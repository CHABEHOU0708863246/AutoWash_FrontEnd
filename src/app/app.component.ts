import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbPaginationModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NgbPaginationModule, NgbAlertModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AutoWash_Frontend';
}
