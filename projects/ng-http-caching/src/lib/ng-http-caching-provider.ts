import { EnvironmentProviders, makeEnvironmentProviders, Provider } from "@angular/core";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgHttpCachingInterceptorService } from "./ng-http-caching-interceptor.service";
import { NG_HTTP_CACHING_CONFIG, NgHttpCachingConfig, NgHttpCachingService } from "./ng-http-caching.service";

export function provideNgHttpCaching(ngHttpCachingConfig?: NgHttpCachingConfig) {
    const providers: Provider[] = [
        NgHttpCachingService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NgHttpCachingInterceptorService,
            multi: true,
        },
        NgHttpCachingInterceptorService
    ];
    if (ngHttpCachingConfig) {
        providers.push({
            provide: NG_HTTP_CACHING_CONFIG,
            useValue: ngHttpCachingConfig,
        });
    }
    return makeEnvironmentProviders(providers);
}
