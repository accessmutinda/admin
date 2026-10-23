import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FamilyDrafts {
  private readonly drafts = new Map<string, string>();
  read(key: string): string {
    if (this.drafts.has(key)) return this.drafts.get(key)!;
    try {
      return sessionStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }
  save(key: string, text: string): boolean {
    this.drafts.set(key, text);
    try {
      if (text) sessionStorage.setItem(key, text);
      else sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
