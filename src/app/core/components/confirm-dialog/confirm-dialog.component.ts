import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmation';
  @Input() message = 'Êtes-vous sûr de vouloir effectuer cette action ?';
  @Input() details = '';
  @Input() confirmText = 'Confirmer';
  @Input() cancelText = 'Annuler';
  @Input() visible = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
    this.visible = false;
  }

  onCancel() {
    this.cancel.emit();
    this.visible = false;
  }
}
