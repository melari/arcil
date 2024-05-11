import { noteFilterFromIdentifier, toggleConnect, ensureReadonlyConnected } from "./common.js"
import { Note } from "./note.js"
import { Relay } from "./relay.js"

// Connect UI button
function connectWalletBrowse() {
  toggleConnect();
}
window.connectWalletBrowse = connectWalletBrowse;

// Run on page ready; loads the note content from nostr
async function browseNoteFromUrl() {
    browseNote(PageContext.instance.noteIdentifierFromUrl());
}
window.browseNoteFromUrl = browseNoteFromUrl;

async function navigateToNote(identifier, title) {
    const url = window.router.urlFor(Router.BROWSER, `${identifier}?title=${title}`);
    const state = { identifier }
    history.pushState(state, '', url);
    browseNote(identifier);
}

async function browseNote(identifier) {
  await ensureReadonlyConnected();

  const filters = noteFilterFromIdentifier(identifier);
  console.log(filters);
  Relay.instance.fetchEvent(filters, async (event) => {
      if (!!event) { await PageContext.instance.setNoteByNostrEvent(event); }
  });

  setTimeout(() => {
    if (PageContext.instance.note.nostrEvent) { return; } // If the note has been loaded by now, do nothing.

    const stubTitle = PageContext.instance.noteTitleFromUrl();
    if (!!PageContext.instance.noteIdentifierFromUrl()) {
      if (stubTitle) {
        PageContext.instance.setNote(Note.fromContent(filters.authors[0], stubTitle, `# ${stubTitle}\n\n⚠️ This note is a stub and does not exist yet. Click \`open in editor\` to start writing!`));
      } else {
        PageContext.instance.setNote(Note.fromContent(filters.authors[0], '', "# Note Not Found!\n\nEither this version of the note no longer exists or it's on a different nostr relay."));
      }
    } else {
      PageContext.instance.setNote(Note.fromContent(filters.authors[0], 'homepage', `# ${window.location.hostname}\n\nTo create a homepage for your digital garden, create a note with the title \`homepage\`.`));
    }
  }, 5000);
}
window.browseNote = browseNote;

function openNoteInEditor() {
  const stubTitle = PageContext.instance.note.title;
  if (PageContext.instance.noteIdentifierFromUrl()) {
    window.location.href = window.router.urlFor(Router.EDITOR, `${PageContext.instance.noteIdentifierFromUrl()}?title=${stubTitle}`);
  } else {
    window.location.href = window.router.urlFor(Router.EDITOR, `?title=${stubTitle}`);
  }
}
window.openNoteInEditor = openNoteInEditor;

function bindPrefetchLinks() {
    $("a[href='#tagayasu-prefetch']").off('click.navigate');
    $("a[href='#tagayasu-prefetch']").on('click.navigate', (e) => {
        navigateToNote(e.target.title, e.target.innerText);
        return false; // block navigation
    });
}
window.bindPrefetchLinks = bindPrefetchLinks;

// When the browser back button is pressed
window.addEventListener('popstate', (event) => {
    browseNote(event.state?.identifier);
});
