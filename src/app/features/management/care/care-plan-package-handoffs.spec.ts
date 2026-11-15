import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarePlanPackageHandoffs } from './care-plan-package-handoffs';
import { CarePlanApi } from './care-plan-api.service';
import { CarePlanService } from './care-plan.service';

describe('Connected care-package handoff refresh', () => {
  it('reloads recommendations when the parent care-plan revision changes', () => {
    const api = { connect: vi.fn(), error: signal(''), handoffRows: signal([]) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CarePlanService, useValue: {} }],
    });
    TestBed.overrideComponent(CarePlanPackageHandoffs, {
      set: { providers: [{ provide: CarePlanApi, useValue: api }] },
    });
    const fixture = TestBed.createComponent(CarePlanPackageHandoffs);
    fixture.componentRef.setInput('connected', true);
    fixture.componentRef.setInput('clientId', 'patient');
    fixture.componentRef.setInput('revision', 1);
    fixture.detectChanges();
    expect(api.connect).toHaveBeenCalledWith('patient');
    api.connect.mockClear();
    fixture.componentRef.setInput('revision', 2);
    fixture.detectChanges();
    expect(api.connect).toHaveBeenCalledOnce();
    expect(api.connect).toHaveBeenCalledWith('patient');
  });
});
