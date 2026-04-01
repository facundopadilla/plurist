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
          label="Editar código"
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
        <MenuSubmenu id="html-shape-current-variant" label="Variant actual">
          <MenuGroup id="html-shape-current-variant-group">
            <TldrawUiMenuItem
              id="html-shape-variant-rename"
              label="Renombrar variant actual"
              onSelect={() => {
                renameCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-variant-duplicate"
              label="Duplicar variant actual"
              onSelect={() => {
                duplicateCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-variant-delete"
              label="Eliminar variant actual"
              onSelect={() => {
                removeCurrentHtmlShapeVariant(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-copy" label="Copiar">
          <MenuGroup id="html-shape-copy-group">
            <TldrawUiMenuItem
              id="html-shape-copy-html"
              label="Copiar código HTML"
              onSelect={() => {
                void copyHtmlShapeCode(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-copy-png"
              label="Copiar como PNG"
              onSelect={() => {
                void copyHtmlShapeAsPng(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-copy-jpg"
              label="Copiar como JPG"
              onSelect={() => {
                void copyHtmlShapeAsJpg(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-download" label="Descargar">
          <MenuGroup id="html-shape-download-group">
            <TldrawUiMenuItem
              id="html-shape-download-png"
              label="Descargar PNG"
              onSelect={() => {
                void exportHtmlShapeToPng(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-jpg"
              label="Descargar JPG"
              onSelect={() => {
                void exportHtmlShapeToJpg(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-html"
              label="Descargar HTML"
              onSelect={() => {
                void downloadHtmlShapeCode(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-svg"
              label="Descargar SVG"
              onSelect={() => {
                void exportHtmlShapeToSvg(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-download-bundle"
              label="Descargar bundle"
              onSelect={() => {
                void downloadHtmlShapeExportBundle(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-ai" label="IA">
          <MenuGroup id="html-shape-ai-group">
            <TldrawUiMenuItem
              id="html-shape-ai-generate"
              label="Generar variante"
              onSelect={() => {
                openHtmlShapeContextualAi(shape.props.slideId, "generate");
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-ai-regenerate"
              label="Volver a generar"
              onSelect={() => {
                openHtmlShapeContextualAi(shape.props.slideId, "regenerate");
              }}
            />
          </MenuGroup>
          <MenuSubmenu
            id="html-shape-ai-responsive"
            label="Variantes responsive"
          >
            <MenuGroup id="html-shape-ai-responsive-group">
              <TldrawUiMenuItem
                id="html-shape-ai-mobile"
                label="Generar para mobile"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "mobile");
                }}
              />
              <TldrawUiMenuItem
                id="html-shape-ai-tablet"
                label="Generar para tablet"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "tablet");
                }}
              />
              <TldrawUiMenuItem
                id="html-shape-ai-desktop"
                label="Generar para desktop"
                onSelect={() => {
                  openHtmlShapeContextualAi(shape.props.slideId, "desktop");
                }}
              />
            </MenuGroup>
          </MenuSubmenu>
        </MenuSubmenu>
        <MenuSubmenu id="html-shape-organization" label="Organización">
          <MenuGroup id="html-shape-organization-group">
            <TldrawUiMenuItem
              id="html-shape-toggle-favorite"
              label={
                slide?.isFavorite
                  ? "Quitar de favoritos"
                  : "Marcar como favorito"
              }
              onSelect={() => {
                toggleHtmlShapeFavorite(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-rename"
              label="Renombrar frame"
              onSelect={() => {
                renameHtmlShape(shape.props.slideId);
              }}
            />
            <TldrawUiMenuItem
              id="html-shape-add-annotation"
              label="Agregar anotación"
              onSelect={() => {
                addHtmlShapeAnnotation(shape.props.slideId);
              }}
            />
          </MenuGroup>
        </MenuSubmenu>
      </MenuGroup>

      <div className="my-1 border-t border-border/60" />

      <MenuGroup
        id="html-shape-destructive"
        className="[&_.tlui-button]:text-destructive [&_.tlui-button]:hover:text-destructive"
      >
        <TldrawUiMenuItem
          id="html-shape-delete"
          label="Eliminar"
          onSelect={() => {
            deleteHtmlShape(shape.props.slideId, shape.id);
          }}
        />
      </MenuGroup>
    </>
  );
}

export function SocialClawContextMenu(props: TLUiContextMenuProps) {
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
