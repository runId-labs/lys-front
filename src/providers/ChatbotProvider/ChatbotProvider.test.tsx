import {describe, it, expect} from "vitest";
import {render, act, screen} from "@testing-library/react";
import ChatbotProvider from "./index";
import {useChatbot} from "./hooks";
import {ChatbotContextValue} from "./types";
import {useRefreshSignal, RefreshSignal} from "../LysQueryProvider/RefreshSignalContext";

/**
 * Test consumer exposing chatbot context
 */
const ChatbotConsumer = ({onValue}: {onValue: (ctx: ChatbotContextValue) => void}) => {
    const ctx = useChatbot();
    onValue(ctx);
    return <div>Messages: {ctx.messages.length}</div>;
};

function renderChatbotProvider() {
    let latestCtx: ChatbotContextValue | null = null;

    const result = render(
        <ChatbotProvider>
            <ChatbotConsumer onValue={(v) => {latestCtx = v;}}/>
        </ChatbotProvider>
    );

    return {result, getCtx: () => latestCtx!};
}

describe("ChatbotProvider", () => {
    it("renders children", () => {
        renderChatbotProvider();

        expect(screen.getByText("Messages: 0")).toBeInTheDocument();
    });

    describe("initial state", () => {
        it("starts with empty messages", () => {
            const {getCtx} = renderChatbotProvider();

            expect(getCtx().messages).toEqual([]);
        });

        it("starts with null conversationId", () => {
            const {getCtx} = renderChatbotProvider();

            expect(getCtx().conversationId).toBeNull();
        });

        it("starts with chatbot mode off", () => {
            const {getCtx} = renderChatbotProvider();

            expect(getCtx().isChatbotMode).toBe(false);
        });

        it("starts with chatbot enabled", () => {
            const {getCtx} = renderChatbotProvider();

            expect(getCtx().isChatbotEnabled).toBe(true);
        });

        it("starts with empty refresh signal", () => {
            const {getCtx} = renderChatbotProvider();

            expect(getCtx().refreshSignal).toEqual({nodes: [], version: 0});
        });
    });

    describe("messages", () => {
        it("adds a message", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().addMessage({role: "user", content: "Hello"});
            });

            expect(getCtx().messages).toHaveLength(1);
            expect(getCtx().messages[0]).toEqual({role: "user", content: "Hello"});
        });

        it("accumulates messages", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().addMessage({role: "user", content: "Hello"});
            });

            act(() => {
                getCtx().addMessage({role: "assistant", content: "Hi there!"});
            });

            expect(getCtx().messages).toHaveLength(2);
            expect(getCtx().messages[1].role).toBe("assistant");
        });

        it("sets messages directly", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().setMessages([
                    {role: "system", content: "System prompt"},
                    {role: "user", content: "Test"},
                ]);
            });

            expect(getCtx().messages).toHaveLength(2);
        });
    });

    describe("conversation", () => {
        it("sets conversation ID", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().setConversationId("conv-123");
            });

            expect(getCtx().conversationId).toBe("conv-123");
        });

        it("clears conversation (messages and ID)", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().addMessage({role: "user", content: "Test"});
                getCtx().setConversationId("conv-123");
            });

            act(() => {
                getCtx().clearConversation();
            });

            expect(getCtx().messages).toEqual([]);
            expect(getCtx().conversationId).toBeNull();
        });
    });

    describe("chatbot mode", () => {
        it("toggles chatbot mode", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().setIsChatbotMode(true);
            });

            expect(getCtx().isChatbotMode).toBe(true);

            act(() => {
                getCtx().setIsChatbotMode(false);
            });

            expect(getCtx().isChatbotMode).toBe(false);
        });

        it("toggles chatbot enabled", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().setIsChatbotEnabled(false);
            });

            expect(getCtx().isChatbotEnabled).toBe(false);
        });
    });

    describe("refresh signal", () => {
        it("triggers refresh with node types", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().triggerRefresh(["UserNode", "CompanyNode"]);
            });

            expect(getCtx().refreshSignal.nodes).toEqual(["UserNode", "CompanyNode"]);
            expect(getCtx().refreshSignal.version).toBe(1);
        });

        it("increments version on each trigger", () => {
            const {getCtx} = renderChatbotProvider();

            act(() => {
                getCtx().triggerRefresh(["UserNode"]);
            });

            act(() => {
                getCtx().triggerRefresh(["CompanyNode"]);
            });

            expect(getCtx().refreshSignal.version).toBe(2);
            expect(getCtx().refreshSignal.nodes).toEqual(["CompanyNode"]);
        });
    });

    describe("RefreshSignalContext integration", () => {
        it("provides refreshSignal via RefreshSignalContext", () => {
            let signal: RefreshSignal | null = null;

            const SignalConsumer = () => {
                signal = useRefreshSignal();
                return null;
            };

            render(
                <ChatbotProvider>
                    <SignalConsumer/>
                </ChatbotProvider>
            );

            expect(signal).toEqual({nodes: [], version: 0});
        });

        it("updates RefreshSignalContext when triggerRefresh is called", () => {
            let signal: RefreshSignal | null = null;
            let chatbotCtx: ChatbotContextValue | null = null;

            const Consumer = () => {
                signal = useRefreshSignal();
                chatbotCtx = useChatbot();
                return null;
            };

            render(
                <ChatbotProvider>
                    <Consumer/>
                </ChatbotProvider>
            );

            act(() => {
                chatbotCtx!.triggerRefresh(["UserNode"]);
            });

            expect(signal).toEqual({nodes: ["UserNode"], version: 1});
        });
    });

    describe("useChatbot (outside provider)", () => {
        it("throws when used outside ChatbotProvider", () => {
            const ThrowingConsumer = () => {
                useChatbot();
                return null;
            };

            expect(() => render(<ThrowingConsumer/>)).toThrow(
                "useChatbot must be used within a ChatbotProvider"
            );
        });
    });
});
