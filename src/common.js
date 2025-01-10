import NDK, { NDKNip07Signer, NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import { showError } from "./error.js";
import { Note } from "./note.js";
window.buffer = require('buffer/').Buffer
const crypto = require('crypto-js');

window.relays = {
  default: [
    "wss://relay.tagayasu.xyz/",
    "wss://relay.damus.io/",
    "wss://nos.lol/",
    "wss://nostr.mom/",
    "wss://nostr.oxtr.dev/",
    "wss://relay.nostr.band/",
    "wss://offchain.pub/",
    "wss://purplerelay.com/",
    "wss://nostr.bitcoiner.social/",
    "wss://thecitadel.nostr1.com/",
    "wss://nostr.wine/",
  ],
  active: [],
  recommended: [
    "wss://relay.tagayasu.xyz/",
    "wss://relay.damus.io/",
    "wss://thecitadel.nostr1.com/",
    "wss://nos.lol/",
    "wss://nostr.wine/",
  ]
}
window.relays.active = window.relays.default;

export async function delay(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export function shortHash(input, length = 64) {
  return crypto.SHA256(input).toString(crypto.enc.Hex).slice(0, length);
}

// Swaps between connected / disconnected
export async function toggleConnect() {
  if (window.nip07signer) {
    await disconnectNostr();
    return ensureReadonlyConnected().then(() => {
      window.dispatchEvent(new Event(Wallet.WALLET_DISCONNECTED_EVENT));
    });
  } else {
    return ensureConnected();
  }
}

async function disconnectNostr() {
  for (const r of window.ndk.pool.relays.values()) { r.disconnect(); }
  await delay(100); // Give the relays a chance to disconnect
  window.ndk = null;

  window.nip07signer = null;
  window.nostrUser = null;
  delete (window.sessionStorage.privateKey);
  delete (window.sessionStorage.lastKeyProvider);
  window.MDEditor.value('');
  localStorage.removeItem('autosave');
  location.reload();
}

// Will try to get a connection without user interaction if possible
async function trySeamlessConnection() {
  if (window.nip07signer && isNostrConnectionHealthy()) { 
    return Promise.resolve("already connected");
  } else if (window.sessionStorage.lastKeyProvider == "nip07" && !!window.nostr) {
    return connectNostrViaNip07();
  } else if (window.sessionStorage.lastKeyProvider == "private-key" && !!window.sessionStorage.privateKey) {
    return connectNostrViaPrivateKey(window.sessionStorage.privateKey);
  } else {
    return Promise.reject("no seamless connection possible");
  }
}
window.trySeamlessConnection = trySeamlessConnection;

export async function ensureConnected() {
  return trySeamlessConnection().catch(() => {
    if (!!window.nostr) {
      return connectNostrViaNip07();
    } else if (!!window.ethereum) {
      return connectNostrViaEthereum();
    } else {
      return connectNostrViaPassphrase();
    }
  });
}

export async function ensureReadonlyConnected() {
  if (!isNostrConnectionHealthy()) {
    window.ndk = new NDK({explicitRelayUrls: window.relays.active});
    window.ndk.connect();
  }
  return Promise.resolve("connected");
}

function isNostrConnectionHealthy() {
  if (!window.ndk) { return false; }
  const connectionStats = window.ndk.pool.stats();
  return connectionStats.connected / connectionStats.total >= 0.5
}

async function connectNostr(nip07signer) {
  window.nip07signer = nip07signer;
  window.ndk = new NDK({ signer: window.nip07signer, explicitRelayUrls: window.relays.active });

  return await nip07signer.user().then(async (user) => {
      if (!!user.npub) {
        window.nostrUser = user;
        window.ndk.connect();
        window.dispatchEvent(new Event(Wallet.WALLET_CONNECTED_EVENT));
      }
  });
};

async function connectNostrViaNip07() {
  window.sessionStorage.lastKeyProvider = "nip07";
  return connectNostr(new NDKNip07Signer());
}

async function connectNostrViaPrivateKey(privateKey) {
  window.sessionStorage.privateKey = privateKey;
  window.sessionStorage.lastKeyProvider = "private-key";
  return connectNostr(new NDKPrivateKeySigner(window.sessionStorage.privateKey));
}

async function connectNostrViaEthereum() {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    .catch((err) => {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error
        // If this happens, the user rejected the connection request.
        showError('User rejected the connection request');
      } else {
        showError(err.message);
      }
    });
  const account = accounts[0];

  const message = "Sign this message to approve the current website *unlimited* access to your Tagayasu account.\n\nPlease be very careful to make sure you are on the correct website (tagayasu.xyz) to prevent phising attacks!";

  // For historical reasons, you must submit the message to sign in hex-encoded UTF-8.
  // This uses a Node.js-style buffer shim in the browser.
  const msg = `0x${window.buffer.from(message, 'utf8').toString('hex')}`;
  return await ethereum.request({
    method: 'personal_sign',
    params: [msg, account],
  })
    .then(sign => {
      return connectNostrViaPrivateKey(shortHash(sign));
    }).catch((err) => {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error
        // If this happens, the user rejected the connection request.
        showError('User rejected the signature request');
      } else {
        showError(err.message);
      }
    });
}

function connectNostrViaPassphrase() {
  return new Promise((resolve, reject) => {
    const modal = new bootstrap.Modal("#keyEntryModal", {});
    modal.show();

    modal._element.addEventListener('hidden.bs.modal', function onModalHidden() {
      // Remove the event listener to avoid memory leaks
      modal._element.removeEventListener('hidden.bs.modal', onModalHidden);
      reject("no suitable key store found");
    });

    const submitButton = document.getElementById('connectWithPassPhraseButton');
    submitButton.addEventListener('click', function onButtonClick() {
      // Remove the event listener to avoid memory leaks
      submitButton.removeEventListener('click', onButtonClick);
      modal.hide();
      connectNostrViaPrivateKey(shortHash($("#pass-phrase").val())).then(resolve("user logged in with passphrase"));
    });
  });
}

export function dtagFor(title) {
  return title.toLowerCase().replace(/\W/g, '-');
}

export function draftDtagFor(title) {
  return shortHash(dtagFor(title));
}

export function handleFor(kind, title, hexpubkey) {
  const dnslinkHexpubkey = PageContext.instance.dnslinkHexpubkey();
  if (dnslinkHexpubkey === hexpubkey) {
    return dtagFor(title);
  } else {
    return naddrFor(kind, title, hexpubkey);
  }
}

export function naddrFor(kind, title, hexpubkey) {
  const event = new NDKEvent(window.ndk);
  event.kind = kind;
  event.pubkey = hexpubkey;
  event.tags = [["d", dtagFor(title)]];
  return event.encode();
}

export function atagFor(kind, title, hexpubkey) {
  return `${kind}:${hexpubkey}:${dtagFor(title)}`
}

export async function encryptSelf(text) {
  if (!!window.nostr?.nip44) {
    return window.nostr.nip44.encrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.nostr?.nip04) {
    return window.nostr.nip04.encrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.encrypt(text, window.sessionStorage.privateKey).toString());
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
}

export async function decryptSelf(text) {
  if (!!window.nostr?.nip44) {
    return window.nostr.nip44.decrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.nostr?.nip04) {
    return window.nostr.nip04.decrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.decrypt(text, window.sessionStorage.privateKey).toString(crypto.enc.Utf8));
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
}

export function npubToHexpubkey(npub) {
  const decoded = nip19.decode(npub);
  if (decoded.type !== "npub") {
    throw new Error('Invalid npub');
  }
  return decoded.data;
}

/**
 * Handles several scenarios:
 * - If the identifier is a naddr, filter to that note by ID
 * - If the identifier is a plaintext title, filter to that note based on domain
 * - If the identifier is a plaintext title and there is no domain, return null
 * - If the identifier is empty, try to filter to the homepage based on domain
 * - If the identifier is empty and there is no domain, return null
 */
export function noteFilterFromIdentifier(explicitIdentifier) {
    const hexpubkey = PageContext.instance.dnslinkHexpubkey();
    if (!explicitIdentifier && !hexpubkey) { return null; }
    if (!explicitIdentifier) {
        return {
            authors: [hexpubkey],
            kinds: Note.ALL_KINDS,
            "#d": [dtagFor("homepage")]
        };
    }

    const potentialFilter = filterFromId(explicitIdentifier);
    if (!potentialFilter.kinds || Note.ALL_KINDS.includes(potentialFilter.kinds[0])) { potentialFilter.kinds = Note.ALL_KINDS; }
    if (!!potentialFilter["#d"]) { return potentialFilter; }
    if (!hexpubkey) { return null; }

    const title = potentialFilter.ids[0].replace(/-/g, ' ')

    return {
        authors: [hexpubkey],
        kinds: Note.ALL_KINDS,
        "#d": [dtagFor(title), draftDtagFor(title)]
    };
}

/**
 * Creates a valid nostr filter from an event id or a NIP-19 bech32.
 * Original: https://github.com/nostr-dev-kit/ndk/blob/master/ndk/src/subscription/utils.ts#L132
 */
export function filterFromId(id) {
    let decoded;

    if (id.match(NIP33_A_REGEX)) {
        const [kind, pubkey, identifier] = id.split(":");

        const filter = {
            authors: [pubkey],
            kinds: [parseInt(kind)],
        };

        if (identifier) {
            filter["#d"] = [identifier];
        }

        return filter;
    }

    try {
        decoded = nip19.decode(id);

        switch (decoded.type) {
            case "nevent":
                return { ids: [decoded.data.id] };
            case "note":
                return { ids: [decoded.data] };
            case "naddr":
                return {
                    authors: [decoded.data.pubkey],
                    "#d": [decoded.data.identifier],
                    kinds: [decoded.data.kind],
                };
        }
    } catch (e) {
        // Empty
    }

    return { ids: [id] };
}

/**
 * Matches an `a` tag of a NIP-33 (kind:pubkey:[identifier])
 */
export const NIP33_A_REGEX = /^(\d+):([0-9A-Fa-f]+)(?::(.*))?$/;
