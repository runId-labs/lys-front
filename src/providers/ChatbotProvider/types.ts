export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface FrontendAction {
    type: string;
    path?: string | null;
    params?: Record<string, unknown> | null;
    nodes?: string[] | null;
    continueAction?: boolean | null;
}

export interface AIMessage {
    content: string;
    conversationId: string | null;
    toolCallsCount: number;
    toolResults: AIToolResult[] | null;
    frontendActions: FrontendAction[] | null;
    message: string;
}

export interface AIToolResult {
    toolName: string;
    result: string;
    success: boolean;
}

export interface RefreshSignal {
    nodes: string[];
    version: number;
}

export interface ChatbotContextValue {
    messages: ChatMessage[];
    conversationId: string | null;
    isChatbotMode: boolean;
    isChatbotEnabled: boolean;
    isStreaming: boolean;
    refreshSignal: RefreshSignal;
    setMessages: (messages: ChatMessage[]) => void;
    setConversationId: (id: string | null) => void;
    setIsChatbotMode: (mode: boolean) => void;
    setIsChatbotEnabled: (enabled: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
    addMessage: (message: ChatMessage) => void;
    updateLastMessage: (contentDelta: string) => void;
    clearConversation: () => void;
    triggerRefresh: (nodes: string[]) => void;
}
