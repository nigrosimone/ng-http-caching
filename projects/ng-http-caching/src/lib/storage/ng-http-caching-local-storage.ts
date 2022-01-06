import { NgHttpCachingStorageInterface } from './ng-http-caching-storage.interface';
import { NgHttpCachingEntry } from '../ng-http-caching.service';
import { HttpHeaders, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';

const KEY_PREFIX = 'NgHttpCaching::';

function serializeRequest(req: HttpRequest<any>): string {
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

function serializeResponse(res: HttpResponse<any>): string {
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

function deserializeRequest<T = any>(req: string): HttpRequest<T> {
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

function deserializeResponse<T = any>(res: string): HttpResponse<T> {
    const response = JSON.parse(res);
    return new HttpResponse<T>({
        url: response.url,
        headers: new HttpHeaders(response.headers),
        body: response.body,
        status: response.status,
        statusText: response.statusText,
    });
}

export class NgHttpCachingLocalStorage implements NgHttpCachingStorageInterface {

    get size(): number {
        let count = 0;
        for (let i = 0, e = localStorage.length; i < e; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                count++;
            }
        }
        return count;
    }

    clear(): void {
        for (let i = 0, e = localStorage.length; i < e; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        }
    }

    delete(key: string): boolean {
        localStorage.removeItem(KEY_PREFIX + key);
        return true;
    }

    // eslint-disable-next-line no-unused-vars
    forEach(callbackfn: (value: NgHttpCachingEntry, key: string) => void): void {
        // iterate localStorage
        const lenPrefix = KEY_PREFIX.length;
        for (let i = 0, e = localStorage.length; i < e; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(KEY_PREFIX)) {
                const value = this.get(key.substring(lenPrefix));
                if (value) {
                    callbackfn(value, key);
                }
            }
        }
    }

    get(key: string): NgHttpCachingEntry | undefined {
        const item = localStorage.getItem(KEY_PREFIX + key);
        if (item) {
            const parsedItem: NgHttpCachingEntry = JSON.parse(item);
            return {
                url: parsedItem.url,
                response: deserializeResponse(parsedItem.response as unknown as string),
                request: deserializeRequest(parsedItem.request as unknown as string),
                addedTime: parsedItem.addedTime
            };
        }
        return undefined;
    }

    has(key: string): boolean {
        return localStorage.getItem(KEY_PREFIX + key) !== undefined;
    }

    set(key: string, value: NgHttpCachingEntry): void {
        localStorage.setItem(KEY_PREFIX + key, JSON.stringify({
            url: value.url,
            response: serializeResponse(value.response),
            request: serializeRequest(value.request),
            addedTime: value.addedTime
        }));
    }
}
