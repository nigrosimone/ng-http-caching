import { Component } from '@angular/core';
import { NgHttpCachingService} from '../../../ng-http-caching/src/lib/ng-http-caching.service';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'ng-http-caching-demo';

  constructor(
    private NgHttpCachingService: NgHttpCachingService,
    private http: HttpClient){}

  dump(): void {
    console.log(this.NgHttpCachingService.store);
  }

  getRequest(): void {
    this.http.get('/api/get?foo1=bar1&foo2=bar2', {withCredentials: true}).subscribe(result => {
      console.log('response', result);
    });
  }
}
