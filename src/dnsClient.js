class DnsClient {
    _baseUrl = 'https://1.1.1.1/dns-query?type=TXT&name=';
    _headers = { 'accept': 'application/dns-json' };

    static instance = new DnsClient();
    constructor() {
        if (!!DnsClient.instance) { throw new Error('Use singleton instance'); }
    }

    async txt(domain) {
        return fetch(this._baseUrl + domain, { headers: this._headers })
        .then(response => response.json())
        .then(data => {
            if (data["Answer"]) {
                return data["Answer"][0]["data"].replace(/[^a-zA-Z0-9]/g, '');
            } else {
                return '';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            return null;
        });
    }

    _npubs = {};
    async npub(domain) {
        if (!!this._npubs[domain]) { return this._npubs[domain]; }
        const result = await this.txt(`npub.${domain}`);
        this._npubs[domain] = result;
        return this._npubs[domain];
    }
}
window.DnsClient = DnsClient;