import { Component, inject, input, signal } from '@angular/core';
import { Person, CHECKS } from '../../shared/management.store';
import { FormsModule } from '@angular/forms';
import { RecruitmentApi } from '../../recruitment/recruitment-api.service';
@Component({
  selector: 'cv-person-compliance',
  imports: [FormsModule],
  templateUrl: './person-compliance.html',
})
export class PersonCompliance {
  readonly person = input.required<Person>();
  protected readonly checks = CHECKS;
  protected readonly api = inject(RecruitmentApi);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private queue = Promise.resolve();
  private save(payload: unknown): void {
    const company = this.api.companyId(),
      application = this.person().id;
    this.queue = this.queue.then(async () => {
      if (company !== this.api.companyId() || application !== this.api.record()?.id) return;
      this.busy.set(true);
      this.error.set('');
      try {
        await this.api.updateCompliance(payload);
      } catch (error) {
        this.error.set(this.api.message(error));
      } finally {
        this.busy.set(false);
      }
    });
  }
  protected setExpiry(code: string, value: string): void {
    this.save({ check: { code, expiry: value || null } });
  }
  protected setVisa(field: 'visaType' | 'visaExpiry', value: string): void {
    this.save(field === 'visaType' ? { visa_type: value } : { visa_expiry: value || null });
  }
  protected toggle(index: number): void {
    this.save({ check: { code: this.checks[index], recorded: !this.person().checks[index] } });
  }
}
