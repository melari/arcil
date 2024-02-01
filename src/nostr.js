export function startNostrMonitoring() {
    setInterval(executeNostrMonitoring, 100);
    executeNostrMonitoring();
}

function executeNostrMonitoring() {
    updateStats();
}

function updateStats() {
    const connected = window.ndk?.pool?.stats()?.connected ?? 0;
    const total = window.ndk?.pool?.stats()?.total ?? window.relays.default.length;
    let stats = `relays connected: ${connected}/${total}`

    $('.autosave').css("float", "left");
    $('.autosave').html(stats);
}
