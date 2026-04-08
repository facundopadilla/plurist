import type { ReactElement } from "react";
import {
  DefaultContextMenu,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  type TLUiContextMenuProps,
  type TLUiMenuGroupProps,
  type TLUiMenuSubmenuProps,
  useEditor,
} from "tldraw";
import { getSelectedHtmlShape } from "./get-selected-html-shape";
import {
  addHtmlShapeAnnotation,
  copyHtmlShapeAsJpg,
  copyHtmlShapeAsPng,
  copyHtmlShapeCode,
  deleteHtmlShape,
  duplicateCurrentHtmlShapeVariant,
  duplicateHtmlShape,
  downloadHtmlShapeExportBundle,
  downloadHtmlShapeCode,
  exportHtmlShapeToJpg,
  exportHtmlShapeToPng,
  exportHtmlShapeToSvg,
  openHtmlShapeContextualAi,
  openHtmlShapeEditor,
  removeCurrentHtmlShapeVariant,
  renameHtmlShape,
  renameCurrentHtmlShapeVariant,
  toggleHtmlShapeFavorite,
} from "./html-shape-actions";
import { useCanvasStore } from "../canvas-store";

type MenuGroupComponent = (
  props: TLUiMenuGroupProps<string>,
) => ReactElement | null;
type MenuSubmenuComponent = (
  props: TLUiMenuSubmenuProps<string>,
) => ReactElement | null;

const MenuGroup = TldrawUiMenuGroup as unknown as MenuGroupComponent;
const MenuSubmenu = TldrawUiMenuSubmenu as unknown as MenuSubmenuComponent;

function HtmlShapeContextMenuContent() {
  const editor = useEditor();
  const shape = getSelectedHtmlShape(editor);
  const slide = useCanvasStore((state) =>
    shape ? state.slides.get(shape.props.slideId) : undefined,
  );

  if (!shape) {
    return null;
  }

  return (
    <>
      <MenuGroup id="html-shape-primary">
        <TldrawUiMenuItem
          id="html-shape-edit-code"
          label="Edit code"
          onSelect={() => {
            openHtmlShapeEditor(editor, shape.id);
          }}
        />
        <TldrawUiMenuItem
          id="html-shape-duplicate"
          label="Duplicar frame"
          onSelect={() => {
            duplicateHtmlShape(shape.props.slideId);
          }}
        />
        <MenuSubmenu id="html-shape-current-variant" label="Current variant">
          <MenuGroup id="html-shape-current-variant-group">
            <TldrawUiMenuItem
              id="html-shape-variant-rename"
              label="Rename current variant"
              onSelect={() => {
                renameCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-variant-duplicate"
              label="Duplicate current variant"
              onSelect={() => {
                duplicateCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-variant-delete"
              label="Delete current variant"
              onSelect={() => {
                removeCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-copy" label="Copy">
          <MenuGroup id="html-shape-copy-group">
            <TldrawUiMenuItem
              id="html-shape-copy-html"
              label="Copy HTML code"
              onSelect={() => {
                copyHtmlShapeCode(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-copy-png"
              label="Copy as PNG"
              onSelect={() => {
                copyHtmlShapeAsPng(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-copy-jpg"
              label="Copy as JPG"
              onSelect={() => {
                copyHtmlShapeAsJpg(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-download" label="Download">
          <MenuGroup id="html-shape-download-group">
            <TldrawUiMenuItem
              id="html-shape-download-png"
              label="Download PNG"
              onSelect={() => {
                exportHtmlShapeToPng(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-jpg"
              label="Download JPG"
              onSelect={() => {
                exportHtmlShapeToJpg(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-html"
              label="Download HTML"
              onSelect={() => {
                downloadHtmlShapeCode(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-svg"
              label="Download SVG"
              onSelect={() => {
                exportHtmlShapeToSvg(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-bundle"
              label="Download bundle"
              onSelect={() => {
                downloadHtmlShapeExportBundle(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-ai" label="AI">
          <MenuGroup id="html-shape-ai-group">
            <TldrawUiMenuItem
              id="html-shape-ai-generate"
              label="Generate variant"
              onSelect={() => {
                openHtmlShapeContextualAi(shape.props.slideId, "generate");
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-ai-generate-variants"
              label="Generate variants (multi-provider)"
              onSelect={() => {
                openHtmlShapeContextualAi(
                  shape.props.slideId,
                  "generate-variants",
                );
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-ai-regenerate"
              label="Regenerate"
              onSelect={() => {
                openHtmlShapeContextualAi(shape.props.slideId, "regenerate");
              }}
            />
          </MenuGroup>
          <MenuSubmenu
            id="html-shape-ai-responsive"
            label="Responsive variants"
          >
            <MenuGroup id="html-shape-ai-responsive-group">
              <TldrawUiMenuItem
                id="html-shape-ai-mobile"
                label="Generate for mobile"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "mobile");
                }}
              />
              <TldrawUiMenuItem
                id="html-shape-ai-tablet"
                label="Generate for tablet"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "tablet");
                }}
              />
              <TldrawUiMenuItem
                id="html-shape-ai-desktop"
                label="Generate for desktop"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "desktop");
                }}
              />
            </MenuGroup>
          </MenuSubmenu>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-organization" label="Organization">
          <MenuGroup id="html-shape-organization-group">
            <TldrawUiMenuItem
              id="html-shape-toggle-favorite"
              label={
                slide?.isFavorite ? "Remove from favorites" : "Mark as favorite"
              }
              onSelect={() => {
                toggleHtmlShapeFavorite(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-rename"
              label="Rename frame"
              onSelect={() => {
                renameHtmlShape(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-add-annotation"
              label="Add annotation"
              onSelect={() => {
                addHtmlShapeAnnotation(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
      </MenuGroup>

      <div className="my-1 border-t border-zinc-800/60" />

      <MenuGroup
        id="html-shape-destructive"
        className="[&_.tlui-button]:text-destructive [&_.tlui-button]:hover:text-destructive"
      >
        <TldrawUiMenuItem
          id="html-shape-delete"
          label="Delete"
          onSelect={() => {
            deleteHtmlShape(shape.props.slideId, shape.id);
          }}
        />
      </MenuGroup>
    </>
  );
}

export function PluristContextMenu(props: Readonly<TLUiContextMenuProps>) {
  const editor = useEditor();
  const selectedHtmlShape = getSelectedHtmlShape(editor);

  if (!selectedHtmlShape) {
    return <DefaultContextMenu {...props} />;
  }

  return (
    <DefaultContextMenu {...props}>
      <HtmlShapeContextMenuContent />
    </DefaultContextMenu>
  );
}
