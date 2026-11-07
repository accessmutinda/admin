import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';

@Component({
  selector: 'cv-forgot-password',
  imports: [RouterLink, AuthCenteredLayout],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {}
