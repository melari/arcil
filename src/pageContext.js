import { filterFromId, npubToHexpubkey, dtagFor } from "./common.js";
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

    _dnslinkNpub = null;
    dnslinkNpub() {
        if (this._dnslinkNpub !== null) { return this._dnslinkNpub; }

        const npubFromDomain = window.router.dnslinkNpub;
        if (npubFromDomain === null || !npubFromDomain.startsWith('npub')) { this._dnslinkNpub = ''; }
        else { this._dnslinkNpub = npubFromDomain; }
        return this._dnslinkNpub;
    }

    dnslinkHexpubkey() {
        const npub = this.dnslinkNpub();
        return npub && npubToHexpubkey(npub);
    }

    /**
     * Handles several scenarios:
     * - If the URL has a naddr, filter to that note by ID
     * - If the URL has a plaintext title, filter to that note based on domain
     * - If the URL has a plaintext title and there is no domain, return null
     * - If the URL is empty, try to filter to the homepage based on domain
     * - If the URL is empty and there is no domain, return null
     */
    async noteFilterFromUrl() {
        const hexpubkey = this.dnslinkHexpubkey();
        const explicitIdentifier = this.noteIdentifierFromUrl();
        if (!explicitIdentifier && !hexpubkey) { return null; }
        if (!explicitIdentifier) {
            return {
                authors: [hexpubkey],
                kinds: [30023],
                "#d": [dtagFor("homepage")]
            };
        }

        const potentialFilter = filterFromId(explicitIdentifier);
        if (!potentialFilter.kinds) { potentialFilter.kinds = [30023]; }
        if (!!potentialFilter["#d"]) { return potentialFilter; }
        if (!hexpubkey) { return null; }

        return {
            authors: [hexpubkey],
            kinds: [30023],
            "#d": [dtagFor(potentialFilter.ids[0].replace(/-/g, ' '))]
        };
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
