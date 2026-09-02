import { HttpRequest, HttpResponse } from '@angular/common/http';
import {
  NgHttpCachingBroadcastStorage,
  withNgHttpCachingBroadcastStorage,
} from './ng-http-caching-broadcast-storage';
import { NgHttpCachingEntry } from '../ng-http-caching.service';

const entry = (url: string): NgHttpCachingEntry => ({
  url,
  response: new HttpResponse({ status: 200, body: { url } }),
  request: new HttpRequest('GET', url),
  addedTime: Date.now(),
  freshTime: Date.now(),
  version: '1',
});

/** the messages are delivered on a task, so let the loop turn */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('NgHttpCachingBroadcastStorage', () => {
  const channel = 'ng-http-caching-test';
  let tabA: NgHttpCachingBroadcastStorage;
  let tabB: NgHttpCachingBroadcastStorage;

  beforeEach(() => {
    tabA = withNgHttpCachingBroadcastStorage({ channel });
    tabB = withNgHttpCachingBroadcastStorage({ channel });
  });

  afterEach(() => {
    tabA.destroy();
    tabB.destroy();
  });

  it('should be an in-memory store', () => {
    tabA.set('a', entry('https://angular.io/a'));
    expect(tabA.get('a')).toBeTruthy();
    expect(tabA.size).toBe(1);
  });

  it('should not send the entries to the other tabs', async () => {
    tabA.set('a', entry('https://angular.io/a'));
    await flush();

    // only orders travel: the other tab has nothing until it asks for it itself
    expect(tabB.size).toBe(0);
  });

  it('should invalidate, not delete, in the other tab', async () => {
    tabA.set('a', entry('https://angular.io/a'));
    tabB.set('a', entry('https://angular.io/a'));

    tabA.delete('a');
    await flush();

    // gone here, still there but stale over there
    expect(tabA.has('a')).toBe(false);
    expect(tabB.has('a')).toBe(true);
    expect(tabB.get('a')?.invalidated).toBe(true);
  });

  it('should propagate an entry stored as invalidated', async () => {
    tabB.set('a', entry('https://angular.io/a'));

    // what `mutationInvalidation: STALE` does in the mutating tab
    tabA.set('a', { ...entry('https://angular.io/a'), invalidated: true });
    await flush();

    expect(tabB.get('a')?.invalidated).toBe(true);
  });

  it('should invalidate everything on clear', async () => {
    for (const key of ['a', 'b']) {
      tabA.set(key, entry(`https://angular.io/${key}`));
      tabB.set(key, entry(`https://angular.io/${key}`));
    }

    tabA.clear();
    await flush();

    expect(tabA.size).toBe(0);
    expect(tabB.size).toBe(2);
    expect(tabB.get('a')?.invalidated).toBe(true);
    expect(tabB.get('b')?.invalidated).toBe(true);
  });

  it('should not echo an order back', async () => {
    const seen: unknown[] = [];
    const spy = new BroadcastChannel(channel);
    spy.onmessage = (event: MessageEvent) => seen.push(event.data);

    try {
      tabA.set('a', entry('https://angular.io/a'));
      tabB.set('a', entry('https://angular.io/a'));

      tabA.delete('a');
      await flush();
      await flush();

      // B marked its entry, and said nothing back: one order on the channel, not two
      expect(tabB.get('a')?.invalidated).toBe(true);
      expect(seen).toEqual([{ op: 'invalidate', keys: ['a'] }]);
    } finally {
      spy.close();
    }
  });

  it('should keep the tabs on different channels apart', async () => {
    const other = withNgHttpCachingBroadcastStorage({ channel: 'another-app' });
    try {
      other.set('a', entry('https://angular.io/a'));
      tabA.set('a', entry('https://angular.io/a'));

      tabA.delete('a');
      await flush();

      expect(other.get('a')?.invalidated).toBeUndefined();
    } finally {
      other.destroy();
    }
  });

  it('should ignore a message that is not one of ours', async () => {
    tabB.set('a', entry('https://angular.io/a'));

    const intruder = new BroadcastChannel(channel);
    try {
      intruder.postMessage({ op: 'drop-everything' });
      intruder.postMessage({ op: 'invalidate', keys: [42] });
      intruder.postMessage('hello');
      await flush();

      expect(tabB.get('a')?.invalidated).toBeUndefined();
    } finally {
      intruder.close();
    }
  });

  it('should keep working once the channel is closed', () => {
    tabA.destroy();
    tabA.set('a', entry('https://angular.io/a'));
    expect(() => tabA.delete('a')).not.toThrow();
    expect(tabA.size).toBe(0);
  });
});
