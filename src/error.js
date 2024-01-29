export const ERROR_EVENT = "error-event";
export const NOTICE_EVENT = "notice-event";

export function showError(message) {
    console.error(message);
    window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { message } }));
}

export function showNotice(message) {
    console.log(message);
    window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: { message } }));
}