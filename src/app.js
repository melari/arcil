import { ensureConnected, toggleConnect, dtagFor, encryptSelf } from "./common.js"
import { NDKEvent } from "@nostr-dev-kit/ndk";
const Trie = require("triever");

window.noteTitleTrie = new Trie();
window.notes = {};

// Connect UI button
function connectWalletApp() {
  toggleConnect().then(() => {
    if (window.nip07signer) { showMyNotes(); }
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

function fetchNotes() {
  noteTitleTrie = new Trie(); // This is a full reload, so we empty out the existing index.
  notes = {};

  const filter = { authors: [window.nostrUser.hexpubkey()], kinds: [30023] }
  window.ndk.fetchEvents(filter).then(function(eventSet) {
      eventSet.forEach(function(e) { saveNoteToDatabase(e); });
      searchNotes(); // trigger a search to generate the initial display
  }).catch((error) => console.log(error));
}

// Load the note into the editor given by params
function loadNote() {
  if (!PageContext.instance.noteIdentifierFromUrl()) { 
    if (!!window.nip07signer) { return showMyNotes(); }
    else { return newNote(); }
  }

  ensureConnected().then(() => {
    const filter = PageContext.instance.noteFilterFromUrl();
    window.ndk.fetchEvent(filter).then(function(event) {
      if (!!event) {
        if (event.pubkey == window.nostrUser.hexpubkey()) {
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
  note.title.split(" ").forEach(function(word) {
    noteTitleTrie.add(word.toLowerCase(), event.id);
  });
}

function searchNotes() {
  $("#notes-list").empty();
  const uniqueNotes = new Set();
  $("#note-search-box").val().toLowerCase().split(" ").forEach(function(searchWord) {
    const searchResults = noteTitleTrie.getData(searchWord);
    if (!!searchResults) {
      searchResults.forEach(function(noteId) {
        uniqueNotes.add(noteId);
      });
    }
  });

  let notesDisplayed = 0;
  uniqueNotes.forEach(function(noteId) {
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

function newNote() {
  if (!!window.notesModal) { window.notesModal.hide(); }
  window.MDEditor.value("# Welcome to Tagayasu\n\nThis is the note editor, where you can create and edit your content.\n\nTo publish a note, make sure to enter a title below, then click `Publish`!");
  $("#note-title").val("");
  PageContext.instance.setNoteByAuthorPubkey(PageContext.instance.note.authorPubkey);
}
window.newNote = newNote;

function saveNote() {
  ensureConnected().then(() => {
    const title = $("#note-title").val();
    if (dtagFor(title) == "tagayasu-") {
      console.log("empty title is not allowed");
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
    MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function(backref) {
      saveEvent.tags.push(["a", backref]);
    });
    console.log(saveEvent);
    saveEvent.publish().then(function(x) {
        console.log("published event");
        PageContext.instance.setNoteByNostrEvent(saveEvent);
    })
  });
}
window.saveNote = saveNote;

function savePrivateNote() {
  ensureConnected().then(async () => {
    const title = $("#note-title").val();
    if (dtagFor(title) == "tagayasu-") {
      console.log("empty title is not allowed");
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
    saveEvent.publish().then(function(x) {
        console.log("published event");
        PageContext.instance.setNoteByNostrEvent(saveEvent);
    })
  });
}
window.savePrivateNote = savePrivateNote;

function viewPublishedNote() {
  window.location.href = window.router.urlFor(Router.BROWSER, PageContext.instance.note.handle);
}
window.viewPublishedNote = viewPublishedNote

