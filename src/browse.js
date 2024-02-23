import { toggleConnect, ensureReadonlyConnected } from "./common.js"

// Connect UI button
function connectWalletBrowse() {
  toggleConnect();
}
window.connectWalletBrowse = connectWalletBrowse;


// Run on page ready; loads the note content from nostr
async function browseNote() {
  await ensureReadonlyConnected();
   
  const filters = PageContext.instance.noteFilterFromUrl();
  if (!!filters.authors) { PageContext.instance.setNoteByAuthorPubkey(filters.authors[0]); } // save the author from the params (if possible) rather than event in case the event does not exist.
  window.ndk.fetchEvent(filters).then(async function(event) {
    if (!!event) { await PageContext.instance.setNoteByNostrEvent(event); }
  });
}
window.browseNote = browseNote;

function openNoteInEditor() {
  window.location.href = window.router.urlFor(Router.EDITOR, `${PageContext.instance.noteIdentifierFromUrl()}?title=${PageContext.instance.noteTitleFromUrl()}`);
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
