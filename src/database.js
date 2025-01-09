const Trie = require("triever");
import { Note, NoteValidationError } from "./note.js";
import { Wallet } from "./wallet.js";

/**
 *  A local store of notes owned by the wallet-connected user.
 *  LocalStorage is used to store the events between page loads as a simple backup
 *  if the notes are dropped by all relays.
 */
export class Database {
    // Map of databaseId => Note class
    // The primary key is given by Note.databaseId and contains type & dtag
    notes = {};
    noteTitleTrie = new Trie();

    // A secondary key mapping nostr event IDs to note primary keys
    // Draft IDs will also point to their inner note databaseId
    nostrIdMap = {};

    static instance = new Database();
    constructor() {
        if (!!Database.instance) { throw new Error('Use singleton instance'); }
    }

    getNoteByPrimaryId(id) {
        return this.notes[id];
    }

    getNoteByNostrId(id) {
        return this.notes[this.nostrIdMap[id]];
    }

    clear() {
        this.notes = {};
        this.noteTitleTrie = new Trie();
    }

    hasSearchableEntries() {
        return Object.keys(this.noteTitleTrie._childPaths).length !== 0;
    }

    search(wordList) {
        const uniqueNotes = new Set();
        (wordList.length > 0 ? wordList : ['']).forEach(word => {
            const searchResults = this.noteTitleTrie.getData(word);
            if (!!searchResults) {
                searchResults.forEach(noteId => uniqueNotes.add(noteId));
            }
        });

        return Array.from(uniqueNotes)
            .filter((note) => this.notes[note]?.content != "")
            .sort((a, b) =>
                (this.notes[b]?.createdAt ?? 0) - (this.notes[a]?.createdAt ?? 0)
            );
    }

    async addFromNostrEvent(event) {
        try {
            const note = await Note.fromNostrEvent(event);
            if (event.id !== note.id) { this.nostrIdMap[event.id] = note.databaseId; }
            if (!note.altIds.includes(event.id)) { note.altIds.push(event.id); }
            this.addNote(note);
            this.pushStateToLocalStorage(window.nostrUser.npub);
            return note;
        } catch(e) {
            if (e instanceof NoteValidationError) {
                console.warn("Discarding event because it failed validation", { 
                  reason: e.message,
                  event
                });
                return null;
            } else if (e.message === "Malformed UTF-8 data") {
              console.warn("Discarding event because it could not be decrypted (malformed)");
              return null;
            } else {
                throw e;
            }
        }
    }

    deleteNote(noteId) {
        if (!this.notes[noteId]) { return; }
        delete this.notes[noteId];
        this.pushStateToLocalStorage(window.nostrUser.npub);
    }

    addNote(note) {
        if (note.id) { this.nostrIdMap[note.id] = note.databaseId; }

        const existing = this.notes[note.databaseId];

        if (!existing) {
            note.title.split(" ").forEach(word =>
                this.noteTitleTrie.add(word.toLowerCase(), note.databaseId)
            );
        }

        if (!existing || note.createdAt >= existing.createdAt) {
            this.notes[note.databaseId] = note;
        }
    }

    pushStateToLocalStorage(userId) {
        const state = {
            notes: Object.values(this.notes).map(note => note.toPlain()),
        };

        localStorage.setItem(`database-${userId}`, JSON.stringify(state));
    }

    async pullStateFromLocalStorage(userId) {
        const state = JSON.parse(localStorage.getItem(`database-${userId}`));
        if (!state) { return; }

        return Promise.all(state.notes.map(async note =>
            this.addNote(await Note.fromPlain(note))
        ));
    }
}
window.Database = Database;

window.addEventListener(Wallet.WALLET_DISCONNECTED_EVENT, function (e) {
    Database.instance.clear();
});

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function (e) {
    Database.instance.pullStateFromLocalStorage(window.nostrUser.npub);
});
