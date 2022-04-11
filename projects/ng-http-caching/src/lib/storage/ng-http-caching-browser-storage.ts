import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';
import { HttpHeaders, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';

const KEY_PREFIX = 'NgHttpCaching::';

export function serializeRequest(req: HttpRequest<any>): string {
    const request = req.clone(); // Make a clone, useful for doing destructive things
    return JSON.stringify({
        headers: Object.fromEntries( // Just a helper to make this into an object, not really required but makes the output nicer
            request.headers.keys().map( // Get all of the headers
                (key: string) => [key, request.headers.getAll(key)] // Get all of the corresponding values for the headers
            )
        ),
        method: request.method, // The Request Method, e.g. GET, POST, DELETE
        url: request.url, // The URL
        params: Object.fromEntries( // Just a helper to make this into an object, not really required but makes the output nicer
            request.headers.keys().map( // Get all of the headers
                (key: string) => [key, request.headers.getAll(key)] // Get all of the corresponding values for the headers
            )
        ), // The request parameters
        withCredentials: request.withCredentials, // Whether credentials are being sent
        respnseType: request.responseType, // The response type
        body: request.serializeBody() // Serialize the body, all well and good since we are working on a clone
    });
}

export function serializeResponse(res: HttpResponse<any>): string {
    const response = res.clone();
    return JSON.stringify({
        headers: Object.fromEntries( // Just a helper to make this into an object, not really required but makes the output nicer
            response.headers.keys().map( // Get all of the headers
                (key: string) => [key, response.headers.getAll(key)] // Get all of the corresponding values for the headers
            )
        ),
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        body: response // Serialize the body, all well and good since we are working on a clone
    });
}

export function deserializeRequest<T = any>(req: string): HttpRequest<T> {
    const request = JSON.parse(req);
    const headers = new HttpHeaders(request.headers);
    const params = new HttpParams(); // Probably some way to make this a one-liner, but alas, there are no good docs
    // tslint:disable-next-line: forin
    for (const parameter in request.params) {
        request.params[parameter].forEach((paramValue: string) => params.append(parameter, paramValue));
    }
    return new HttpRequest(request.method, request.url, request.body, {
        headers,
        params,
        responseType: request.responseType,
        withCredentials: request.withCredentials
    });
}

export function deserializeResponse<T = any>(res: string): HttpResponse<T> {
    const response = JSON.parse(res);
    return new HttpResponse<T>({
        url: response.url,
        headers: new HttpHeaders(response.headers),
        body: response.body,
        status: response.status,
        statusText: response.statusText,
    });
}

export class NgHttpCachingBrowserStorage implements NgHttpCachingStorageInterface {


    constructor(private storage: Storage) { }

    get size(): number {
        let count = 0;
        for (let i = 0, e = this.storage.length; i < e; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                count++;
            }
        }
        return count;
    }

    clear(): void {
        for (let i = 0, e = this.storage.length; i < e; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                this.storage.removeItem(key);
            }
        }
    }

    delete(key: string): boolean {
        this.storage.removeItem(KEY_PREFIX + key);
        return true;
    }


    forEach(callbackfn: (value: NgHttpCachingEntry, key: string) => void): void {
        // iterate this.storage
        const lenPrefix = KEY_PREFIX.length;
        for (let i = 0, e = this.storage.length; i < e; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                const value = this.get(key.substring(lenPrefix));
                if (value) {
                    callbackfn(value, key);
                }
            }
        }
    }

    get(key: string): NgHttpCachingEntry | undefined {
        const item = this.storage.getItem(KEY_PREFIX + key);
        if (item) {
            const parsedItem: StorageEntry = JSON.parse(item);
            return {
                url: parsedItem.url,
                response: deserializeResponse(parsedItem.response),
                request: deserializeRequest(parsedItem.request),
                addedTime: parsedItem.addedTime,
                version: parsedItem.version
            };
        }
        return undefined;
    }

    has(key: string): boolean {
        return this.storage.getItem(KEY_PREFIX + key) !== undefined;
    }

    set(key: string, value: NgHttpCachingEntry): void {
        this.storage.setItem(KEY_PREFIX + key, JSON.stringify({
            url: value.url,
            response: serializeResponse(value.response),
            request: serializeRequest(value.request),
            addedTime: value.addedTime
        } as StorageEntry));
    }
}

interface StorageEntry {
    url: string;
    response: string;
    request: string;
    addedTime: number;
    version: string;
}
