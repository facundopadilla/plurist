import type { RecordProps, TLShape } from "tldraw";
import { T } from "tldraw";

export const HTML_SHAPE_TYPE = "html-shape" as const;

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [HTML_SHAPE_TYPE]: HtmlShapeProps;
  }
}

export interface HtmlShapeProps {
  w: number;
  h: number;
  html: string;
  slideId: string;
  slideIndex: number;
  /** Original format width the AI designed the HTML for (e.g. 1080). */
  formatWidth: number;
  /** Original format height the AI designed the HTML for (e.g. 1080). */
  formatHeight: number;
}

export const htmlShapeProps: RecordProps<TLShape<typeof HTML_SHAPE_TYPE>> = {
  w: T.number,
  h: T.number,
  html: T.string,
  slideId: T.string,
  slideIndex: T.number,
  formatWidth: T.number,
  formatHeight: T.number,
};

export type HtmlShape = TLShape<typeof HTML_SHAPE_TYPE>;
