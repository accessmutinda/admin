import { Injectable, inject } from '@angular/core';
import { InspectorReportsService } from './inspector-reports.service';
import { InspectorNotesApi } from './inspector-notes-api.service';

@Injectable()
export class InspectorNotesService extends InspectorReportsService {
  protected override createApi(): InspectorNotesApi {
    return inject(InspectorNotesApi);
  }
}
