import { FileTree } from "./file-tree";
import { MonacoWrapper } from "./monaco-wrapper";
import { useEditorSync } from "./use-editor-sync";

/**
 * CodeEditorPanel — wires FileTree + MonacoWrapper + useEditorSync
 * into a unified sidebar panel for editing slides as code.
 */
export function CodeEditorPanel() {
  const {
    files,
    activeFileId,
    activeFile,
    updateEpoch,
    handleFileSelect,
    handleEditorChange,
  } = useEditorSync();

  return (
    <div className="flex h-full flex-col" data-testid="code-editor-panel">
      {/* File tree */}
      <FileTree
        files={files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
      />

      {/* Editor area */}
      <div className="min-h-0 flex-1">
        <MonacoWrapper
          file={activeFile}
          onChange={handleEditorChange}
          externalEpoch={updateEpoch}
        />
      </div>
    </div>
  );
}
