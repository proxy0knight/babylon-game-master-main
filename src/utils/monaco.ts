// Configure Monaco workers for Vite environments
// This prevents errors like "You must define MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker"

// Import worker constructors via Vite's ?worker syntax
// These imports are tree-shaken if not used
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-ignore
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// @ts-ignore
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// @ts-ignore
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// @ts-ignore
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

declare global {
  interface Window {
    MonacoWorkersConfigured?: boolean;
    MonacoEnvironment?: any;
  }
}

export function ensureMonacoConfigured(): void {
  if (typeof window === 'undefined') return;
  if (window.MonacoWorkersConfigured) return;

  window.MonacoEnvironment = {
    getWorker(_: string, label: string) {
      if (label === 'json') return new JsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      return new EditorWorker();
    }
  };

  window.MonacoWorkersConfigured = true;
}


