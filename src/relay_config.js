export class RelayConfig {
    static RELAY_LIST_KIND = 10002;
    static RELAY_TAG = 'r';

    constructor(hexpubkey) {
        this.hexpubkey = hexpubkey;
    }

    // Each relay in the list has the form:
    // { url, mode }
    // where mode is one of ["read", "write", "both"]
    async getRelayList() {
        const filters = {
            authors: [this.hexpubkey],
            kinds: [RelayConfig.RELAY_LIST_KIND]
        };
        return Relay.instance.fetchEvent(filters).then(async (event) => {
            if (!!event) {
                return event.tags.filter(t => t[0] === RelayConfig.RELAY_TAG).map(t => {
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
                ? [RelayConfig.RELAY_TAG, r.url]
                : [RelayConfig.RELAY_TAG, r.url, r.mode];
        });

        return Relay.instance.buildAndPublish(RelayConfig.RELAY_LIST_KIND, '', tags, this.hexpubkey);
    }
}
