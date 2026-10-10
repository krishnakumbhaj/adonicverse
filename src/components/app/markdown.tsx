import { Fragment } from 'react';
import { marked, type Token } from 'marked';
import { MARKDOWN_OPTIONS } from '@/lib/markdown';
import { cx } from './primitives';

// Shows text people wrote in Markdown. It builds React elements from the parsed text (never raw
// HTML), so whatever anyone types is shown, not run; HTML in the text appears as typed.

const SAFE_LINK = /^(https?:|mailto:)/i;

export function Markdown({ text, compact, className }: { text: string; compact?: boolean; className?: string }) {
  return <div className={cx('break-words', compact ? 'space-y-1.5' : 'space-y-3', className)}>{blocks(marked.lexer(text, MARKDOWN_OPTIONS))}</div>;
}

function blocks(tokens: Token[]): React.ReactNode[] {
  return tokens.map((token, key) => {
    switch (token.type) {
      case 'paragraph':
        return <p key={key}>{inline(token.tokens)}</p>;
      case 'heading':
        return (
          <p key={key} className="font-bold text-pal-text">
            {inline(token.tokens)}
          </p>
        );
      case 'list': {
        const List = token.ordered ? 'ol' : 'ul';
        return (
          <List key={key} start={token.ordered && token.start !== '' ? Number(token.start) : undefined} className={cx('space-y-1 pl-5', token.ordered ? 'list-decimal' : 'list-disc')}>
            {token.items.map((item: { tokens: Token[] }, index: number) => (
              <li key={index}>{blocks(item.tokens)}</li>
            ))}
          </List>
        );
      }
      case 'blockquote':
        return (
          <blockquote key={key} className="space-y-3 border-l-2 border-pal-muted pl-3 italic">
            {blocks(token.tokens ?? [])}
          </blockquote>
        );
      case 'hr':
        return <hr key={key} className="border-pal-highlight" />;
      case 'code':
        return (
          <pre key={key} className="whitespace-pre-wrap rounded bg-white/[.06] p-3 font-mono text-sm">
            {token.text}
          </pre>
        );
      case 'text': // the text of a list item
        return <Fragment key={key}>{token.tokens ? inline(token.tokens) : token.text}</Fragment>;
      case 'space':
        return null;
      default: // raw HTML, tables…: shown as typed
        return (
          <p key={key} className="whitespace-pre-line">
            {token.raw}
          </p>
        );
    }
  });
}

function inline(tokens: Token[] = []): React.ReactNode[] {
  return tokens.map((token, key) => {
    switch (token.type) {
      case 'strong':
        return (
          <strong key={key} className="font-bold">
            {inline(token.tokens)}
          </strong>
        );
      case 'em':
        return <em key={key}>{inline(token.tokens)}</em>;
      case 'del':
        return <s key={key}>{inline(token.tokens)}</s>;
      case 'codespan':
        return (
          <code key={key} className="rounded bg-white/10 px-1 font-mono text-[.9em]">
            {token.text}
          </code>
        );
      case 'br':
        return <br key={key} />;
      case 'link':
        return SAFE_LINK.test(token.href) ? (
          <a key={key} href={token.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline hover:text-pal-text">
            {inline(token.tokens)}
          </a>
        ) : (
          <Fragment key={key}>{inline(token.tokens)}</Fragment>
        );
      case 'image':
        return <Fragment key={key}>{token.text}</Fragment>;
      case 'text':
      case 'escape':
        return <Fragment key={key}>{'tokens' in token && token.tokens ? inline(token.tokens) : token.text}</Fragment>;
      default: // inline HTML: shown as typed
        return <Fragment key={key}>{token.raw}</Fragment>;
    }
  });
}
