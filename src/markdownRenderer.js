import { naddrFor, atagFor } from "./common.js"

class MarkdownRenderer {
    static instance = new MarkdownRenderer();
    constructor() {
        if (!!MarkdownRenderer.instance) { throw new Error('Use singleton instance'); }
    }

    renderHtml(markdown) {
        return this.parse(markdown).html;
    }

    parse(markdown) {
        // Custom tokenizer to parse links to authors other articles
        // Format: [[note title]]
        const tokenizer = {
            link(src) {
            const match = src.match(/^\[\[([^\]\n]+)\]\]/);
            if (match) {
                this.lexer.state.inLink = true;
                const handle = naddrFor(match[1], PageContext.instance.note.authorPubkey);
                const token = {
                type: 'link',
                raw: match[0],
                href: window.router.urlFor(Router.BROWSER, handle),
                title: match[1],
                text: match[1],
                tokens: this.lexer.inlineTokens(match[1])
                }
                this.lexer.state.inLink = false;
                window.foo.push(atagFor(match[1], PageContext.instance.note.authorPubkey));
                return token;
            }
            return false;
            }
        };

        window.foo = [];
        marked.use({ tokenizer });
        marked.use(markedKatex({ throwOnError: true }));
        return {
            html: DOMPurify.sanitize(marked.parse(markdown)),
            backrefs: window.foo,
        }
    }
}
window.MarkdownRenderer = MarkdownRenderer;