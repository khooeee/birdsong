import "./mermaidDiagram.css";

/** A rendered mermaid SVG. Safe to inject: mermaid's strict security level sanitizes it. */
export function MermaidDiagram({ svg }: { svg: string }) {
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
