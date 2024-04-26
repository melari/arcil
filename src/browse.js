import { toggleConnect, ensureReadonlyConnected, npubToHexpubkey, dtagFor } from "./common.js"
import { Note } from "./note.js"

// Connect UI button
function connectWalletBrowse() {
  toggleConnect();
}
window.connectWalletBrowse = connectWalletBrowse;


// Run on page ready; loads the note content from nostr
async function browseNote() {
  await ensureReadonlyConnected();

  const npub = await PageContext.instance.dnslinkNpub();
  console.log("npub from dnslink:", npub);

  const hexpubkey = npubToHexpubkey(npub);
  console.log("hexpubkey:", hexpubkey);

  const homepageFilter = { authors: [hexpubkey], kinds: [30023], "#d": [dtagFor("homepage")] };
  const explicitFilter = PageContext.instance.noteFilterFromUrl();
  const filters = explicitFilter ?? homepageFilter;
  console.log("filters:", filters);

  window.ndk.fetchEvent(filters).then(async function (event) {
    if (!!event) { await PageContext.instance.setNoteByNostrEvent(event); }
  });

  setTimeout(() => {
    if (PageContext.instance.note.nostrEvent) { return; } // If the note has been loaded by now, do nothing.

    const stubTitle = PageContext.instance.noteTitleFromUrl();
    if (explicitFilter) {
      if (stubTitle) {
        PageContext.instance.setNote(Note.fromContent(hexpubkey, stubTitle, `# ${stubTitle}\n\n⚠️ This note is a stub and does not exist yet. Click \`open in editor\` to start writing!`));
      } else {
        PageContext.instance.setNote(Note.fromContent(hexpubkey, '', "# Note Not Found!\n\nEither this version of the note no longer exists or it's on a different nostr relay."));
      }
    } else {
      PageContext.instance.setNote(Note.fromContent(hexpubkey, 'homepage', `# ${window.location.hostname}\n\nTo create a homepage for your digital garden, create a note with the title \`homepage\`.`));
    }
  }, 2000);
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

async function lookupNpubFromDns() {
  const hostname = window.location.hostname;
  const url = `https://1.1.1.1/dns-query?name=npub.${hostname}&type=TXT`;
  const headers = {
    'accept': 'application/dns-json'
  };

  // Make the fetch request
  const npub = await fetch(url, {
    headers: headers
  })
    .then(response => response.json()) // Parse the response as JSON
    .then(data => data["Answer"][0]["data"].replace(/[^a-zA-Z0-9]/g, ''))
    .catch(error => {
      console.error('Error:', error);
    });
  return npub;
}
window.lookupNpubFromDns = lookupNpubFromDns;
