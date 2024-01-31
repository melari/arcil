import NDK, { NDKNip07Signer, NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import { showError } from "./error.js";
window.buffer = require('buffer/').Buffer
const crypto = require('crypto-js');

window.relays = {
  default: [
    "wss://relay.damus.io",
    "wss://nos.lol"
  ],
  active: []
}
window.relays.active = window.relays.default;

export async function delay(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

// Swaps between connected / disconnected
export function toggleConnect() {
  if (window.nip07signer) {
    window.nip07signer = null;
    window.ndk = null;
    window.nostrUser = null;
    delete(window.sessionStorage.privateKey);
    delete(window.sessionStorage.lastKeyProvider);
    $(".connect-wallet").text("Connect");
    return ensureReadonlyConnected().then(() => {
      window.dispatchEvent(new Event(Wallet.WALLET_DISCONNECTED_EVENT));
    });
  } else {
    return ensureConnected();
  }
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
  
export function ensureReadonlyConnected() {
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
        console.log("Permission granted to read their public key:", user.npub);
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
  console.log(account);

  const message = "Sign this message to approve the current website *unlimited* access to your Tagayasu account.\n\nPlease be very careful to make sure you are on the correct website (tagayasu.xyz) to prevent phising attacks!";

  // For historical reasons, you must submit the message to sign in hex-encoded UTF-8.
  // This uses a Node.js-style buffer shim in the browser.
  const msg = `0x${window.buffer.from(message, 'utf8').toString('hex')}`;
  return await ethereum.request({
    method: 'personal_sign',
    params: [msg, account],
  })
    .then(sign => {
      return connectNostrViaPrivateKey(crypto.SHA256(sign).toString(crypto.enc.Hex).slice(0, 64));
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
      connectNostrViaPrivateKey(crypto.SHA256($("#pass-phrase").val()).toString(crypto.enc.Hex).slice(0, 64)).then(resolve("user logged in with passphrase"));
    });
  });
}

export function dtagFor(title) {
  return "tagayasu-" + title.replace(/[^\w\s]/g, '').toLowerCase().replace(/\s+/g, '-');
}

export function naddrFor(title, hexpubkey) {
  const event = new NDKEvent(window.ndk);
  event.kind = 30023;
  event.pubkey = hexpubkey;
  event.tags = [["d", dtagFor(title)]];
  return event.encode();
}

export function atagFor(title, hexpubkey) {
  return `30023:${hexpubkey}:${dtagFor(title)}`
}

export function encryptSelf(text) {
  if (!!window.nostr && !!window.nostr.nip04) {
    return window.nostr.nip04.encrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.encrypt(text, window.sessionStorage.privateKey).toString());
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
}

export function decryptSelf(text) {
  if (!!window.nostr && !!window.nostr.nip04) {
    return window.nostr.nip04.decrypt(window.nostrUser.hexpubkey, text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.decrypt(text, window.sessionStorage.privateKey).toString(crypto.enc.Utf8));
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
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
