# Chatbot — provider and frontend actions

Source: `src/providers/ChatbotProvider/`, `src/providers/PageContextProvider/`.

## State (useChatbot)

`{messages, conversationId, isChatbotMode, isChatbotEnabled, isStreaming,
refreshSignal, addMessage, updateLastMessage, setConversationId,
setIsChatbotMode, setIsStreaming, triggerRefresh}`.

The provider is keyed by user id internally — the whole chat state resets on
account switch (no cross-account leaks). Mount it INSIDE
`ConnectedUserProvider` and ABOVE the router so history survives navigation.

## Page context (chatbot awareness)

`PageContextProvider` exposes `{pageName, params}` — the chatbot backend uses
it to scope answers to the current page. `RouteProvider` feeds it; `route`
options `autoOpenChatbot` / `showChatbotWelcome` control chatbot behaviour on
arrival.

## FrontendAction (backend-driven UI actions)

The streaming chat response may carry `frontendActions`: typed actions the
FRONT executes — `navigate` (path + params substitution, optional
`continueAction`), `refresh` (node types), plus PROJECT-DEFINED types
(e.g. proposals) that the application's chat panel interprets. Generic
navigation/refresh live in the framework; anything richer belongs to the
app's chat component.

## RULES

- **R1 — One chat entry point per app**: an app-level chat component owns the
  UI (messages, input, streaming states); the provider owns state. Don't
  duplicate state slices locally.
- **R2 — Streaming messages update in place** (`updateLastMessage`) — append
  only on new turns.
- **R3 — Tool activity labels are app content**: backend tool names must be
  mapped to human labels by the app's chat component; never surface raw tool
  names.
- **R4 — Never render `frontendActions` verbatim** — interpret them.
