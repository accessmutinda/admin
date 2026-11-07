import { Component } from '@angular/core';
import { ModuleDesign } from '../../management/shared/module-design';
import { SecurityPageHeader } from './security-page-header';

@Component({
  selector: 'cv-login-history',
  imports: [ModuleDesign, SecurityPageHeader],
  host: { class: 'module-page operations-page security-page' },
  templateUrl: './login-history.html',
  styleUrl: './login-history.css',
})
export class LoginHistory {}
