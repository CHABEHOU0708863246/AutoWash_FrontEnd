import { Component } from '@angular/core';
import { AppNotification, NotificationService } from '../../services/Notification/notification.service';
import { Router } from 'express';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-notification',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent {
  notifications: AppNotification[] = [];

  constructor(private notificationService: NotificationService) {
    this.notificationService.notifications$.subscribe(
      notifications => this.notifications = notifications
    );
  }

  remove(id: number): void {
    this.notificationService.remove(id);
  }
}
