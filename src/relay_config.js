export class RelayConfig {
    static RELAY_LIST_KIND = 10002;
    static BLOSSOM_LIST_KIND = 10063;
    static RELAY_TAG = 'r';
    static BLOSSOM_TAG = 'server';

    constructor(hexpubkey, kind, tag) {
        this.hexpubkey = hexpubkey;
        this.kind = kind;
        this.tag = tag;
    }

    static forRelays(hexpubkey) {
        return new RelayConfig(hexpubkey, RelayConfig.RELAY_LIST_KIND, RelayConfig.RELAY_TAG);
    }

    static forBlossom(hexpubkey) {
        return new RelayConfig(hexpubkey, RelayConfig.BLOSSOM_LIST_KIND, RelayConfig.BLOSSOM_TAG);
    }

    // Each relay in the list has the form:
    // { url, mode }
    // where mode is one of ["read", "write", "both"]
    async getRelayList() {
        const filters = {
            authors: [this.hexpubkey],
            kinds: [this.kind]
        };
        return Relay.instance.fetchEvent(filters).then(async (event) => {
            if (!!event) {
                return event.tags.filter(t => t[0] === this.tag).map(t => {
                    return {
                        url: t[1],
                        mode: t[2] ?? 'both',
                    };
                });
            } else {
                return [];
            }
        });
    }

    // Returns a list of all relays the user uses, regardless of if they are read or write
    async getRelayUrls() {
        return this.getRelayList().then(list => list.map(r => r.url));
    }

    async addRelay(url) {
        const existingList = await this.getRelayList();

        if (existingList.some(r => r.url === url)) {
            return Promise.resolve(true);
        }

        const newList = [...existingList, {
            url,
            mode: 'both',
        }];

        return this.saveRelays(newList);
    }

    async removeRelay(url) {
        const existingList = await this.getRelayList();
        const newList = existingList.filter(t => t.url !== url);

        if (existingList == newList) {
            return Promise.resolve(true);
        }

        return this.saveRelays(newList);
    }

    // Relay list must be of the form described above for `getRelayList`
    async saveRelays(relayList) {
        const tags = relayList.map(r => {
            return r.mode === 'both'
                ? [this.tag, r.url]
                : [this.tag, r.url, r.mode];
        });

        return Relay.instance.buildAndPublish(this.kind, '', tags, this.hexpubkey);
    }
}
