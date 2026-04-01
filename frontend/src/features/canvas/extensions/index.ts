/**
 * Canvas Extensions — public API.
 *
 * Import from here to register extensions or access the registry.
 */
export {
  registerExtension,
  unregisterExtension,
  getExtensions,
  getExtension,
  getExtensionsByCategory,
  clearExtensions,
} from "./registry";

export type {
  CanvasExtension,
  CanvasExtensionMeta,
  ExtensionCategory,
  ExtensionPanelProps,
} from "./registry";
