/**
 * Shared types for the editor subsystem (iframe-bridge + edit-mode-overlay).
 */

/**
 * Imperative handle for accessing the underlying HTMLIFrameElement
 * from parent components via useRef / useImperativeHandle.
 */
export interface SlideIframeHandle {
  getIframe: () => HTMLIFrameElement | null;
}
