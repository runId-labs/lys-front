import {GraphQLTaggedNode} from "relay-runtime";

/**
 * Extract operation names from a GraphQL query or mutation
 * Used for permission checking based on webservice names
 */
export function extractOperationNames(node: GraphQLTaggedNode): string[] {
    const operationNames: string[] = [];

    if ('operation' in node && node.operation) {
        const operation = node.operation as unknown as Record<string, unknown>;
        if ('selections' in operation && Array.isArray(operation.selections)) {
            operation.selections.forEach((selection) => {
                if (selection && typeof selection === 'object' && 'name' in selection) {
                    operationNames.push(selection.name as string);
                }
            });
        }
    }

    return operationNames;
}

/**
 * Check if user has permission to access all operations
 * Note: checkWebserviceAccess handles snake_case conversion internally
 */
export function checkOperationsPermission(
    operationNames: string[],
    checkWebserviceAccess: (name: string) => boolean
): boolean {
    if (!operationNames.length) {
        return false;
    }

    return operationNames.every(operationName =>
        checkWebserviceAccess(operationName)
    );
}
