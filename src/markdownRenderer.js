import { Note } from "./note.js"
import { handleFor, atagFor } from "./common.js"

class MarkdownRenderer {
    static instance = new MarkdownRenderer();
    constructor() {
        if (!!MarkdownRenderer.instance) { throw new Error('Use singleton instance'); }
    }

    renderHtml(markdown) {
        const _this = self.MarkdownRenderer.instance;
        return _this.parse(markdown).html;
    }

    parse(markdown) {
        // Custom tokenizer to parse links to authors other articles
        // Format: [[note title]]
        const tokenizer = {
            link(src) {
            const match = src.match(/^\[\[([^\]\n]+)\]\]/);
            if (match) {
                this.lexer.state.inLink = true;
                const handle = handleFor(Note.SOME_KIND, match[1], PageContext.instance.note.authorPubkey);
                const token = {
                    type: 'link',
                    raw: match[0],
                    href: '#tagayasu-prefetch',
                    title: handle,
                    text: match[1],
                    tokens: this.lexer.inlineTokens(match[1])
                }
                this.lexer.state.inLink = false;
                window._backrefs.push(atagFor(Note.ARTICLE_KIND, match[1], PageContext.instance.note.authorPubkey));
                window._backrefs.push(atagFor(Note.TOPIC_KIND, match[1], PageContext.instance.note.authorPubkey));
                return token;
            }
            return false;
            }
        };

        window._backrefs = [];
        marked.use({ tokenizer });
        marked.use(markedKatex({ throwOnError: true }));
        return {
            html: DOMPurify.sanitize(marked.parse(markdown)),
            backrefs: window._backrefs,
        }
    }
}
window.MarkdownRenderer = MarkdownRenderer;
