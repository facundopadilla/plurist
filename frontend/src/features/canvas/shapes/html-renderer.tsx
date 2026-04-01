import { useLayoutEffect, useRef } from "react";
import { renderHtmlIntoShadowHost } from "./html-render-utils";

interface HtmlRendererProps {
  html: string;
  width: number;
  height: number;
  className?: string;
  dataExportTarget?: string;
}

export function HtmlRenderer({
  html,
  width,
  height,
  className,
  dataExportTarget,
}: HtmlRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!hostRef.current) return;
    renderHtmlIntoShadowHost(hostRef.current, html, width, height);
  }, [html, width, height]);

  return (
    <div
      ref={hostRef}
      className={className}
      data-export-target={dataExportTarget}
      style={{ width, height }}
    />
  );
}
