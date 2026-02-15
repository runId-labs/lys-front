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
     * Merge new messages into the state
     */
    const handleMerge = useCallback((messages_: { text: string; level: string }[]) => {
        if (messages_.length > 0) {
            const datedMessages = messages_.map((message) => {
                // Log to console
                const logMethod = message.level === "CRITICAL" || message.level === "ERROR"
                    ? console.error
                    : message.level === "WARNING"
                    ? console.warn
                    : console.log;

                logMethod(`[${message.level}]`, message.text);

                // Generate unique ID
                messageIdCounter.current += 1;
                const uniqueId = `alert-${Date.now()}-${messageIdCounter.current}`;

                return {
                    ...message,
                    id: uniqueId,
                    createdAt: new Date()
                }
            }) as DatedAlertMessageType[];
            setMessages(prev => [...prev, ...datedMessages]);
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
