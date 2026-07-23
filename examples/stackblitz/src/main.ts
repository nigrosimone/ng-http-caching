import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgHttpCaching } from 'ng-http-caching';
import { AppComponent } from './app/app.component';

void bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // cache every GET for 10 seconds
    provideNgHttpCaching({ lifetime: 10_000 }),
    provideHttpClient(withInterceptorsFromDi()),
  ],
});
