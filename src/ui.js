import { ensureReadonlyConnected, atagFor, decryptSelf, delay } from "./common.js"
import { ERROR_EVENT, NOTICE_EVENT } from "./error.js"

$(window).on('load', async function() {
    createMDE();
    window.router = await new Router().route();
    $("#page-" + window.router.pageName).show();

    await window.trySeamlessConnection();

    if (window.router.pageName == "editor") {
        window.loadNote();
    } else if (window.router.pageName == "browser") {
        window.browseNote();
    }
});

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

function loadBackrefs() {
    ensureReadonlyConnected();

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