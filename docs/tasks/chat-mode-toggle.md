# Chat Mode Toggle (Plan vs Build)

## Overview

Add a toggle in the chat interface to switch between "Plan" mode (ideation/copywriting without HTML generation) and "Build" mode (default HTML generation).

## Tasks

### Backend

1. [x] Modify `apps/generation/chat_api.py`:
   - Add `mode: str = "build"` to `ChatStreamIn` schema.
   - Pass `mode` to `stream_chat`.
2. [x] Modify `apps/generation/chat_service.py`:
   - Accept `mode` parameter in `stream_chat`.
   - Pass `mode` to `build_design_prompt`.
3. [x] Modify `apps/generation/prompt_builder.py`:
   - Accept `mode` in `build_design_prompt`.
   - If `mode == "plan"`, change the system prompt to ask the AI to act as a Social Media Art Director and Copywriter. Instruct it to discuss strategy and copy using Markdown, and strictly forbid generating HTML or HTML tags.
   - If `mode == "build"`, use the existing HTML generation prompt.

### Frontend

4. [x] Modify `features/canvas/canvas-store.ts`:
   - Add `chatMode: "plan" | "build"` to state.
   - Add `setChatMode: (mode: "plan" | "build") => void`.
5. [x] Modify `features/canvas/chat/use-chat-stream.ts`:
   - Add `mode` to `ChatStreamParams`.
   - Send `mode` in the JSON body.
6. [x] Modify `features/canvas/chat/chat-sidebar.tsx`:
   - Add a UI toggle (segmented control or pill buttons) above the chat input to switch between `Planear 🧠` and `Construir 🏗️`.
   - Update the `sendMessage` call to include `mode: chatMode`.
   - Add a keyboard shortcut: If user presses `Tab` while the input is empty, toggle the mode instead of changing focus. Prevent default behavior in this case.
