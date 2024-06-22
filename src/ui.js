import { handleFor, delay, ensureConnected, ensureReadonlyConnected, toggleConnect, dtagFor, atagFor, encryptSelf } from "./common.js"
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
function connectWallet() {
    toggleConnect().then(() => {
        if (window.nip07signer && window.router.pageName === Router.EDITOR) { showMyNotes(); }
    })
}
window.connectWallet = connectWallet;

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

function showSettings() {
    window.settingsModal = new bootstrap.Modal('#settingsModal', {});
    window.settingsModal.show();
}
window.showSettings = showSettings;

function openSettings(pageName) {
    $('.settings-list-item').removeClass('active');
    $(`#settings-${pageName}`).addClass('active');
    $('.settings-page').hide();
    $(`#settings-page-${pageName}`).show();
}
window.openSettings = openSettings;

function showPublishModal() {
    window.publishModal = new bootstrap.Modal('#publish-modal', {});
    window.publishModal.show();
}
window.showPublishModal = showPublishModal;

async function fetchNotes() {
    searchNotes(); // show the notes we have in memory already, if any.
    const filter = { authors: [window.nostrUser.hexpubkey], kinds: [30023, 31234] }

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
                const note = Database.instance.getNote(eventId);
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
                    const note = await Database.instance.addFromNostrEvent(event);
                    editNote(note.id);
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
        const note = Database.instance.getNote(noteId);
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
    PageContext.instance.setNote(Database.instance.getNote(noteId));
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

        // If aggressiveDelete mode is enabled,
        // Save a new version with removed content to encourage clients not to show old versions of the note
        // Then, publish a kind-5 delete request to purge the event entirely
        window.MDEditor.value('');
        if (Preferences.instance.current.aggressiveDelete) {
            publishNote('Your note has been deleted').then(() => {
                $("#note-title").val("");
                Relay.instance.del(noteId);
            });
        } else {
            $("#note-title").val("");
            Relay.instance.del(noteId);
        }
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
    return ensureConnected().then(async () => {
        const event = buildNoteFromEditor();
        return Relay.instance.publish(event).then(async (saveEvent) => {
            showNotice(message);
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        });
    });
}

function savePrivateNote() {
    showPending("Encrypting and saving...");
    if (!!window.publishModal) { window.publishModal.hide(); }
    ensureConnected().then(async () => {
        const event = buildNoteFromEditor();
        const payload = await encryptSelf(JSON.stringify(event.rawEvent()));
        const tags = [
            ['d', event.tags.find((t) => t[0] === 'd')[1]],
            ['k', event.kind.toString()],
        ];
        const draftEvent = Relay.instance.buildEvent(31234, payload, tags);
        Relay.instance.publish(draftEvent).then(async (saveEvent) => {
            showNotice("Your note has been saved privately.");
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}
window.savePrivateNote = savePrivateNote;

function buildNoteFromEditor() {
    const title = $("#note-title").val();
    const dtag = dtagFor(title);
    if (dtag == "tagayasu-") {
        showError("Title cannot be empty");
        return;
    }

    const kind = 30023;
    const content = window.MDEditor.value();
    const tags = [
        ["d", dtag],
        ["title", title],
        ["published_at", Math.floor(Date.now() / 1000).toString()]
    ];

    MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function (backref) {
        tags.push(["a", backref]);
    });

    return Relay.instance.buildEvent(kind, content, tags);
}

async function viewPublishedNote() {
    window.location.href = window.router.urlFor(Router.BROWSER, PageContext.instance.note.handle);
}
window.viewPublishedNote = viewPublishedNote

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    setAvatarOnConnected();
});

window.addEventListener(Wallet.WALLET_CONNECTION_CHANGED, function(e) {
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
                    const result = await Blossom.instance.uploadFile(blob, window.nostrUser.hexpubkey);
                    resolve(result);
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
            const result = await uploadFile();
            editor.codemirror.replaceSelection(`![](${result.downloadUrls[0]} "blossom://${result.hash}")`);
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

async function setAvatarOnConnected() {
    $(".connect-wallet").each(function(_i, _obj) {
        $(this).hide();
    });

    $(".avatar").each(function(_i, _obj) {
        $(this).show();
        $(this).html(`<i class="fa fa-user"></i>`);
    });
    $(".npub").each(function(_i, _obj) {
        $(this).text(window.nostrUser.npub);
    });

    const profile = await window.ndk.activeUser.fetchProfile();
    const url = profile?.image;
    if (url) {
      $(".avatar").each(function(_i, _obj) {
        $(this).html(`<img src='${url}' />`);
      });
    }

    const name=profile?.name
    if (name) {
      $(".username").each(function(_i, _obj) {
          $(this).text(name);
      });
    }
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
        kinds: [30023, 31234],
        "#a": [atagFor(title, hexpubkey)]
    };
    Relay.instance.fetchEvents(filters).then((events) => {
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
    const prefs = Preferences.instance.current;
    $('#editor-prefs-spellcheck')[0].checked = prefs.spellCheckEnabled;
    $('#editor-prefs-aggressive-delete')[0].checked = prefs.aggressiveDelete;
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

function savePreferences() {
    Preferences.instance.set({
        spellCheckEnabled: $('#editor-prefs-spellcheck')[0].checked,
        aggressiveDelete: $('#editor-prefs-aggressive-delete')[0].checked,
    });
}
window.savePreferences = savePreferences;
