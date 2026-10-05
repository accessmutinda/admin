import { Component, inject, input } from '@angular/core';
import { ManagementStore, Person, CHECKS } from '../../shared/management.store';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'cv-person-compliance',
  imports: [FormsModule],
  templateUrl: './person-compliance.html',
})
export class PersonCompliance {
  readonly person = input.required<Person>();
  protected readonly store = inject(ManagementStore);
  protected readonly checks = CHECKS;
  protected setExpiry(check: string, value: string): void {
    const p = this.person();
    if (p) this.store.updatePerson({ ...p, checkExpiry: { ...p.checkExpiry, [check]: value } });
  }
  protected setVisa(field: 'visaType' | 'visaExpiry', value: string): void {
    const p = this.person();
    if (p) this.store.updatePerson({ ...p, [field]: value });
  }
  protected toggle(index: number): void {
    const p = this.person();
    if (!p) return;
    const values = [...p.checks];
    values[index] = !values[index];
    this.store.updatePerson({ ...p, checks: values });
  }
}
