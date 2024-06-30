import { Relay } from "./relay.js";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { RelayConfig } from "./relay_config.js";
const crypto = require('crypto-js');


export class Blossom {
    static SERVER_HINT_EVENT_KIND = 10063;
    static AUTH_EVENT_KIND = 24242;

    userServers = new Set();
    hexpubkey = null;

    static instance = new Blossom();
    constructor() {
        if (!!Blossom.instance) { throw new Error('Use singleton instance'); }
    }

    async getServerStatus(url) {
        let response;
        try { response = await fetch(new URL('/list/ping', url).toString()); }
        catch { return false; }
        return !!response.ok;
    }

    async fetchFile(hash, hexpubkey) {
        const urls = await this.urlsForFile(hash, hexpubkey);

        for (const url of urls) {
            let response;
            try { response = await fetch(url); }
            catch { continue; }
            if (!response.ok) { continue; }

            // Check that the file hash matches what we expected
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const wordArray = crypto.lib.WordArray.create(arrayBuffer);
            const downloadedHash = crypto.SHA256(wordArray).toString(crypto.enc.Hex);
            if (downloadedHash !== hash) {
                console.warn(`File received from ${url} has a mismatched hash. Discarding.`, {
                    expected: hash,
                    received: downloadedHash,
                });
                continue;
            }

            // Found the correct file, create an referenceable internal URL
            return URL.createObjectURL(blob);
        }

        throw new Error(`[404] blossom://${hash} was not found on any known servers`);
    }

    // On success returns:
    // {
    //   hash: 'abc123', 
    //   downloadUrls: ['https://blossom.tagayasu.xyz/abc123', ...]
    // }
    async uploadFile(blob, hexpubkey) {
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const wordArray = crypto.lib.WordArray.create(arrayBuffer);
        const hash = crypto.SHA256(wordArray).toString(crypto.enc.Hex);

        const fileSize = blob.size;
        const auth = await this._nostrUploadAuth(fileSize);

        const headers = new Headers();
        headers.append('Authorization', auth);

        const requestOptions = {
            method: 'PUT',
            headers,
            body: blob,
        };

        const uploadUrls = await this.uploadUrls(hexpubkey);
        const successfulUploads = await Promise.allSettled(uploadUrls.map(url => new Promise((resolve, reject) => {
            fetch(url, requestOptions).then(async response => {
                const parsed = await response.json();
                if (parsed.sha256 === hash) { resolve(parsed.url); }
                else { reject('return hash did not match expected. Discarding'); }
            }).catch(reason => reject(reason));
        })));

        const downloadUrls = successfulUploads.filter(r => r.status === 'fulfilled').map(r => r.value);

        if (downloadUrls.length === 0) {
            Promise.reject('failed to upload file to any blossom servers')
        }

        return Promise.resolve({ hash, downloadUrls });
    }

    async _nostrUploadAuth(fileSize) {
        const unixTime = Math.floor(Date.now() / 1000);
        const expiration = unixTime + (60 * 5);

        const event = new NDKEvent(window.ndk);
        event.kind = Blossom.AUTH_EVENT_KIND;
        event.content = 'File Upload';
        event.tags = [
            ['t', 'upload'],
            ['size', fileSize],
            ['expiration', expiration]
        ];
        await event.sign();

        const authBase64 = btoa(JSON.stringify(event.rawEvent()))
        return `Nostr ${authBase64}`;
    }

    async urlsForFile(hash, hexpubkey) {
        return (await this.serverList(hexpubkey)).map(server => {
            try { return (new URL(hash, server)).href; }
            catch { return null; }
        }).filter(x => !!x);
    }

    async uploadUrls(hexpubkey) {
        return (await this.serverList(hexpubkey)).map(server => {
            try { return (new URL('/upload', server)).href; }
            catch { return null; }
        }).filter(x => !!x);
    }

    async serverList(hexpubkey) {
        return RelayConfig.forBlossom(hexpubkey).getRelayUrls();
    }
}
window.Blossom = Blossom;
