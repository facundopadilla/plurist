module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    // Ban @xyflow/react imports — canvas uses tldraw. See docs/licenses/tldraw-bsl-review.md.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@xyflow/react",
            message:
              "ReactFlow is deprecated in this project. Use tldraw instead. See canvas-v2-tldraw migration.",
          },
        ],
        patterns: [
          {
            group: ["@xyflow/*"],
            message: "All @xyflow packages are deprecated. Use tldraw instead.",
          },
        ],
      },
    ],
  },
};
