import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { API_BASE } from '../../../core/auth/auth-api';
import type {
  WorkforceLeave,
  WorkforceLeavePage,
  WorkforceLeaveWrite,
  WorkforceCalendar,
  WorkforceLeaveKind,
  WorkforceLeaveOptions,
} from './availability-leave.generated';
export interface LeaveStaffOption {
  id: string;
  name: string;
  branch: string;
  reference: string;
}
type OptionsPage = WorkforceLeaveOptions;
@Injectable({ providedIn: 'root' })
export class AvailabilityLeaveApi {
  private readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly companyId = this.access.companyId;
  readonly scope = computed(
    () =>
      `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${JSON.stringify(this.access.context())}`,
  );
  readonly rows = signal<WorkforceLeave[]>([]);
  readonly staff = signal<LeaveStaffOption[]>([]);
  readonly types = signal<WorkforceLeaveKind[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly optionError = signal('');
  readonly optionsLoading = signal(false);
  private generation = 0;
  private optionsGeneration = 0;
  private readonly keys = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.optionsGeneration++;
        this.rows.set([]);
        this.staff.set([]);
        this.types.set([]);
        this.error.set('');
        this.optionError.set('');
        this.loading.set(false);
        this.optionsLoading.set(false);
        this.keys.clear();
      });
    });
  }
  private root(): string {
    const company = this.companyId();
    if (
      !company ||
      !this.access.can('people', 'leave', 'read') ||
      !this.access.can('people', 'records', 'read')
    )
      throw Error('Availability and leave access is unavailable.');
    return `/companies/${company}`;
  }
  private next(value: string | null, company: string): string | null {
    if (!value) return null;
    const next = new URL(value, API_BASE),
      base = new URL(API_BASE);
    if (
      next.origin !== base.origin ||
      !next.pathname.startsWith(base.pathname + `/companies/${company}/`)
    )
      throw Error('The leave page link is invalid.');
    return next.pathname.slice(base.pathname.length) + next.search;
  }
  private key(id: string): string {
    if (!this.keys.has(id)) this.keys.set(id, crypto.randomUUID());
    return this.keys.get(id)!;
  }
  async load(q = '', status = '', staffId = ''): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.generation;
    this.rows.set([]);
    this.error.set('');
    this.loading.set(true);
    try {
      let path: string | null =
        this.root() +
        '/leave-requests?' +
        new URLSearchParams({
          q,
          status,
          page_size: '100',
          ...(staffId ? { staff_id: staffId } : {}),
        });
      const rows: WorkforceLeave[] = [];
      const seen = new Set<string>();
      while (path) {
        if (seen.has(path) || seen.size >= 100)
          throw Error('Narrow the leave search to load these records.');
        seen.add(path);
        const response: WorkforceLeavePage = await this.auth.api(path);
        if ((response.meta as { company_id: string }).company_id !== company)
          throw Error('The leave response does not match this company.');
        if (scope !== this.scope() || generation !== this.generation) return;
        rows.push(...response.results);
        path = this.next(response.next, company);
      }
      this.rows.set(rows);
    } catch (error) {
      if (scope === this.scope() && generation === this.generation)
        this.error.set(this.message(error));
    } finally {
      if (scope === this.scope() && generation === this.generation) this.loading.set(false);
    }
  }
  async options(): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.optionsGeneration;
    this.staff.set([]);
    this.types.set([]);
    this.optionError.set('');
    this.optionsLoading.set(true);
    try {
      let path: string | null = this.root() + '/hr/leave-options?page_size=100';
      const rows: LeaveStaffOption[] = [];
      const seen = new Set<string>();
      let types: WorkforceLeaveKind[] = [];
      while (path) {
        if (seen.has(path) || seen.size >= 100)
          throw Error('Open a staff record to request leave for this workforce.');
        seen.add(path);
        const response: OptionsPage = await this.auth.api(path);
        if (response.meta.company_id !== company)
          throw Error('The staff options do not match this company.');
        if (scope !== this.scope() || generation !== this.optionsGeneration) return;
        rows.push(...response.results);
        types = response.meta.leave_types;
        path = this.next(response.next, company);
      }
      this.staff.set(rows);
      this.types.set(types);
    } catch (error) {
      if (scope === this.scope() && generation === this.optionsGeneration)
        this.optionError.set(this.message(error));
    } finally {
      if (scope === this.scope() && generation === this.optionsGeneration)
        this.optionsLoading.set(false);
    }
  }
  async request(body: WorkforceLeaveWrite, key: string): Promise<WorkforceLeave> {
    const scope = this.scope();
    const row = await this.auth.api<WorkforceLeave>(this.root() + '/leave-requests', body, 'POST', {
      'Idempotency-Key': key,
    });
    if (scope !== this.scope()) throw Error('The workspace or leave access changed.');
    if (
      row.personId !== body.staff_id ||
      row.type_id !== body.type_id ||
      row.start !== body.start ||
      row.end !== body.end
    )
      throw Error('This leave draft changed. Reopen the request before submitting.');
    if (row.status === 'Draft') return this.transition(row, 'submit');
    return row;
  }
  async transition(
    row: WorkforceLeave,
    command: 'submit' | 'approve' | 'reject' | 'cancel',
  ): Promise<WorkforceLeave> {
    const scope = this.scope(),
      body = {
        reason: {
          submit: 'Submitted through Availability & Leave.',
          approve: 'Approved through the staff leave record.',
          reject: 'Rejected through the staff leave record.',
          cancel: 'Cancelled through Availability & Leave.',
        }[command],
      };
    const result = await this.auth.api<WorkforceLeave>(
      this.root() + `/leave-requests/${row.id}/${command}`,
      body,
      'POST',
      {
        'If-Match': row.etag,
        'Idempotency-Key': this.key(`${command}:${row.id}:${row.etag}:${scope}`),
      },
    );
    if (scope !== this.scope()) throw Error('The workspace or leave access changed.');
    return result;
  }
  async calendar(staffId: string, month: string): Promise<WorkforceCalendar> {
    const scope = this.scope(),
      company = this.companyId();
    const result = await this.auth.api<WorkforceCalendar>(
      this.root() +
        `/staff/${staffId}/workforce-availability/calendar?` +
        new URLSearchParams({ month }),
    );
    if (
      scope !== this.scope() ||
      result.company_id !== company ||
      result.staff_id !== staffId ||
      result.month !== month
    )
      throw Error('The availability calendar no longer matches the selected staff record.');
    return result;
  }
  message(error: unknown): string {
    return error instanceof Error ? error.message : 'Availability and leave are unavailable.';
  }
}
