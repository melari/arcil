import { ensureConnected, encryptSelf, decryptSelf } from "./common";
import { showNotice } from "./error.js";
import { Relay } from "./relay.js";

class Preferences {
    static PREFERENCES_CHANGED_EVENT = "preferences-changed";

    static D_TAG = "tagayasu/preferences";
    static KIND = 30078;

    static DEFAULTS = {
        spellCheckEnabled: false,
        aggressiveDelete: false,
    }
    current = Preferences.DEFAULTS;

    static instance = new Preferences();
    constructor() {
        if (!!Preferences.instance) { throw new Error('Use singleton instance'); }
    }

    async set(partial) {
        this.current = Object.assign(this.current, partial);
        window.dispatchEvent(new Event(Preferences.PREFERENCES_CHANGED_EVENT));
        await this.saveToNostr();
    }

    // Does NOT ensureConnected, because this is triggered by the wallet connection event
    // so we are likely still in the process of connecting and therefore the connection
    // is not healthy yet. Using ensureConnected will cause an infinite reconnection loop.
    async setFromNostr() {
        const filter = {
            authors: [window.nostrUser.hexpubkey],
            kinds: [Preferences.KIND],
            "#d": [Preferences.D_TAG],
        };
        Relay.instance.fetchEvent(filter).then(async (event) => {
            if (!!event) {
                const parsed = JSON.parse(await decryptSelf(event.content));
                this.current = Object.assign({ ...Preferences.DEFAULTS }, parsed);
            }
            window.dispatchEvent(new Event(Preferences.PREFERENCES_CHANGED_EVENT));
        });
    }

    async saveToNostr() {
        await ensureConnected().then(async () => {
            const tags = [
                ["d", Preferences.D_TAG],
                ["published_at", Math.floor(Date.now() / 1000).toString()]
            ];
            const content = await encryptSelf(JSON.stringify(this.current));
            Relay.instance.buildAndPublish(Preferences.KIND, content, tags).then((saveEvent) => {
                showNotice("Your preferences have been saved.");
            });
        });
    }
}
window.Preferences = Preferences;

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, async function (e) {
    Preferences.instance.setFromNostr();
});
