import { dtagFor, handleFor, decryptNote } from "./common.js";

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

        if (note.private) {
            const { title, content } = await decryptNote(note.content);
            note.title = title;
            note.content = content;
        }

        return note;
    }

    static fromContent(title, content) {
        const note = new Note();
        note.title = title;
        note.content = content;
        note.originalContent = content;
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

        if (note.private) {
            const { title, content } = await decryptNote(note.content);
            note.title = title;
            note.content = content;
        }

        return note;
    }
}
