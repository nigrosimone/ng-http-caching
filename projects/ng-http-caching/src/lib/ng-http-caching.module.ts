import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  NG_HTTP_CACHING_CONFIG,
  NgHttpCachingConfig,
} from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: NgHttpCachingInterceptorService,
      multi: true,
    },
  ],
  exports: [],
})
export class NgHttpCachingModule {
  static forRoot(
    NgHttpCachingConfig?: NgHttpCachingConfig
  ): ModuleWithProviders<NgHttpCachingModule> {
    return {
      ngModule: NgHttpCachingModule,
      providers: [
        {
          provide: NG_HTTP_CACHING_CONFIG,
          useValue: NgHttpCachingConfig,
        },
      ],
    };
  }
}
