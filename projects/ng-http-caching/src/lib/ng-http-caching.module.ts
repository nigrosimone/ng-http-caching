import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  NGX_HTTP_CACHE_CONFIG,
  NgxHttpCachingConfig,
} from './ng-http-caching.service';
import { NgxHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: NgxHttpCachingInterceptorService,
      multi: true,
    },
  ],
  exports: [],
})
export class NgxHttpCachingModule {
  static forRoot(
    NgxHttpCachingConfig?: NgxHttpCachingConfig
  ): ModuleWithProviders<NgxHttpCachingModule> {
    return {
      ngModule: NgxHttpCachingModule,
      providers: [
        {
          provide: NGX_HTTP_CACHE_CONFIG,
          useValue: NgxHttpCachingConfig,
        },
      ],
    };
  }
}
