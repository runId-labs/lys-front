import {createContext, useContext} from "react";
import {ChatbotContextValue} from "./types";

export const ChatbotContext = createContext<ChatbotContextValue | null>(null);

export const useChatbot = (): ChatbotContextValue => {
    const context = useContext(ChatbotContext);
    if (!context) {
        throw new Error("useChatbot must be used within a ChatbotProvider");
    }
    return context;
};
