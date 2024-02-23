import { NDKEvent } from "@nostr-dev-kit/ndk";
import { dtagFor, decryptNote } from "./common.js";

class Note {
    static async fromNostrEvent(event) {
        const note = new Note();
        note.id = event.id;
        note.nostrEvent = event;
        note.title = event.tags.find(t => t[0] == "title")[1];
        note.private = !!event.tags.find(t => t[0] == "private");
        note.content = event.content;
        note.authorPubkey = event.pubkey;
        note.onRelays = [];

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
}
window.Note = Note;