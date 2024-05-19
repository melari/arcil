import { handleFor, delay, ensureConnected, ensureReadonlyConnected, toggleConnect, dtagFor, atagFor, encryptNote } from "./common.js"
import { showPending, showError, showNotice, ERROR_EVENT, NOTICE_EVENT, PENDING_EVENT } from "./error.js"
import { startNostrMonitoring } from "./nostr.js";
import { Database } from "./database.js";
import { Relay } from "./relay.js";
import { Note } from "./note.js";

const INTRO_TEXT = "# Welcome to Tagayasu\n\nThis is the note editor, where you can create and edit your content.\n\nTo publish a note, make sure to enter a title below, then click `Publish`!";

$(window).on('DOMContentLoaded', async function () {
    createMDE();
    startNostrMonitoring();

    window.router = await (new Router().route());
    if (window.router.isEditorDomain) {
        $("#browser-navbar").show();
    } else {
        $("#custom-domain-row").show();
        $("#custom-domain").html(window.location.hostname);
    }
    $("#page-" + window.router.pageName).show();

    await window.trySeamlessConnection().catch(() => { });

    if (window.router.pageName == "editor") {
        window.loadNote();
    } else if (window.router.pageName == "browser") {
        window.browseNoteFromUrl();
    }

    startAutoSave();
});

function startAutoSave() {
    setInterval(() => {
        localStorage.setItem('autosave', JSON.stringify({
            title: $("#note-title").val(),
            content: window.MDEditor.value()
        }));
    }, 1000 * 1);
}

function restoreAutoSave() {
    const autosave = localStorage.getItem('autosave');
    if (!autosave) { return; }

    const parsed = JSON.parse(autosave);
    newNote(parsed.title, parsed.content);
}

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

    const subscription = await Relay.instance.subscribe(filter, async (e) => {
        await Database.instance.addFromNostrEvent(e);
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
                const note = Database.instance.notes[eventId];
                if (note && !note.onRelays.includes(relay)) {
                    note.onRelays.push(relay);
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
        if (!!localStorage.getItem('autosave')) { return restoreAutoSave(); }
        else if (!!window.nip07signer) { return showMyNotes(); }
        else { return newNote('', INTRO_TEXT); }
    }

    ensureConnected().then(async () => {
        const filter = PageContext.instance.noteFilterFromUrl();
        Relay.instance.fetchEvent(filter).then(async (event) => {
            if (!!event) {
                if (event.pubkey == window.nostrUser.hexpubkey) {
                    await Database.instance.addFromNostrEvent(event);
                    editNote(event.id);
                }
            } else if (filter["#d"] && filter["#d"][0].startsWith("tagayasu-")) { // editing a non-existant note, prepoluate fields based on the title param present
                const title = PageContext.instance.noteTitleFromUrl();
                newNote(title, `# ${title}`);
            }
        });
    });
}
window.loadNote = loadNote;

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
    if (!Database.instance.hasSearchableEntries()) {
        $("#notes-list").html("<div class='col-lg-12'>Looks like you don't have any notes yet.<br />Click \"new note\" to start your digital garden! 🌱</div>");
        return;
    }

    let notesListContent = "";
    window.tooltipList.forEach(tooltip => tooltip.dispose());

    const sorted = Database.instance.search($("#note-search-box").val().toLowerCase().split(" ").filter(x => !!x));

    let notesDisplayed = 0;
    sorted.forEach(function (noteId) {
        const note = Database.instance.notes[noteId];
        if (!note) { return; }
        if (notesDisplayed > 20) { return; }
        let noteRelays = "";
        for (const relay of note.onRelays) {
            const color = colorForRelay(relay.url);
            noteRelays += `<div class="relay-indicator" style="background-color:#${color}" data-bs-toggle="tooltip" data-bs-title="${relay.url}">&nbsp;</div>`;
        }
        const privateIndicator = note.private ? "<i class='fa fa-solid fa-eye-slash'></i>" : "<i class='fa fa-cookie' style='width:16px'></i>";
        notesListContent += "<button class='list-group-item list-group-item-action note-list-button' onclick=\"editNote('" + note.id + "')\"><div>" + privateIndicator + "&nbsp;" + note.title + "</div><div>" + noteRelays + "</div></button>";
        notesDisplayed++;
    });

    $("#notes-list").html(notesListContent);
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    window.tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}
window.searchNotes = searchNotes;
window.tooltipList = [];

async function editNote(noteId) {
    PageContext.instance.setNote(Database.instance.notes[noteId]);
}
window.editNote = editNote

function newNote(title = "", content = "") {
    if (!!window.notesModal) { window.notesModal.hide(); }
    PageContext.instance.setNote(Note.fromContent(title, content));
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

        const noteId = PageContext.instance.note.id;

        // Save a new version with removed content to encourage clients not to show old versions of the note
        // Then, publish a kind-5 delete request to purge the event entirely
        window.MDEditor.value('');
        publishNote('Your note has been deleted').then(() => {
            $("#note-title").val("");
            Relay.instance.del(noteId);
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

        const tags = [
            ["d", dtagFor(title)],
            ["title", title],
            ["published_at", Math.floor(Date.now() / 1000).toString()]
        ];
        MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function (backref) {
            tags.push(["a", backref]);
        });

        return Relay.instance.publish(30023, window.MDEditor.value(), tags).then(async (saveEvent) => {
            showNotice(message);
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        });
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

        const content = await encryptNote(title, window.MDEditor.value());
        const tags = [
            ["d", dtagFor(title)],
            ["title", "DRAFT"],
            ["private", "true"],
            ["published_at", Math.floor(Date.now() / 1000).toString()]
        ]
        Relay.instance.publish(30023, content, tags).then(async (saveEvent) => {
            showNotice("Your note has been saved privately.");
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}
window.savePrivateNote = savePrivateNote;

async function viewPublishedNote() {
    window.location.href = window.router.urlFor(Router.BROWSER, PageContext.instance.note.handle);
}
window.viewPublishedNote = viewPublishedNote

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    $("#help-npub").html(window.nostrUser.npub);
});

window.addEventListener(Wallet.WALLET_CONNECTION_CHANGED, function(e) {
    renderConnectButtons({ hover: false });
    updateOwnerOnly();
});

window.addEventListener(PageContext.NOTE_IN_FOCUS_CHANGED, async function(e) {
    updateOwnerOnly();

    // browser
    const note = PageContext.instance.note;
    const renderedContent = MarkdownRenderer.instance.renderHtml(note.content);
    const html = note.private ? `<div style="font-weight:bold; text-align: center; color: #aa0000">⚠️ This note is private and cannot be viewed by others.</div>${renderedContent}` : renderedContent;
    $("#note-content").html(html);
    renderDynamicContent();
    loadBackrefs();

    // editor
    window.MDEditor.value(note.content);
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

async function uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    document.body.appendChild(input);

    return new Promise((resolve, reject) => {
        ensureConnected().then(() => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onloadend = async () => {
                    const blob = new Blob([reader.result], { type: file.type });
                    const hash = await Blossom.instance.uploadFile(blob, window.nostrUser.hexpubkey);
                    resolve(hash);
                }

                if (file) {
                    reader.readAsArrayBuffer(file);
                } else {
                    reject('no file selected');
                }
            });

            input.click();
        });
    });
}

function createMDE() {
    if (!!window.MDEditor) { window.MDEditor.toTextArea(); }

    const test = {
        name: "imageUpload",
        className: "fa fa-upload",
        title: "Upload image",
        action: async (editor) => {
            const hash = await uploadFile();
            editor.codemirror.replaceSelection(`![](#blossom-src "blossom://${hash}")`);
        }
    };

    window.MDEditor = new SimpleMDE({
        toolbar: $(window).width() >= 750
            ? ["bold", "italic", "strikethrough", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "horizontal-rule", "|", "preview", "side-by-side", "fullscreen", "|", "guide", test]
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
        !PageContext.instance.note.authorPubkey ||
        PageContext.instance.note.authorPubkey == window.nostrUser?.hexpubkey
    ) {
        $(".owner-only").show();
    } else {
        $(".owner-only").hide();
    }
}

async function loadBackrefs() {
    if (window.router.pageName !== Router.BROWSER) { return; }

    await ensureReadonlyConnected();

    hideBackrefs();
    $("#backref-content").empty();

    const hexpubkey = PageContext.instance.note.nostrEvent?.pubkey ?? PageContext.instance.dnslinkHexpubkey();
    const title = PageContext.instance.note.nostrEvent?.tags.find(t => t[0] === 'title')[1] ?? PageContext.instance.note.title;
    if (!hexpubkey || !title) { return; }

    const filters = {
        authors: [hexpubkey],
        kinds: [30023],
        "#a": [atagFor(title, hexpubkey)]
    };
    Relay.instance.fetchEvents(filters, (events) => {
        events.forEach(function(event) {
            const title = event.tags.find(t => t[0] == "title")[1];
            const handle = handleFor(title, event.pubkey);
            $("#backref-content").append(`<li><a title='${handle}' href='#tagayasu-prefetch'>${title}</a></li>`)
            showBackrefs();
        });
        renderDynamicContent();
    });
}

function hideBackrefs() {
    $("#backref-container").hide();
}

function showBackrefs() {
    $("#backref-container").show();
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
