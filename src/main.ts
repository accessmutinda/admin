import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(async (application) => {
    if (isDevMode()) {
      const { installCareDemo } = await import('./app/demo/care-demo');
      installCareDemo(application.injector);
      const { installSystemDemo } = await import('./app/demo/system-demo');
      installSystemDemo(application.injector);
    }
  })
  .catch((err) => console.error(err));
