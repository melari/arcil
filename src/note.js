import { dtagFor, handleFor, decryptSelf } from "./common.js";

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
}
