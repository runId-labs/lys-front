import React, {useState, useCallback, useMemo} from "react";
import {ChatbotContext} from "./hooks";
import {ChatMessage, RefreshSignal} from "./types";
import RefreshSignalContext from "../LysQueryProvider/RefreshSignalContext";

interface ChatbotProviderProps {
    children: React.ReactNode;
}

/**
 * ChatbotProvider component
 *
 * Provides global chatbot state management:
 * - Message history persistence across page navigation
 * - Conversation ID tracking
 * - Chatbot mode state (open/closed)
 *
 * Place this provider high in the component tree (above RouteProvider)
 * to ensure state persists across route changes.
 */
const ChatbotProvider: React.FC<ChatbotProviderProps> = ({children}) => {
    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isChatbotMode, setIsChatbotMode] = useState<boolean>(false);
    const [isChatbotEnabled, setIsChatbotEnabled] = useState<boolean>(true);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [refreshSignal, setRefreshSignal] = useState<RefreshSignal>({nodes: [], version: 0});

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Add a single message to the conversation
     */
    const addMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    }, []);

    /**
     * Append content to the last assistant message (for streaming)
     */
    const updateLastMessage = useCallback((contentDelta: string) => {
        setMessages(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.role !== "assistant") return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {...last, content: last.content + contentDelta};
            return updated;
        });
    }, []);

    /**
     * Clear the conversation and reset state
     */
    const clearConversation = useCallback(() => {
        setMessages([]);
        setConversationId(null);
    }, []);

    /**
     * Trigger a refresh signal for the specified node types
     * LysQueryProvider instances listening to these nodes will refetch their data
     */
    const triggerRefresh = useCallback((nodes: string[]) => {
        setRefreshSignal(prev => ({
            nodes,
            version: prev.version + 1
        }));
    }, []);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    const contextValue = useMemo(() => ({
        messages,
        conversationId,
        isChatbotMode,
        isChatbotEnabled,
        isStreaming,
        refreshSignal,
        setMessages,
        setConversationId,
        setIsChatbotMode,
        setIsChatbotEnabled,
        setIsStreaming,
        addMessage,
        updateLastMessage,
        clearConversation,
        triggerRefresh
    }), [messages, conversationId, isChatbotMode, isChatbotEnabled, isStreaming, refreshSignal, addMessage, updateLastMessage, clearConversation, triggerRefresh]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <ChatbotContext.Provider value={contextValue}>
            <RefreshSignalContext.Provider value={refreshSignal}>
                {children}
            </RefreshSignalContext.Provider>
        </ChatbotContext.Provider>
    );
};

export default ChatbotProvider;
