import { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 *  A low level cache of raw nostr events. These can belong to any user and will not be decrypted.
 *  Unlike Database, this cache is not persisted between page loads.
 */
export class Relay {
    // which tags are indexed in tagIndex
    // #d is not included since it is the primary index
    static INDEXED_TAGS = ['a'];
    static DELETE_EVENT_KIND = 5;

    // "kind:hexpubkey:dTag" => Note (singular)
    primaryIndex = {};

    // "kind:hexpubkey:tagKind:TagValue" => Set{"primaryKey1", ... }
    tagIndex = {};

    static instance = new Relay();
    constructor() {
        if (!!Relay.instance) { throw new Error('Use singletone instance'); }
    }

    async fetchEvent(filters) {
        return new Promise((resolve, reject) => {
            const cached = this.readByFilter(filters);
            if (cached.size > 0) {
                callback([...cached][0]);
            } else {
                window.ndk.fetchEvent(filters).then((event) => {
                    this.write(event);
                    resolve(event);
                });
            }
        });
    }

    async fetchEvents(filters, callback) {
        const cached = this.readByFilter(filters);
        if (cached.size > 0) {
            callback(cached);
        } else {
            window.ndk.fetchEvents(filters).then((events) => {
                events.forEach(e => this.write(e));
                callback(events);
            });
        }
    }

    // subscribe does a combination of checking cache and external relays
    // cached results trigger the callback immediately but don't block pulling events from external relays.
    async subscribe(filters, callback) {
        const subscription = await window.ndk.subscribe(filters, { closeOnEose: true });
        subscription.on("event", async (event) => {
            this.write(event)
            callback(event);
        });

        const cached = this.readByFilter(filters);
        [...cached].forEach(event => callback(event));

        return subscription;
    }

    // Publishes a note to all relays, and adds it to the local cache as well
    // Once the event has been published to external relays, the callback is called with the saved nostr event
    async publish(kind, content, tags, hexpubkey) {
        if (hexpubkey && hexpubkey !== window.ndk.activeUser?.hexpubkey) {
            throw new Error('NDK is configured with an unexpected pubkey');
        }

        const event = new NDKEvent(window.ndk);
        event.kind = kind;
        event.content = content;
        event.tags = tags;

        if (kind !== Relay.DELETE_EVENT_KIND) {
            this.write(event);
        }

        return event.publish().then(_relaySet => event);
    }

    // Publishes a kind 5 (delete request) event to relays,
    // and removes the event from the cache as well.
    // Returns a Promise that is fulfilled once the deletion event has been pushed to external relays
    async del(noteId) {
        Object.keys(this.primaryIndex).forEach((dTag) => {
            if (this.primaryIndex[dTag].id === noteId) {
                delete this.primaryIndex[dTag];
                Object.keys(this.tagIndex).forEach((tagIndexKey) => {
                    this.tagIndex[tagIndexKey].delete(dTag);
                });
            }
        });

        return this.publish(Relay.DELETE_EVENT_KIND, 'This note has been deleted', [['e', noteId]]);
    }

    write(note) {
        if (!note) { return; }

        const primaryKey = this.primaryIndexKey(note.kind, note.pubkey, note.dTag);
        if (note.dTag) {
            const existing = this.primaryIndex[primaryKey];
            if (!existing || existing.created_at < note.created_at) {
                this.primaryIndex[primaryKey] = note;
            }
        }

        note.tags.filter(t => Relay.INDEXED_TAGS.includes(t[0])).forEach(([tagKind, tagValue]) => {
            const tagKey = this.tagIndexKey(note.kind, note.pubkey, tagKind, tagValue);
            if (!this.tagIndex[tagKey]) { this.tagIndex[tagKey] = new Set(); }
            if (this.tagIndex[tagKey].has(primaryKey)) { return; }
            this.tagIndex[tagKey].add(primaryKey);
        });
    }

    // Tries to load events from the cache using the filter. Not all possible
    // filters are supported. The expectation is to have:
    // - hexpubkey
    // - kind
    // - ONE of "#d" or other tag in INDEXED_TAGS
    //
    // Each of these filter should in turn have only ONE value
    // 
    // Example structure of nostr filter:
    // {
    //   #d: ['value'],
    //   authors: ['hexpubkey'],
    //   kinds: [30023]
    // }
    readByFilter(filter) {
        const supportedTags = ['#d', ...Relay.INDEXED_TAGS.map(t => `#${t}`)];
        const tagsGiven = supportedTags.filter(t => !!filter[t]);
        if (!filter.authors || !filter.kinds || tagsGiven.length !== 1) {
            return new Set();
        }

        const tagToUse = tagsGiven[0];

        if (filter.authors.length > 1 || filter.kinds.length > 1 || filter[tagToUse].length > 1) {
            return new Set();
        }

        const kind = filter.kinds[0];
        const hexpubkey = filter.authors[0];
        const tagKind = tagToUse.slice(1);
        const tagValue = filter[tagToUse][0];

        if (tagToUse === '#d') {
            return this.readPrimaryIndex(kind, hexpubkey, tagValue);
        }

        return this.readTagIndex(kind, hexpubkey, tagKind, tagValue);
    }

    readPrimaryIndex(kind, hexpubkey, dTag) {
        const note = this.primaryIndex[this.primaryIndexKey(kind, hexpubkey, dTag)];
        if (!note) { return new Set(); }
        return new Set([note]);
    }

    readTagIndex(kind, hexpubkey, tagKind, tagValue) {
        const primaryKeys = this.tagIndex[this.tagIndexKey(kind, hexpubkey, tagKind, tagValue)];
        if (!primaryKeys) { return new Set(); }
        return new Set([...primaryKeys].map(k => this.primaryIndex[k]));
    }

    primaryIndexKey(kind, hexpubkey, dTag) {
        return `${kind}:${hexpubkey}:${dTag}`;
    }

    tagIndexKey(kind, hexpubkey, tagKind, tagValue) {
        return `${kind}:${hexpubkey}:${tagKind}/${tagValue}`;
    }
}
window.Relay = Relay;
