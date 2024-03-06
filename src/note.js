import { NDKEvent } from "@nostr-dev-kit/ndk";
import { dtagFor, decryptNote } from "./common.js";

export class Note {
    static async fromNostrEvent(event) {
        const note = new Note();
        note.id = event.id;
        note.nostrEvent = event;
        note.title = event.tags.find(t => t[0] == "title")[1];
        note.private = !!event.tags.find(t => t[0] == "private");
        note.content = event.content;
        note.originalContent = event.content;
        note.authorPubkey = event.pubkey;
        note.createdAt = event.created_at;
        note.onRelays = [];
        note.isStub = false;

        if (note.private) {
            const { title, content } = await decryptNote(note.content);
            note.title = title;
            note.content = content;
        }

        return note;
    }

    static fromHexPubkey(pubkey) {
        const note = new Note();
        note.authorPubkey = pubkey;
        note.onRelays = [];
        note.isStub = true;
        return note;
    }

    get handle() {
        const event = new NDKEvent(window.ndk);
        event.kind = 30023;
        event.pubkey = this.authorPubkey;
        event.tags = [["d", this.dtag]];
        return event.encode();
    }

    get dtag() {
        return dtagFor(this.title);
    }

    toPlain() {
        return {
            id: this.id,
            private: this.private,
            title: this.private ? 'private' : this.title,
            content: this.originalContent,
            pubkey: this.authorPubkey,
            createdAt: this.createdAt,
        };
    }

    static async fromPlain(plain) {
        const note = new Note();
        note.id = plain.id;
        note.private = plain.private;
        note.authorPubkey = plain.pubkey;
        note.originalContent = plain.content;
        note.content = plain.content;
        note.title = plain.title;
        note.createdAt = plain.createdAt;
        note.onRelays = [];
        note.isStub = false;

        if (note.private) {
            const { title, content } = await decryptNote(note.content);
            note.title = title;
            note.content = content;
        }

        return note;
    }
}