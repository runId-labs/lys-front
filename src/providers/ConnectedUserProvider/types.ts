import * as React from "react";

/**
 * ConnectedUserProvider props
 */
export interface ConnectedUserProviderProps {
    children: React.ReactNode
}

/**
 * ConnectedUserProvider ref interface
 */
export interface ConnectedUserProviderRefInterface {
    language: string | undefined
}

/**
 * Email address interface
 */
export interface EmailAddressInterface {
    id: string
    address: string
    createdAt: string | undefined
    updatedAt: string | undefined
    validatedAt: string | undefined
    lastValidationRequestAt: string | undefined
}

/**
 * Language interface
 */
export interface LanguageInterface {
    id: string
    code: string
}

/**
 * User status interface
 */
export interface UserStatusInterface {
    id: string
    code: string
}

/**
 * Private data interface
 */
export interface PrivateDataInterface {
    firstName: string | null
    lastName: string | null
    gender: GenderInterface | null
}

/**
 * Gender interface
 */
export interface GenderInterface {
    id: string
    code: string
}

/**
 * Connected user interface
 */
export interface ConnectedUserInterface {
    id: string
    clientId: string | null
    emailAddress: EmailAddressInterface
    status: UserStatusInterface
    language: LanguageInterface
    privateData: PrivateDataInterface | null
}
