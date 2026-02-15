import {graphql} from "react-relay";

/**
 * ConnectedUser fragment
 *
 * Defines all fields needed for the connected user across the application.
 * Used in:
 * - login mutation
 * - refreshAccessToken mutation
 *
 * Relay automatically updates the cache when this fragment is returned from mutations.
 * This fragment ensures consistency in user data structure and eliminates duplication.
 */
export const ConnectedUserFragment = graphql`
    fragment ConnectedUserFragment_user on UserNode {
        id
        clientId
        emailAddress {
            id
            address
            createdAt
            updatedAt
            validatedAt
            lastValidationRequestAt
        }
        status {
            id
            code
        }
        language {
            id
            code
        }
        privateData {
            firstName
            lastName
            gender {
                id
                code
            }
        }
    }
`;
