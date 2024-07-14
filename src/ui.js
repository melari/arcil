import { handleFor, delay, ensureConnected, ensureReadonlyConnected, toggleConnect, dtagFor, atagFor, naddrFor, encryptSelf } from "./common.js"
import { showPending, showError, showNotice, ERROR_EVENT, NOTICE_EVENT, PENDING_EVENT } from "./error.js"
import { startNostrMonitoring } from "./nostr.js";
import { Database } from "./database.js";
import { Relay } from "./relay.js";
import { Note } from "./note.js";
import { RelayConfig } from "./relay_config.js";

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
        loadNote();
        fetchNotes();
    } else if (window.router.pageName == "browser") {
        window.browseNoteFromUrl();
    }

    startAutoSave();
});

function startAutoSave() {
    setInterval(() => {
        if (!!PageContext.instance.note) {
          localStorage.setItem('autosave', JSON.stringify({
              type: PageContext.instance.note.type,
              title: PageContext.instance.note.title,
              content: window.MDEditor.value()
          }));
        }
    }, 1000 * 1);
}

function fetchAutoSave() {
    const autosave = localStorage.getItem('autosave');
    if (!autosave) { return; }
    return JSON.parse(autosave);
}

function restoreAutoSave() {
    const details = fetchAutoSave();
    newNote(details.type, details.title, details.content);
}

// Connect UI button
function connectWallet() {
    toggleConnect().then(() => {
        if (window.nip07signer && window.router.pageName === Router.EDITOR) { fetchNotes(); }
    })
}
window.connectWallet = connectWallet;

function showSettings() {
    window.settingsModal = new bootstrap.Modal('#settingsModal', {});
    window.settingsModal.show();
    renderRelays();
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
    if (!window.nostrUser?.hexpubkey) { return }
    const filter = { authors: [window.nostrUser.hexpubkey], kinds: Note.ALL_KINDS }

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
async function loadNote() {
    if (!PageContext.instance.noteIdentifierFromUrl()) {
        if (!!fetchAutoSave()?.content) { return restoreAutoSave(); }
        else { return newNote('topic', 'homepage', INTRO_TEXT); }
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
                newNote('topic', title, `# ${title}`);
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
        return;
    }

    let notesListContent = "";

    const sorted = Database.instance.search($("#note-search-box").val().toLowerCase().split(" ").filter(x => !!x));

    sorted.forEach(function (noteId) {
        const note = Database.instance.getNote(noteId);
        if (!note) { return; }
        const relayCount = note.onRelays.length;
        const health = relayCount >= 4
            ? 'health-good'
            : relayCount >= 2
            ? 'health-med'
            : 'health-bad';

        const noteType = note.type;
        const noteIcon = note.title === 'homepage'
            ? "<i class='fa fa-solid fa-home'></i>"
            : noteType === Note.PRIVATE
            ? "<i class='fa fa-solid fa-eye-slash'></i>"
            : noteType === Note.TOPIC
            ? "<i class='fa fa-leaf'></i>"
            : noteType === Note.ARTICLE
            ? "<i class='fa fa-bullhorn'></i>"
            : "<i class='fa fa-cookie' style='width:16px'></i>";

        const isDraftOnly = note.draft && !note.private;
        const preTitle = isDraftOnly ? '<i>draft: ' : '';
        const postTitle = isDraftOnly ? '</i>' : '';

        notesListContent += `
            <div class='${health} list-group-item list-group-item-action note-list-button' onclick="editNote('${note.id}')">
                <div class='note-list-title'>${noteIcon}&nbsp;${preTitle}${note.title}${postTitle}</div>
                <i id='note-more-${note.id}' class='fa fa-solid fa-gears note-more' onclick="showNoteOptions(event, '${note.id}'); return true;"></i>
                </div>
            </div>
        `;
    });

    $("#notes-list").html(notesListContent);
}
window.searchNotes = searchNotes;

function showNoteOptions(event, noteId) {
    const note = Database.instance.getNote(noteId);
    $('#noteDetailsTitle').text(note.title);

    const id = note.id;
    const idPreview = id.slice(0, 4) + "…" + id.slice(id.length-4, id.length) + " <i class='fa fa-copy'></i>";
    $('#noteDetailsId').html(idPreview);
    $('#noteDetailsId').data('id', id);
    $('#openRawEventLink').data('id', id);

    const naddr = naddrFor(note.kind, note.title, window.nostrUser.hexpubkey);
    const naddrPreview = naddr.slice(0,10) + "…" + naddr.slice(naddr.length-5, naddr.length) + " <i class='fa fa-copy'></i>";
    $('#noteDetailsNaddr').html(naddrPreview);
    $('#noteDetailsNaddr').data('naddr', naddr);

    $('#noteDetailsOpenInTagayasu a').attr('href', window.router.urlFor(Router.BROWSER, note.handle));

    $('#noteDetailsOpenInHabla').hide();
    $('#noteDetailsOpenInHighlighter').hide();
    $('#noteDetailsOpenInWikifreedia').hide();
  
    const noteType = note.type;
    if (noteType === Note.ARTICLE) {
        $('#noteDetailsOpenInHabla a').attr('href', `https://habla.news/a/${naddr}`);
        $('#noteDetailsOpenInHighlighter a').attr('href', `https://highlighter.com/a/${naddr}`);
        $('#noteDetailsOpenInHabla').show();
        $('#noteDetailsOpenInHighlighter').show();
    } else if (noteType === Note.TOPIC) {
        $('#noteDetailsOpenInWikifreedia a').attr('href', `https://wikifreedia.xyz/${note.dtag}/${window.nostrUser.npub}`);
        $('#noteDetailsOpenInWikifreedia').show();
    }

    $('#noteDetailsDelete').data('note-id', noteId);

    let relayDetails = '<ul>';
    note.onRelays.forEach(relay => {
        relayDetails += `<li>${relay.url}</li>`;
    });
    relayDetails += '</ul>';
    $('#noteDetailsRelays').html(relayDetails);

    const publishedAt = new Date(note.createdAt * 1000).toLocaleString();
    $('#noteDetailsDate').text(publishedAt);

    window.noteDetailsModal = new bootstrap.Modal('#note-details-modal', {});
    window.noteDetailsModal.show();
    if (!!event) { event.stopPropagation(); }
}
window.showNoteOptions = showNoteOptions;

function openRawEventModal() {
    if (!!window.noteDetailsModal) { window.noteDetailsModal.hide(); }
    const noteId = $('#openRawEventLink').data('id');
    const note = Database.instance.getNote(noteId);
    $('#raw-event').val(JSON.stringify(note.nostrEvent, null, 4));

    window.rawEventModal = new bootstrap.Modal('#raw-event-modal', {});
    window.rawEventModal.show();
}
window.openRawEventModal = openRawEventModal;

function showCurrentNoteOptions() {
    const noteId = PageContext.instance.note.id;
    if (noteId) { showNoteOptions(undefined, noteId); }
}
window.showCurrentNoteOptions = showCurrentNoteOptions;

function copyNaddr() {
    navigator.clipboard.writeText($('#noteDetailsNaddr').data('naddr'));
    showNotice('copied naddr to clipboard');
}
window.copyNaddr = copyNaddr;

function copyNoteId() {
    navigator.clipboard.writeText($('#noteDetailsId').data('id'));
    showNotice('copied ID to clipboard');
}
window.copyNoteId = copyNoteId;

async function editNote(noteId) {
    PageContext.instance.setNote(Database.instance.getNote(noteId));
}
window.editNote = editNote

let sidebarOpen = true;
async function toggleSidebar() {
    if (sidebarOpen === null) { return; } // transition in progress

    const newState = !sidebarOpen;
    sidebarOpen = null;

    // should equal the css transition timing
    const transitionTime = 300;

    if (newState) {
        $('#sidebar').width('revert-layer');
        $('.notes-editor').width('revert-layer');
        $('#notes-list').width('revert-layer');
        $('#notes-list').css('opacity', 'revert-layer');
        $('#search-bar').width('revert-layer');
        $('#search-bar').css('opacity', 'revert-layer');
        $('.notes-header').css('flex-direction', 'revert-layer');
        $('#show-current-note-options').hide();
        $('#refresh-notes-list').show();
    } else {
        $('#sidebar').width('38px');
        $('.notes-editor').width('calc(100% - 50px)');
        $('#notes-list').css('opacity', '0');
        $('#search-bar').css('opacity', '0');

        setTimeout(() => {
            $('.notes-header').css('flex-direction', 'column');
            $('#notes-list').width('0px');
            $('#search-bar').width('0px');
            $('#show-current-note-options').show();
            $('#refresh-notes-list').hide();
        }, transitionTime - 50);
    }

    setTimeout(() => {
        sidebarOpen = newState;
    }, transitionTime);
}
window.toggleSidebar = toggleSidebar;

function newNote(type, title = "", content = "") {
    if (!!window.notesModal) { window.notesModal.hide(); }
    PageContext.instance.setNote(Note.fromContent(type, title, content));
}
window.newNote = newNote;

function deleteNote() {
    const noteId = $('#noteDetailsDelete').data('note-id');
    if (!noteId) {
        showNotice("Nothing to do! Note was never published.");
        return;
    }

    const note = Database.instance.getNote(noteId);

    if (!!window.noteDetailsModal) { window.noteDetailsModal.hide(); }
    confirmAction('Are you sure you want to delete this note?', `Title: ${note.title}`).then(async () => {
        showPending("Deleting...");

        if (noteId === PageContext.instance.note.id) {
            window.MDEditor.value('');
        }

        // If aggressiveDelete mode is enabled,
        // Save a new version with removed content to encourage clients not to show old versions of the note
        // Then, publish a kind-5 delete request to purge the event entirely
        if (Preferences.instance.current.aggressiveDelete) {
            note.update({ content: '' });
            const event = await note.toNostrEvent()
            await Relay.instance.publish(event);
        }

        await Relay.instance.del(noteId);
        Database.instance.deleteNote(noteId);
        showNotice('Note has been deleted');
        searchNotes();
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
        const event = await buildNoteFromEditor(false);
        return Relay.instance.publish(event).then(async (saveEvent) => {
            showNotice(message);
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        });
    });
}

function saveDraftNote() {
    showPending("Encrypting and saving...");
    if (!!window.publishModal) { window.publishModal.hide(); }
    ensureConnected().then(async () => {
        const event = await buildNoteFromEditor(true);
        Relay.instance.publish(event).then(async (saveEvent) => {
            showNotice("Your note has been saved privately.");
            await PageContext.instance.setNoteByNostrEvent(saveEvent);
        })
    });
}
window.saveDraftNote = saveDraftNote;

async function buildNoteFromEditor(draft) {
    const content = window.MDEditor.value();
    const extraTags = [];
    MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function (backref) {
        extraTags.push(["a", backref]);
    });

    PageContext.instance.note.update({ content, draft });
    return await PageContext.instance.note.toNostrEvent(extraTags);
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
    const html = note.private
      ? `<div style="font-weight:bold; text-align: center; color: #aa0000">⚠️ This note is private and cannot be viewed by others.</div>${renderedContent}`
      : note.draft
      ? `<div style="font-weight:bold; text-align: center; color: #aa0000">⚠️ This version of the note is a draft and cannot be viewed by others.</div>${renderedContent}`
      :renderedContent;
    $("#note-content").html(html);
    renderDynamicContent();
    loadBackrefs();

    // editor
    window.MDEditor.value(note.content);
    if (!!window.notesModal) { window.notesModal.hide(); }
    if (note.private) {
      $('#standard-publish-buttons').hide();
      $('#draft-only-buttons').show();
    } else {
      $('#standard-publish-buttons').show();
      $('#draft-only-buttons').hide();
    }
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
            if (result.downloadUrls.length > 0) {
                editor.codemirror.replaceSelection(`![](${result.downloadUrls[0]} "blossom://${result.hash}")`);
            } else {
                showError('No file servers accepted your upload');
            }
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

    const publishButtons = `
        <div class='btn-group publish-button-group' role='group' id='standard-publish-buttons'>
          <button class='btn btn-sm' onclick="saveNote()">Publish</button>
          <button class='btn btn-sm save-draft-button' onclick="saveDraftNote()">Draft</button>
        </div>
        <button style="display:none" class='btn btn-sm publish-button-group' onclick="saveDraftNote()" id="draft-only-buttons">Save Privately</button>
    `;

    $('.editor-toolbar').append(publishButtons);
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

function updateOwnerOnly() {
    if (
        !PageContext.instance.note?.authorPubkey ||
        PageContext.instance.note?.authorPubkey == window.nostrUser?.hexpubkey
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

    const note = PageContext.instance.note;
    const hexpubkey = note.nostrEvent?.pubkey ?? PageContext.instance.dnslinkHexpubkey();
    const title = note.nostrEvent?.tags.find(t => t[0] === 'title')[1] ?? PageContext.instance.note.title;
    if (!hexpubkey || !title) { return; }

    const filters = {
        authors: [hexpubkey],
        kinds: Note.ALL_KINDS,
        "#a": [atagFor(note.kind, title, hexpubkey)]
    };
    Relay.instance.fetchEvents(filters).then((events) => {
        events.forEach(function(event) {
            const title = event.tags.find(t => t[0] == "title")[1];
            const handle = handleFor(event.kind, title, event.pubkey);
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

function confirmAction(question, details = '') {
    return new Promise((resolve, reject) => {
        const modal = new bootstrap.Modal("#confirmActionModal", {});
        $("#confirmActionTitle").text(question);
        $("#confirmActionDetails").text(details);
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

function renderRelays() {
    const relayConfig = RelayConfig.forRelays(window.nostrUser.hexpubkey);
    relayConfig.getRelayUrls().then(urls => {
        renderRelayTable('my-relays', urls, 'trash', 'removeRelay');
    });
    renderRelayTable('recommended-relays', window.relays.recommended, 'plus', 'addRelay');

    const blossomConfig = RelayConfig.forBlossom(window.nostrUser.hexpubkey);
    blossomConfig.getRelayUrls().then(urls => {
        renderRelayTable('my-file-servers', urls, 'trash', 'removeBlossomServer');
    });
}

function renderRelayTable(domId, urls, actionIcon, actionFnName) {
    const updateRelayStatus = async (id, url) => {
        const statusProvider = url.startsWith('wss')
            ? Relay.instance.getRelayStatus
            : Blossom.instance.getServerStatus;
        const status = await statusProvider(url)
            ? 'online'
            : 'offline';
        $(`#relay-status-${domId}-${id}`).html(`<div class='${status}'></div> ${status}`);
    };

    let result = '';
    let id = 0;
    result += `
      <table class='table table-sm relay-table'>
        <thead>
          <tr>
            <th scope='col'>Address</th>
            <th scope='col'>Status</th>
            <th scope='col'>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    urls.forEach(url => {
        updateRelayStatus(id, url);
        const relayHost = (new URL(url)).host;
        result += `
          <tr>
            <td>${relayHost}</td>
            <td id='relay-status-${domId}-${id}'><div class="unknown"></div> connecting...</td>
            <td><i class="fa fa-${actionIcon}" style="cursor:pointer" onclick="${actionFnName}('${url}')"></i></td>
          </tr>
        `;
        id += 1;
    });

    result += `
        </tbody>
      </table>
    `;

    $(`#${domId}`).html(result);
}

async function addRelay(url) {
    showPending('adding relay...');
    const relayConfig = RelayConfig.forRelays(window.nostrUser.hexpubkey);
    relayConfig.addRelay(url).then(() => {
        showNotice('relays updated');
        renderRelays();
    });
}
window.addRelay = addRelay;

function addRelayFromInput() {
    try {
        const url = new URL($('#new-relay-url')[0].value);

        if (url.protocol !== 'wss:') {
            return showError('URL must start with wss://');
        }

        addRelay(url.toString());
    } catch {
        showError('invalid URL');
    }
}
window.addRelayFromInput = addRelayFromInput;

function removeRelay(url) {
    showPending('removing relay...');
    const relayConfig = RelayConfig.forRelays(window.nostrUser.hexpubkey);
    relayConfig.removeRelay(url).then(() => {
        showNotice('relays updated');
        renderRelays();
    });
}
window.removeRelay = removeRelay;

function addBlossomServerFromInput() {
    try {
        const url = new URL($('#new-file-server-url')[0].value);

        if (url.protocol !== 'https:') {
            return showError('URL must start with https://');
        }

        showPending('adding blossom server...');
        const relayConfig = RelayConfig.forBlossom(window.nostrUser.hexpubkey);
        relayConfig.addRelay(url.toString()).then(() => {
            showNotice('blossom servers updated');
            renderRelays();
        });
    } catch {
        showError('invalid URL');
    }
}
window.addBlossomServerFromInput = addBlossomServerFromInput;

function removeBlossomServer(url) {
    showPending('removing blossom server...');
    const relayConfig = RelayConfig.forBlossom(window.nostrUser.hexpubkey);
    relayConfig.removeRelay(url).then(() => {
        showNotice('blossom servers updated');
        renderRelays();
    });
}
window.removeBlossomServer = removeBlossomServer;

function showNewNoteModal() {
    window.newNoteModal = new bootstrap.Modal('#new-note-modal', {});
    window.newNoteModal.show();
    $('#new-note-title').val('');
    setTimeout(() => $('#new-note-title').focus(), 500);
}
window.showNewNoteModal = showNewNoteModal;

function newNoteFromUi(type) {
    window.newNoteModal.hide();
    const title = $('#new-note-title').val();
    newNote(type, title, `# ${title}\n`);
    window.MDEditor.codemirror.focus();
    window.MDEditor.codemirror.setCursor({line: 1, ch: 0})
}
window.newNoteFromUi = newNoteFromUi;
