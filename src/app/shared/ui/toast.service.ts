import { Component, Injectable, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

type ToastOptions = Pick<MatSnackBarConfig, 'duration' | 'horizontalPosition' | 'verticalPosition'>;

interface ToastData {
  message: string;
  icon: string;
}

@Component({
  selector: 'cv-toast-content',
  template: `
    <div class="flex items-center gap-2.5">
      <span class="material-symbols-outlined text-[20px]">{{ data.icon }}</span>
      <span class="text-sm font-medium">{{ data.message }}</span>
    </div>
  `,
})
class ToastContent {
  protected readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, options?: ToastOptions): void {
    this.show(message, 'check_circle', 'cv-toast-success', options);
  }

  info(message: string): void {
    this.show(message, 'info', 'cv-toast-info');
  }

  error(message: string): void {
    this.show(message, 'error', 'cv-toast-error');
  }

  private show(message: string, icon: string, tone: string, options?: ToastOptions): void {
    this.snackBar.openFromComponent(ToastContent, {
      ...options,
      data: { message, icon } satisfies ToastData,
      panelClass: ['cv-toast', tone],
    });
  }
}
