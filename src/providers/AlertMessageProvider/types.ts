import * as React from "react";

/**
 * Alert level types
 */
export type AlertLevelType = "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "SUCCESS"

/**
 * Alert message interface
 */
export interface AlertMessageInterface {
    text: string
    level: AlertLevelType
}

/**
 * Alert message with timestamp, unique ID, and occurrence count
 */
export type DatedAlertMessageType = AlertMessageInterface & {
    id: string;
    createdAt: Date;
    count: number;
}

/**
 * Alert generator function type
 * Takes messages and a remove callback, returns React node to render
 */
export type AlertGeneratorFunction = (
    messages: DatedAlertMessageType[],
    onRemove: (index: number) => void
) => React.ReactNode;

/**
 * AlertMessageProvider props
 */
export interface AlertMessageProviderProps {
    children: React.ReactNode;
    alertGenerator: AlertGeneratorFunction;
}
