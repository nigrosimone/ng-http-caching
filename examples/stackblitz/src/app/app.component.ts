import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="load()">GET /todos/1</button>

    <!-- the first click hits the network, the next ones are served from the
         cache: watch the elapsed time drop, and the Network tab stay quiet -->
    <ul>
      @for (line of log(); track $index) {
        <li>{{ line }}</li>
      }
    </ul>
  `,
})
export class AppComponent {
  private readonly http = inject(HttpClient);
  readonly log = signal<string[]>([]);

  load(): void {
    const started = performance.now();
    this.http.get('https://jsonplaceholder.typicode.com/todos/1').subscribe(() => {
      const elapsed = Math.round(performance.now() - started);
      this.log.update((lines) => [...lines, `response in ${elapsed}ms`]);
    });
  }
}
