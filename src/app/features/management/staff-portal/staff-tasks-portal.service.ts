import { Injectable, computed, inject } from '@angular/core';
import { JournalService } from '../journal/journal.service';
import { JournalTask } from '../journal/journal.models';

@Injectable()
export class StaffTasksPortal {
  readonly connected = true;
  readonly journal = inject(JournalService);
  readonly contacts = this.journal.contacts;
  readonly tasks = this.journal.tasks;
  readonly store = {
    company: computed(() => this.journal.staffContext()?.company ?? null),
    staff: () => [],
  };
  get today(): string {
    return this.journal.staffContext()?.local_date ?? '';
  }
  get weekStart(): string {
    if (!this.today) return '';
    const day = new Date(this.today + 'T12:00:00Z');
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    return day.toISOString().slice(0, 10);
  }
  person(email: string): string {
    return (
      this.contacts().find((person) => person.email.toLowerCase() === email.toLowerCase())?.name ??
      email
    );
  }
  clientName(id: string): string {
    return (
      this.journal.clients().find((client) => client.id === id)?.name ??
      (id ? 'Service user unavailable' : 'General')
    );
  }
  newTask(clientId = '', owner = this.journal.email()): JournalTask {
    return {
      id: crypto.randomUUID(),
      owner,
      title: '',
      clientId,
      due: this.today,
      priority: 'Normal',
      status: 'Open',
      shared: true,
      assignedBy: this.journal.email(),
      notes: '',
      actions: '',
      followUp: '',
      attachments: [],
    };
  }
  saveTask(task: JournalTask): Promise<string | null> {
    return this.journal.saveTask(task);
  }
}
