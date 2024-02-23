import { delay, ensureConnected, ensureReadonlyConnected, toggleConnect, dtagFor, atagFor, encryptSelf, decryptSelf } from "./common.js"
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { showPending, showError, showNotice, ERROR_EVENT, NOTICE_EVENT, PENDING_EVENT } from "./error.js"
import { startNostrMonitoring } from "./nostr.js";
const Trie = require("triever");

const INTRO_TEXT = "# Welcome to Tagayasu\n\nThis is the note editor, where you can create and edit your content.\n\nTo publish a note, make sure to enter a title below, then click `Publish`!";

window.noteTitleTrie = new Trie();
window.notes = {};

$(window).on('DOMContentLoaded', async function () {
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

async function fetchNotes() {
    searchNotes(); // show the notes we have in memory already, if any.
    const filter = { authors: [window.nostrUser.hexpubkey], kinds: [30023] }

    const subscription = await window.ndk.subscribe(filter, { closeOnEose: true });
    subscription.on("event", (e) => {
        saveNoteToDatabase(e);
        searchNotes(); // trigger a search to update the UI
    });

    // Well keep the subscription around for 5 seconds after the last event is received,
    // or if no events are received, for 5 seconds after the subscription is created.
    const startAt = Date.now();
    while (
        Date.now() - startAt < 1000 * 5
        || (!!subscription.lastEventReceivedAt && Date.now() - subscription.lastEventReceivedAt < 1000 * 5)
    ) {
        let foundNew = false;
        subscription.eventsPerRelay.forEach((eventIds, relay) => {
            for (const eventId of eventIds) {
                if (notes[eventId] && !notes[eventId].onRelays.includes(relay)) {
                    notes[eventId].onRelays.push(relay);
                    foundNew = true;
                }
            }
        });
        if (foundNew) { searchNotes(); }
        await delay(100);
    }
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
    if (notes[event.id]) { return; }

    notes[event.id] = note;
    note.title.split(" ").forEach(function (word) {
        noteTitleTrie.add(word.toLowerCase(), event.id);
    });

    Object.values(notes)
        .filter(n => n.dtag === note.dtag)
        .sort((a, b) => a.nostrEvent.created_at - b.nostrEvent.created_at)
        .slice(0, -1)
        .forEach(n => delete notes[n.id]);
}

function colorForRelay(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const c = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
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

    const sorted = Array.from(uniqueNotes)
        .filter((note) => notes[note]?.content != "")
        .sort((a, b) =>
            (notes[b]?.nostrEvent.created_at ?? 0) - (notes[a]?.nostrEvent.created_at ?? 0)
        );

    window.tooltipList.forEach(tooltip => tooltip.dispose());

    let notesDisplayed = 0;
    sorted.forEach(function (noteId) {
        const note = window.notes[noteId];
        if (!note) { return; }
        if (notesDisplayed > 20) { return; }
        let noteRelays = "";
        for (const relay of note.onRelays) {
            const color = colorForRelay(relay.url);
            noteRelays += `<div class="relay-indicator" style="background-color:#${color}" data-bs-toggle="tooltip" data-bs-title="${relay.url}">&nbsp;</div>`;
        }
        const privateIndicator = note.private ? "<i class='fa fa-solid fa-eye-slash'></i>" : "<i class='fa fa-cookie' style='width:16px'></i>";
        $("#notes-list").append("<button class='list-group-item list-group-item-action note-list-button' onclick=\"editNote('" + note.id + "')\"><div>" + privateIndicator + "&nbsp;" + note.title + "</div><div>" + noteRelays + "</div></button>");
        notesDisplayed++;
    });

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    window.tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}
window.searchNotes = searchNotes;
window.tooltipList = [];

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

function deleteNote() {
    if (!PageContext.instance.note.id) {
        showNotice("Nothing to do! Note was never published.");
        return;
    }

    if (!!window.publishModal) { window.publishModal.hide(); }
    confirmAction("Are you sure you want to delete this note?").then(() => {
        showPending("Deleting...");

        // Delete the most recent version of the note
        const deleteEvent = new NDKEvent(window.ndk);
        deleteEvent.kind = 5;
        deleteEvent.content = "This note has been deleted";
        deleteEvent.tags = [
            ["e", PageContext.instance.note.id]
        ];
        deleteEvent.publish().then(() => {
        // Save a new version with removed content to encourage clients not to show old versions of the note
            window.MDEditor.value('');
            publishNote('Your note has been deleted').then(() => {
                $("#note-title").val("");
            });
        });
    });
}
window.deleteNote = deleteNote;

function saveNote() {
    if (!!window.publishModal) { window.publishModal.hide(); }
    if (!PageContext.instance.note.private) {
        showPending("Publishing...");
        publishNote("Your note has been published!");
    } else {
        confirmAction("This note is private. Are you sure you want to publish it?").then(() => {
            showPending("Publishing...");
            publishNote("Your draft has been converted to a public note!");
        });
    }
}
window.saveNote = saveNote;

async function publishNote(message) {
    return ensureConnected().then(() => {
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
        return saveEvent.publish().then(function (x) {
            showNotice(message);
            PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}

function savePrivateNote() {
    showPending("Encrypting and saving...");
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

window.addEventListener(Wallet.WALLET_DISCONNECTED_EVENT, function (e) {
    window.noteTitleTrie = new Trie();
    window.notes = {};
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
        previewRender: MarkdownRenderer.instance.renderHtml,
        styleSelectedText: false // This works around a bug in SimpleMDE where text cannot be selected on mobile
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
    $("#toast").removeClass("text-bg-secondary");
    $("#toast").addClass("text-bg-danger");
    showToast(e.detail.message);
})

window.addEventListener(NOTICE_EVENT, function (e) {
    $("#toast").removeClass("text-bg-danger");
    $("#toast").removeClass("text-bg-secondary");
    $("#toast").addClass("text-bg-success");
    showToast(e.detail.message);
})

window.addEventListener(PENDING_EVENT, function (e) {
    $("#toast").removeClass("text-bg-danger");
    $("#toast").removeClass("text-bg-success");
    $("#toast").addClass("text-bg-secondary");
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

function confirmAction(question) {
    return new Promise((resolve, reject) => {
        const modal = new bootstrap.Modal("#confirmActionModal", {});
        $("#confirmActionTitle").text(question);
        modal.show();

        const confirmActionYes = document.getElementById('confirmActionYes');
        confirmActionYes.addEventListener('click', function onYesClick() {
            confirmActionYes.removeEventListener('click', onYesClick);
            modal.hide();
            resolve("user confirmed the action");
        });

        modal._element.addEventListener('hidden.bs.modal', function onModalHidden() {
            modal._element.removeEventListener('hidden.bs.modal', onModalHidden);
            reject("user cancelled the action");
        });
    });
}
window.confirmAction = confirmAction;