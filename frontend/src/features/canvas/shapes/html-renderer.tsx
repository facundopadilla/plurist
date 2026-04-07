import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { renderHtmlIntoShadowHost } from "./html-render-utils";

interface HtmlRendererProps {
  html: string;
  width: number;
  height: number;
  formatWidth: number;
  formatHeight: number;
  isEditing?: boolean;
  className?: string;
  dataExportTarget?: string;
  globalStyles?: string;
}

export interface HtmlRendererHandle {
  /** The shadow host element — used by InlineEditController */
  getHost: () => HTMLDivElement | null;
}

export const HtmlRenderer = forwardRef<HtmlRendererHandle, HtmlRendererProps>(
  function HtmlRenderer(
    {
      html,
      width,
      height,
      formatWidth,
      formatHeight,
      isEditing = false,
      className,
      dataExportTarget,
      globalStyles,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      getHost: () => hostRef.current,
    }));

    useLayoutEffect(() => {
      if (!hostRef.current) return;
      renderHtmlIntoShadowHost(
        hostRef.current,
        html,
        width,
        height,
        formatWidth,
        formatHeight,
        globalStyles,
      );
    }, [html, width, height, formatWidth, formatHeight, globalStyles]);

    return (
      <div
        ref={hostRef}
        className={className}
        data-export-target={dataExportTarget}
        style={{
          width,
          height,
          pointerEvents: isEditing ? "all" : "none",
        }}
      />
    );
  },
);
