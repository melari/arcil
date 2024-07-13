import { noteFilterFromIdentifier, toggleConnect, ensureReadonlyConnected } from "./common.js"
import { Note } from "./note.js"
import { Relay } from "./relay.js"

// Run on page ready; loads the note content from nostr
async function browseNoteFromUrl() {
    browseNote(PageContext.instance.noteIdentifierFromUrl());
}
window.browseNoteFromUrl = browseNoteFromUrl;

async function navigateToNote(identifier) {
    const url = window.router.urlFor(Router.BROWSER, identifier);
    const state = { identifier }
    history.pushState(state, '', url);
    await window.router.route();
    browseNote(identifier);
}
window.navigateToNote = navigateToNote;

async function browseNote(identifier) {
  await ensureReadonlyConnected();

  const filters = noteFilterFromIdentifier(identifier);

  $("#note-content").html("<h2>🌱 loading...</h2>");

  Relay.instance.fetchEvent(filters).then(async (event) => {
      if (!!event) {
          if (!!event.tags.find(t => t[0] === "private") && event.pubkey !== window.nostrUser?.hexpubkey) {
              PageContext.instance.setNote(Note.fromContent('private', '403', '### ❌ This note is private and cannot be decrypted.'));
              return;
          }
          await PageContext.instance.setNoteByNostrEvent(event);
          const aTags = event.tags.filter(t => t[0] === 'a').map(t => t[1]);
          const filters = {
              authors: [event.pubkey],
              kinds: Note.ALL_KINDS,
              "#d": aTags.map(t => t.split(':')[2])
          }
          Relay.instance.fetchEvents(filters);
      } else {
          const stubTitle = PageContext.instance.noteTitleFromUrl();
          if (!!PageContext.instance.noteIdentifierFromUrl()) {
              if (stubTitle) {
                  PageContext.instance.setNote(Note.fromContent('topic', stubTitle, `# ${stubTitle}\n\n⚠️ This note is a stub and does not exist yet.`));
              } else {
                  PageContext.instance.setNote(Note.fromContent('topic', '404', "# Note Not Found!\n\nEither this version of the note no longer exists or it's on a different nostr relay."));
              }
          } else {
              PageContext.instance.setNote(Note.fromContent('topic', 'homepage', `# ${window.location.hostname}\n\nTo create a homepage for your digital garden, create a note with the title \`homepage\`.`));
          }
      }
  });
}
window.browseNote = browseNote;

function openNoteInEditor() {
  if (PageContext.instance.noteIdentifierFromUrl()) {
    window.location.href = window.router.urlFor(Router.EDITOR, `${PageContext.instance.noteIdentifierFromUrl()}`);
  } else {
    window.location.href = window.router.urlFor(Router.EDITOR);
  }
}
window.openNoteInEditor = openNoteInEditor;

function renderDynamicContent() {
    if (window.router.pageName !== Router.BROWSER) { return; }
    $("a[href='#tagayasu-prefetch']").off('click.navigate');
    $("a[href='#tagayasu-prefetch']").on('click.navigate', (e) => {
        navigateToNote(e.target.title);
        return false; // block navigation
    });

    $("[title^='blossom://']").each(async (_, entity) => {
        let match = entity.title.match(/blossom:\/\/(.*)/);
        if (!match) { return; }
        const hash = match[1];

        // prevents race conditions that cause the file to be fetched multiple times
        entity.title = 'loading';

        const blobUrl = await Blossom.instance.fetchFile(hash, PageContext.instance.note.authorPubkey);

        entity.src = blobUrl;
    });
}
window.renderDynamicContent = renderDynamicContent;

// When the browser back button is pressed
window.addEventListener('popstate', async (event) => {
    await window.router.route();
    browseNoteFromUrl();
});
