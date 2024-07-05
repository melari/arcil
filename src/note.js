import { dtagFor, handleFor, decryptSelf, encryptSelf } from "./common.js";
import { Relay } from "./relay.js";

export class Note {
    static async fromNostrEvent(event) {
        const nostrEvent =
            event.kind === 31234
                ? JSON.parse(await decryptSelf(event.content))
                : event.rawEvent();

        const note = new Note();
        note.id = nostrEvent.id;
        note.nostrEvent = nostrEvent;
        note.title = nostrEvent.tags.find(t => t[0] == "title")[1];
        note.private = event.kind === 31234;
        note.content = nostrEvent.content;
        note.authorPubkey = nostrEvent.pubkey;
        note.createdAt = nostrEvent.created_at ?? event.created_at;
        note.onRelays = [];

        return note;
    }

    static fromContent(title, content) {
        const note = new Note();
        note.title = title;
        note.content = content;
        note.private = false;
        note.onRelays = [];
        return note;
    }

    // Applies an update to the note.
    // opts is an object with optional keys for:
    // title, private, content
    // Any excluded key will not be modified
    // Any update will bump the createdAt timestamp to the current time.
    update(opts) {
        this.title = opts.title ?? this.title;
        this.private = opts.private ?? this.private;
        this.content = opts.content ?? this.content;
        this.createdAt = Math.floor(Date.now() / 1000);
    }

    get handle() {
        return handleFor(this.title, this.authorPubkey);
    }

    get dtag() {
        return dtagFor(this.title);
    }

    toPlain() {
        return {
            id: this.id,
            private: this.private,
            title: this.title,
            content: this.content,
            pubkey: this.authorPubkey,
            createdAt: this.createdAt,
        };
    }

    static async fromPlain(plain) {
        const note = new Note();
        note.id = plain.id;
        note.private = plain.private;
        note.authorPubkey = plain.pubkey;
        note.content = plain.content;
        note.title = plain.title;
        note.createdAt = plain.createdAt;
        note.onRelays = [];

        return note;
    }

    async toNostrEvent(extraTags = []) {
        const publicKind = 30023;
        const tags = [
            ["d", this.dtag],
            ["title", this.title],
            ["published_at", this.createdAt.toString()],
            ...extraTags,
        ];
        const publicEvent = Relay.instance.buildEvent(publicKind, this.content, tags, this.authorPubkey);

        if (this.private) {
            const draftKind = 31234;
            const payload = await encryptSelf(JSON.stringify(publicEvent.rawEvent()));
            const wrapperTags = [
                ['d', this.dtag],
                ['k', publicKind.toString()],
            ];
            return Relay.instance.buildEvent(draftKind, payload, wrapperTags, this.authorPubkey);
        } else {
            return publicEvent;
        }
    }
}
