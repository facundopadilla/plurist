export interface ChatStreamTokenEvent {
  type: "token";
  text: string;
}

export interface ChatStreamHtmlBlockEvent {
  type: "html_block";
  slide_index: number;
  html: string;
}

export interface ChatStreamDoneEvent {
  type: "done";
}

export interface ChatStreamErrorEvent {
  type: "error";
  message: string;
}

export type ChatStreamEvent =
  | ChatStreamTokenEvent
  | ChatStreamHtmlBlockEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;

export interface ChatStreamCallbacks {
  onToken: (text: string) => void;
  onHtmlBlock: (slideIndex: number, html: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}
