import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownLink } from "../markdown/MarkdownLink";
import { githubMarkdownCss } from "./githubMarkdownCss";
import { GithubMarkdownPre } from "./GithubMarkdownPre";
import { GithubMarkdownCode } from "./GithubMarkdownCode";

const REMARK_PLUGINS = [remarkGfm];
const COMPONENTS: Components = {
  pre: GithubMarkdownPre,
  code: GithubMarkdownCode,
  a: MarkdownLink,
  img: ({ src, alt }) => src && /^https?:/i.test(src) ? <img src={src} alt={alt || ""} /> : <span>{alt}</span>,
};

/** Renders Markdown with GitHub Primer styles (blob Preview tab). */
export function GithubMarkdown({ text, theme }: { text: string; theme: "light" | "dark" }) {
  return (
    <>
      <style>{githubMarkdownCss(theme)}</style>
      <article className="github-markdown-preview">
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} skipHtml components={COMPONENTS}>
          {text}
        </ReactMarkdown>
      </article>
    </>
  );
}
