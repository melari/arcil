import { dtagFor, draftDtagFor, handleFor, decryptSelf, encryptSelf } from "./common.js";
import { Relay } from "./relay.js";

export class NoteValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "NoteValidationError";
    }
}

// There are 3 types of Tagayasu notes, which can be in 5 different save states.
// They can be differentiated by a combination of their kind + the "private" tag.
//
// 1) Topic           (type: topic)   | kind: 30818         private: F  draft: F
// 2) Draft Topic     (type: topic)   | kind: 31234(30818)  private: F  draft: T
// 3) Article         (type: article) | kind: 30023         private: F  draft: F
// 4) Draft Article   (type: article) | kind: 31234(30023)  private: F  draft: T
// 5) Private Article (type: private) | kind: 31234(30023)  private: T  draft: T
export class Note {
    static TOPIC = 'topic';
    static ARTICLE = 'article';
    static PRIVATE = 'private';

    static DRAFT_KIND = 31234;
    static ARTICLE_KIND = 30023;
    static TOPIC_KIND = 30818;
    static ALL_KINDS = [
        Note.DRAFT_KIND,
        Note.ARTICLE_KIND,
        Note.TOPIC_KIND,
    ];
    static SOME_KIND = Note.ARTICLE_KIND;

    static async fromNostrEvent(event) {
        const nostrEvent =
            event.kind === Note.DRAFT_KIND
                ? JSON.parse(await decryptSelf(event.content))
                : event.rawEvent();

        const note = new Note();
        note.id = nostrEvent.id;
        note.nostrEvent = nostrEvent;
        note.title = nostrEvent.tags.find(t => t[0] == "title")[1];
        note.content = nostrEvent.content;
        note.authorPubkey = nostrEvent.pubkey;
        note.createdAt = nostrEvent.created_at ?? event.created_at;
        note.onRelays = [];

        const hasPrivateTag = !!(nostrEvent.tags.find(t => t[0] == "private")?.[1]);
        note.draft   = event.kind === Note.DRAFT_KIND;
        note.private = event.kind === Note.DRAFT_KIND && hasPrivateTag;
        note.kind = nostrEvent.kind;

        note.validate();
        return note;
    }

    static fromContent(type, title, content) {
        const note = new Note();
        note.title = title;
        note.content = content;
        note.onRelays = [];
        note.draft = false;
        note.private = false;

        if (type === Note.ARTICLE) {
            note.kind = Note.ARTICLE_KIND;
        } else if (type === Note.TOPIC) {
            note.kind = Note.TOPIC_KIND;
        } else if (type === Note.PRIVATE) {
            note.kind = Note.ARTICLE_KIND;
            note.private = true;
            note.draft = true;
        }

        note.validate();
        return note;
    }

    get type() {
        this.validate();
        if (this.kind === Note.TOPIC_KIND) { return Note.TOPIC; }
        if (this.private) { return Note.PRIVATE; }
        return Note.ARTICLE;
    }

    validate() {
        if (!this.title || this.title === '') {
            throw new NoteValidationError("Must have a title");
        }

        if (![Note.TOPIC_KIND, Note.ARTICLE_KIND].includes(this.kind)) {
            throw new NoteValidationError("Note must be one of TOPIC or ARTICLE");
        }

        if (this.kind === Note.TOPIC_KIND && this.private) {
            throw new NoteValidationError("Note may not be TOPIC and PRIVATE");
        }

        if (this.private && !this.draft) {
            throw new NoteValidationError("Private notes may only be drafts");
        }
    }

    // Applies an update to the note.
    // opts is an object with optional keys for:
    // title, private, content
    // Any excluded key will not be modified
    // Any update will bump the createdAt timestamp to the current time.
    update(opts) {
        this.title = opts.title ?? this.title;
        this.private = opts.private ?? this.private;
        this.draft = opts.draft ?? this.draft;
        this.kind = opts.kind ?? this.kind;
        this.content = opts.content ?? this.content;
        this.createdAt = Math.floor(Date.now() / 1000);

        this.validate();
    }

    // Fully Qualified Identifier
    get handle() {
        return handleFor(this.kind, this.title, this.authorPubkey);
    }

    // Identifier with author assumed
    get databaseId() {
        return `${this.kind}:${this.dtag}`;
    }

    // Identifier with author AND kind assumed
    get dtag() {
        return dtagFor(this.title);
    }

    get draftDtag() {
        return draftDtagFor(this.title);
    }

    toPlain() {
        return {
            id: this.id,
            private: this.private,
            draft: this.draft,
            kind: this.kind,
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
        note.draft = plain.draft;
        note.kind = plain.kind;
        note.authorPubkey = plain.pubkey;
        note.content = plain.content;
        note.title = plain.title;
        note.createdAt = plain.createdAt;
        note.onRelays = [];

        note.validate();
        return note;
    }

    async toNostrEvent(extraTags = []) {
        this.validate();

        const tags = [
            ["d", this.dtag],
            ["title", this.title],
            ["published_at", this.createdAt.toString()],
            ...(this.private ? [["private", "true"]] : []),
            ...extraTags,
        ];
        const publicEvent = Relay.instance.buildEvent(this.kind, this.content, tags, this.authorPubkey);

        if (this.private || this.draft) {
            const payload = await encryptSelf(JSON.stringify(publicEvent.rawEvent()));
            const wrapperTags = [
                ['d', this.draftDtag],
                ['k', this.kind.toString()],
            ];
            return Relay.instance.buildEvent(Note.DRAFT_KIND, payload, wrapperTags, this.authorPubkey);
        } else {
            return publicEvent;
        }
    }
}
