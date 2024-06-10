import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgHttpCachingModule, NgHttpCachingLocalStorage } from '../../../ng-http-caching/src/public-api';


@NgModule({ declarations: [AppComponent],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        FormsModule,
        NgHttpCachingModule.forRoot({
            store: new NgHttpCachingLocalStorage()
        })], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }
