/// <reference path="./mermaid-types.d.mts" />

let mermaidInited = false;

export async function runMermaid(sourceCode: string) {
  const mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default;
  if (!mermaidInited) {
    mermaidInited = true;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose'
    });
  }
  return await (mermaid.render('mermaid-content', sourceCode) as Promise<{svg: string}>);
}


