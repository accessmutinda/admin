import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ManagementStore } from '../../shared/management.store';
import { UsersAccess } from './users-access';
import { accessFixture } from './access-test-fixtures.test-support';

describe('Company roles page', () => {
  it('renders backend role names and feature actions, and hides role creation from company admins', async () => {
    const access = accessFixture();
    access.context.set({ company_id: 'north', can_manage_roles: true, can_create_roles: false });
    TestBed.configureTestingModule({
      imports: [UsersAccess],
      providers: [
        provideRouter([]),
        { provide: CompanyAccessService, useValue: access },
        { provide: AuthService, useValue: { api: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: ManagementStore,
          useValue: { company: signal({ id: 'north', name: 'North', code: 'N', modules: [], active: true }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(UsersAccess);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Company nurse');
    expect(element.textContent).toContain('Service User Records');
    expect(element.textContent).not.toContain('Add company role');
    expect(element.querySelector('input[aria-label="View Service User Records"]')).toBeTruthy();
  });
});
