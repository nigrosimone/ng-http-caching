import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgHttpCachingModule, NgHttpCachingLocalStorage } from '../../../ng-http-caching/src/public-api';


@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgHttpCachingModule.forRoot({
      store: new NgHttpCachingLocalStorage()
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
