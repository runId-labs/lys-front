import * as React from "react";
import {useState, useCallback, useRef} from "react";
import {
    AlertMessageProviderProps,
    DatedAlertMessageType
} from "./types";
import { AlertMessageContext } from "./hooks";

/**
 * Alert message provider
 * Manages centralized alert/error display
 *
 * Requires an alertGenerator function to render alerts.
 */
const AlertMessageProvider: React.ComponentType<AlertMessageProviderProps> = (
    {
        children,
        alertGenerator,
    }) => {

    /*******************************************************************************************************************
     *                                                      STATES
     * ****************************************************************************************************************/

    const [messages, setMessages] = useState<DatedAlertMessageType[]>([])
    const messageIdCounter = useRef(0);

    /*******************************************************************************************************************
     *                                                      CALLBACKS
     * ****************************************************************************************************************/

    /**
     * Remove a message by index
     */
    const handleRemove = useCallback((index: number) => {
        setMessages(prev => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Merge new messages into the state.
     * Messages matching an existing one on both text and level are not duplicated:
     * the existing entry's count is incremented and its createdAt refreshed instead.
     */
    const handleMerge = useCallback((messages_: { text: string; level: string }[]) => {
        if (messages_.length > 0) {
            setMessages(prev => {
                const next = [...prev];

                messages_.forEach((message) => {
                    // Log to console
                    const logMethod = message.level === "CRITICAL" || message.level === "ERROR"
                        ? console.error
                        : message.level === "WARNING"
                        ? console.warn
                        : console.log;

                    logMethod(`[${message.level}]`, message.text);

                    const existingIndex = next.findIndex(
                        (existing) => existing.text === message.text && existing.level === message.level
                    );

                    if (existingIndex !== -1) {
                        next[existingIndex] = {
                            ...next[existingIndex],
                            count: next[existingIndex].count + 1,
                            createdAt: new Date()
                        };
                        return;
                    }

                    // Generate unique ID
                    messageIdCounter.current += 1;
                    const uniqueId = `alert-${Date.now()}-${messageIdCounter.current}`;

                    next.push({
                        ...message,
                        id: uniqueId,
                        createdAt: new Date(),
                        count: 1
                    } as DatedAlertMessageType);
                });

                return next;
            });
        }
    }, []);

    /*******************************************************************************************************************
     *                                                      RENDER
     * ****************************************************************************************************************/

    return(
        <>
            <AlertMessageContext.Provider value={{
                merge: handleMerge
            }}>
                {children}
            </AlertMessageContext.Provider>
            {alertGenerator(messages, handleRemove)}
        </>
    );
};

export default AlertMessageProvider;
