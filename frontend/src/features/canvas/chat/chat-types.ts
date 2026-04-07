export interface ChatStreamTokenEvent {
  type: "token";
  text: string;
}

export interface ChatStreamHtmlBlockEvent {
  type: "html_block";
  slide_index: number;
  html: string;
}

export interface ChatStreamElementPatchEvent {
  type: "element_patch";
  slide_index: number;
  css_path: string;
  updated_outer_html: string;
}

export interface ChatStreamDoneEvent {
  type: "done";
}

export interface ChatStreamErrorEvent {
  type: "error";
  message: string;
  code?: string;
  category?: string;
  hint?: string;
  retryable?: boolean;
}

export type ChatStreamEvent =
  | ChatStreamTokenEvent
  | ChatStreamHtmlBlockEvent
  | ChatStreamElementPatchEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;

export interface ChatStreamCallbacks {
  onToken: (text: string) => void;
  onHtmlBlock: (slideIndex: number, html: string) => void;
  onElementPatch: (
    slideIndex: number,
    cssPath: string,
    updatedOuterHtml: string,
  ) => void;
  onDone: () => void;
  onError: (error: ChatStreamErrorEvent) => void;
}
