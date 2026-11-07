import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';

@Component({
  selector: 'cv-sso-google',
  imports: [RouterLink, AuthCenteredLayout],
  templateUrl: './sso-google.html',
})
export class SsoGoogle {}
