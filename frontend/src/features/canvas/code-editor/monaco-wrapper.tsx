import { Suspense, lazy, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { VirtualFile } from "../types";

// Lazy load Monaco to avoid ~4MB blocking initial paint
const Editor = lazy(() => import("@monaco-editor/react"));

interface MonacoWrapperProps {
  file: VirtualFile | null;
  onChange: (value: string) => void;
  /** Monotonic epoch — skip onChange when this value matches the last programmatic set */
  externalEpoch: number;
}

function EditorFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-xs">Loading editor...</span>
    </div>
  );
}

export function MonacoWrapper({
  file,
  onChange,
  externalEpoch,
}: Readonly<MonacoWrapperProps>) {
  const lastEpochRef = useRef(externalEpoch);
  const editorRef = useRef<unknown>(null);

  // Track when external updates happen so we can skip the onChange callback
  useEffect(() => {
    if (externalEpoch !== lastEpochRef.current) {
      lastEpochRef.current = externalEpoch;
    }
  }, [externalEpoch]);

  const handleEditorDidMount = useCallback((editor: unknown) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      // Skip if this change was triggered by an external epoch update
      if (lastEpochRef.current !== externalEpoch) {
        lastEpochRef.current = externalEpoch;
        return;
      }
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange, externalEpoch],
  );

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
        Select a file to edit
      </div>
    );
  }

  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor
        height="100%"
        language={file.language}
        value={file.content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly: file.readOnly,
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          suggest: {
            showWords: false,
          },
        }}
        loading={<EditorFallback />}
      />
    </Suspense>
  );
}
