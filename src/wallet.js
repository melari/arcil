export class Wallet {
    static WALLET_CONNECTED_EVENT = "wallet-connected-event";
    static WALLET_DISCONNECTED_EVENT = "wallet-disconnected-event";
    static WALLET_CONNECTION_CHANGED = "wallet-connection-changed";

    static instance = new Wallet();
    constructor() {
        if (!!Wallet.instance) { throw new Error('Use singleton instance'); }
    }
}
window.Wallet = Wallet;

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    window.dispatchEvent(new Event(Wallet.WALLET_CONNECTION_CHANGED));
});

window.addEventListener(Wallet.WALLET_DISCONNECTED_EVENT, function(e) {
    window.dispatchEvent(new Event(Wallet.WALLET_CONNECTION_CHANGED));
});