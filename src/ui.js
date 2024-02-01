import { ensureConnected, ensureReadonlyConnected, toggleConnect, dtagFor, atagFor, encryptSelf, decryptSelf } from "./common.js"
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { showError, showNotice, ERROR_EVENT, NOTICE_EVENT } from "./error.js"
import { startNostrMonitoring } from "./nostr.js";
const Trie = require("triever");

const INTRO_TEXT = "# Welcome to Tagayasu\n\nThis is the note editor, where you can create and edit your content.\n\nTo publish a note, make sure to enter a title below, then click `Publish`!";

window.noteTitleTrie = new Trie();
window.notes = {};

$(window).on('load', async function() {
    createMDE();
    startNostrMonitoring();

    window.router = await new Router().route();
    $("#page-" + window.router.pageName).show();

    await window.trySeamlessConnection().catch(() => { });

    if (window.router.pageName == "editor") {
        window.loadNote();
    } else if (window.router.pageName == "browser") {
        window.browseNote();
    }
});

// Connect UI button
function connectWalletApp() {
    toggleConnect().then(() => {
        if (window.nip07signer && window.router.pageName === Router.EDITOR) { showMyNotes(); }
    })
}
window.connectWalletApp = connectWalletApp;

function showMyNotes() {
    $("#notes-list").empty();
    ensureConnected().then(() => {
        window.notesModal = new bootstrap.Modal('#myNotesModal', {});
        window.notesModal.show();
        $("#note-search-box").focus();
        fetchNotes();
    })
}
window.showMyNotes = showMyNotes;

function showPublishModal() {
    window.publishModal = new bootstrap.Modal('#publish-modal', {});
    window.publishModal.show();
}
window.showPublishModal = showPublishModal;

function fetchNotes() {
    noteTitleTrie = new Trie(); // This is a full reload, so we empty out the existing index.
    notes = {};

    const filter = { authors: [window.nostrUser.hexpubkey], kinds: [30023] }
    window.ndk.fetchEvents(filter).then(function (eventSet) {
        eventSet.forEach(function (e) { saveNoteToDatabase(e); });
        searchNotes(); // trigger a search to generate the initial display
    }).catch((error) => showError(error.message));
}

// Load the note into the editor given by params
function loadNote() {
    if (!PageContext.instance.noteIdentifierFromUrl()) {
        if (!!window.nip07signer) { return showMyNotes(); }
        else { return newNote(INTRO_TEXT); }
    }

    ensureConnected().then(() => {
        const filter = PageContext.instance.noteFilterFromUrl();
        window.ndk.fetchEvent(filter).then(function (event) {
            if (!!event) {
                if (event.pubkey == window.nostrUser.hexpubkey) {
                    saveNoteToDatabase(event);
                    editNote(event.id);
                }
            } else if (filter["#d"] && filter["#d"][0].startsWith("tagayasu-")) { // editing a non-existant note, prepoluate fields based on nattr d-tag if present
                const title = filter["#d"][0].slice(9).split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                window.MDEditor.value(`# ${title}`);
                $("#note-title").val(title);
            }
        });
    });
}
window.loadNote = loadNote;

function saveNoteToDatabase(event) {
    const note = Note.fromNostrEvent(event);
    notes[event.id] = note;
    note.title.split(" ").forEach(function (word) {
        noteTitleTrie.add(word.toLowerCase(), event.id);
    });
}

function searchNotes() {
    // If the trie is empty
    if (Object.keys(window.noteTitleTrie._childPaths).length === 0) {
        $("#notes-list").html("<div class='col-lg-12'>Looks like you don't have any notes yet.<br />Click \"new note\" to start your digital garden! 🌱</div>");
        return;
    }

    $("#notes-list").empty();
    const uniqueNotes = new Set();
    $("#note-search-box").val().toLowerCase().split(" ").forEach(function (searchWord) {
        const searchResults = noteTitleTrie.getData(searchWord);
        if (!!searchResults) {
            searchResults.forEach(function (noteId) {
                uniqueNotes.add(noteId);
            });
        }
    });

    let notesDisplayed = 0;
    uniqueNotes.forEach(function (noteId) {
        const note = window.notes[noteId];
        if (notesDisplayed > 20) { return; }
        $("#notes-list").append("<button class='list-group-item list-group-item-action' onclick=\"editNote('" + note.id + "')\">" + note.title + "</button>");
        notesDisplayed++;
    });
}
window.searchNotes = searchNotes;

async function editNote(noteId) {
    PageContext.instance.setNote(window.notes[noteId]);
}
window.editNote = editNote

function newNote(content = "") {
    if (!!window.notesModal) { window.notesModal.hide(); }
    window.MDEditor.value(content);
    $("#note-title").val("");
    PageContext.instance.setNoteByAuthorPubkey(PageContext.instance.note.authorPubkey);
}
window.newNote = newNote;

function saveNote() {
    if (!!window.publishModal) { window.publishModal.hide(); }
    ensureConnected().then(() => {
        const title = $("#note-title").val();
        if (dtagFor(title) == "tagayasu-") {
            showError("Title cannot be empty");
            return;
        }

        const saveEvent = new NDKEvent(window.ndk);
        saveEvent.kind = 30023;
        saveEvent.content = window.MDEditor.value();
        saveEvent.tags = [
            ["d", dtagFor(title)],
            ["title", title],
            ["published_at", Math.floor(Date.now() / 1000).toString()]
        ]
        MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function (backref) {
            saveEvent.tags.push(["a", backref]);
        });
        console.log(saveEvent);
        saveEvent.publish().then(function (x) {
            showNotice("Your note has been published!");
            PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}
window.saveNote = saveNote;

function savePrivateNote() {
    if (!!window.publishModal) { window.publishModal.hide(); }
    ensureConnected().then(async () => {
        const title = $("#note-title").val();
        if (dtagFor(title) == "tagayasu-") {
            showError("Title cannot be empty");
            return;
        }

        const saveEvent = new NDKEvent(window.ndk);
        saveEvent.kind = 30023;
        saveEvent.content = await encryptSelf(window.MDEditor.value());
        saveEvent.tags = [
            ["d", dtagFor(title)],
            ["title", title],
            ["private", "true"],
            ["published_at", Math.floor(Date.now() / 1000).toString()]
        ]
        saveEvent.publish().then(function (x) {
            showNotice("Your note has been saved privately.");
            PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}
window.savePrivateNote = savePrivateNote;

function viewPublishedNote() {
    window.location.href = window.router.urlFor(Router.BROWSER, PageContext.instance.note.handle);
}
window.viewPublishedNote = viewPublishedNote

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    $("#help-npub").html(window.nostrUser.npub);
    if (window.router.pageName == Router.EDITOR) {
        PageContext.instance.setNoteByAuthorPubkey(window.nostrUser.hexpubkey);
    }
});

window.addEventListener(Wallet.WALLET_CONNECTION_CHANGED, function(e) {
    renderConnectButtons({ hover: false });
    updateOwnerOnly();
});

window.addEventListener(PageContext.NOTE_IN_FOCUS_CHANGED, async function(e) {
    updateOwnerOnly();

    const note = PageContext.instance.note;
    if (note.nostrEvent) {
        if (note.private) { // if the private tag is present, it means the content is encrypted
            $("#note-content").html(MarkdownRenderer.instance.renderHtml(await decryptSelf(note.content)))
            window.MDEditor.value(await decryptSelf(note.content));
          } else {
            $("#note-content").html(MarkdownRenderer.instance.renderHtml(note.content));
            window.MDEditor.value(note.content);
          }
          loadBackrefs();
    } else {
        $("#note-content").html("<center><h3>note not found!</h3>Either this version of the note no longer exists or it's on a different nostr relay.");
    }

    if (!!window.notesModal) { window.notesModal.hide(); }
    $("#note-title").val(note.title);
});

$('#myNotesModal').on('shown.bs.modal', function () {
    $('#note-search-box').focus();
});

$(".connect-wallet").mouseenter(function() {
    renderConnectButtons({ hover: true });
});
$(".connect-wallet").mouseleave(function() {
    renderConnectButtons({ hover: false });
});

function createMDE() {
    if (!!window.MDEditor) { window.MDEditor.toTextArea(); }
    window.MDEditor = new SimpleMDE({
        toolbar: $(window).width() >= 750
            ? ["bold", "italic", "strikethrough", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "horizontal-rule", "|", "preview", "side-by-side", "fullscreen", "|", "guide"]
            : ["bold", "italic", "heading", "|", "link", "image", "|", "preview", "guide"],
        spellChecker: Preferences.instance.current.spellCheckEnabled,
        renderingConfig: {
            codeSyntaxHighlighting: true
        },
        tabSize: 2,
        previewRender: MarkdownRenderer.instance.renderHtml
    });
}

function renderConnectButtons({ hover }) {
    $(".connect-wallet").each(function(_i, _obj) {
      $(this).width("auto");
      if (!window.nip07signer) { return; } // Only show disconnect hover text if connected
      const width = $(this).width();
      $(this).text(hover ? "🔴 Disconnect" : npubPreview());
      $(this).width(hover ? `${width}px` : "auto");
    });
}

function npubPreview() {
    if (!window.nostrUser) { return "Connect"; }
    return window.nostrUser.npub.slice(0,8) + "…" + window.nostrUser.npub.slice(59,63);
}

function updateOwnerOnly() {
    if (
        !!PageContext.instance.note.authorPubkey &&
        !!window.nostrUser &&
        PageContext.instance.note.authorPubkey == window.nostrUser.hexpubkey
    ) {
        $(".owner-only").show();
    } else {
        $(".owner-only").hide();
    }
}

async function loadBackrefs() {
    if (window.router.pageName !== Router.BROWSER) { return; }

    await ensureReadonlyConnected();

    $("#backref-content").empty();

    const filters = {
        authors: [PageContext.instance.note.nostrEvent.pubkey],
        kinds: [30023],
        "#a": [atagFor(PageContext.instance.note.nostrEvent.tags.find(t => t[0] == "title")[1], PageContext.instance.note.nostrEvent.pubkey)]
    };
    window.ndk.fetchEvents(filters).then(function(events) {
        events.forEach(function(event) {
        const href = window.router.urlFor(Router.BROWSER, event.encode());
        const title = event.tags.find(t => t[0] == "title")[1];
        $("#backref-content").append(`<li><a href='${href}'>${title}</a></li>`)
        });
    });
}

window.addEventListener(ERROR_EVENT, function (e) {
    $("#toast").removeClass("text-bg-success");
    $("#toast").addClass("text-bg-danger");
    showToast(e.detail.message);
})

window.addEventListener(NOTICE_EVENT, function (e) {
    $("#toast").removeClass("text-bg-danger");
    $("#toast").addClass("text-bg-success");
    showToast(e.detail.message);
})

function showToast(content) {
    $("#toast-content").html(content);
    window.toast = bootstrap.Toast.getOrCreateInstance(document.getElementById('toast'));
    toast.show();
}

$("#toast").on("click", function () {
    if (!!window.toast) { window.toast.hide(); }
});

window.addEventListener(Preferences.PREFERENCES_CHANGED_EVENT, function (e) {
    createMDE();
});