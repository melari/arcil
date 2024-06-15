const Trie = require("triever");
import { Note } from "./note.js";
import { Wallet } from "./wallet.js";

/**
 *  A local store of notes owned by the wallet-connected user.
 *  LocalStorage is used to store the events between page loads as a simple backup
 *  if the notes are dropped by all relays.
 */
export class Database {
    notes = {};
    noteTitleTrie = new Trie();

    // Drafts are stored as a wrapper note with an encrypted note inside.
    // Therefore the ID of the wrapper note will not match the actual inner note
    // To support looking up a note by the wrapper ID, we keep a map of wrapper -> inner IDs
    draftIdMap = {};

    static instance = new Database();
    constructor() {
        if (!!Database.instance) { throw new Error('Use singleton instance'); }
    }

    getNote(id) {
        return this.notes[id] ?? this.notes[this.draftIdMap[id]];
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
        const note = await Note.fromNostrEvent(event);
        if (event.id !== note.id) { this.draftIdMap[event.id] = note.id; }
        this.addNote(note);
        this.pushStateToLocalStorage(window.nostrUser.npub);
        return note;
    }

    addNote(note) {
        if (this.notes[note.id]) { return; }

        this.notes[note.id] = note;
        note.title.split(" ").forEach(word =>
            this.noteTitleTrie.add(word.toLowerCase(), note.id)
        );

        Object.values(this.notes)
            .filter(n => n.dtag === note.dtag)
            .sort((a, b) => a.createdAt - b.createdAt)
            .slice(0, -1)
            .forEach(n => delete this.notes[n.id]);
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
