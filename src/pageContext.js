import { filterFromId } from "./common.js";
import { Note } from "./note.js";

class PageContext {
    static NOTE_IN_FOCUS_CHANGED = "note-in-focus-changed";
    static NADDR_PARAM_NAME = "n";

    static instance = new PageContext();
    constructor() {
        if (!!PageContext.instance) { throw new Error('Use singleton instance'); }
    }

    _note = new Note();
    get note() { return this._note; }
    setNote(note) { // note should be an instance of `Note`
        this._note = note;
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    async setNoteByNostrEvent(event) {
        this._note = await Note.fromNostrEvent(event);
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    setNoteByAuthorPubkey(authorPubkey) {
        if (authorPubkey && authorPubkey.startsWith("npub")) {
            throw new Error('Expected hexpubkey, got npub');
        }
        this._note = Note.fromHexPubkey(authorPubkey);
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    

    _dnslinkNpub = null;
    async dnslinkNpub() {
        if (this._dnslinkNpub !== null) { return this._dnslinkNpub; }

        const npubFromDomain = await DnsClient.instance.npub(window.location.hostname);
        if (npubFromDomain === null || !npubFromDomain.startsWith('npub')) { this._dnslinkNpub = ''; }
        else { this._dnslinkNpub = npubFromDomain; }
        return this._dnslinkNpub;
    }

    noteFilterFromUrl() {
        const filter = filterFromId(this.noteIdentifierFromUrl());
        if (!filter.kinds) { filter.kinds = [30023]; }
        return filter;
    }

    noteIdentifierFromUrl() {
        return this._urlParam(PageContext.NADDR_PARAM_NAME);
    }

    noteTitleFromUrl() {
        return this._urlParam("title");
    }

    _urlParam(name) {
        if (window.router.inlineParams[name]) { return window.router.inlineParams[name]; }
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null) {
          return null;
        }
        return decodeURI(results[1]) || 0;
    }
}
window.PageContext = PageContext;
