import { Extension, textblockTypeInputRule } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import { looksLikeMarkdown, markdownToStoryHtml } from '@/lib/markdown';

// The story editor already formats Markdown as you type it (**bold**, ## heading, - list,
// > quote, ---). This adds what it misses: "# " for a heading (stories use the two smaller
// heading sizes), and Markdown pasted from elsewhere (ChatGPT, notes apps, .md files)
// turning into formatting instead of showing its symbols.

/** Clipboard HTML that already carries formatting (Google Docs, Word, web pages) is pasted as is. */
const FORMATTED_HTML = /<(strong|b|em|i|u|s|h[1-6]|li|blockquote|a)[\s>]/i;

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    return [textblockTypeInputRule({ find: /^#\s$/, type: this.editor.schema.nodes.heading, getAttributes: { level: 2 } })];
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            const html = event.clipboardData?.getData('text/html') ?? '';
            if (!looksLikeMarkdown(text) || FORMATTED_HTML.test(html)) return false;
            return editor.commands.insertContent(markdownToStoryHtml(text));
          },
        },
      }),
    ];
  },
});
