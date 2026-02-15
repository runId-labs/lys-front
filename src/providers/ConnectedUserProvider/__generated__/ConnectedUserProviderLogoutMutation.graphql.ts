/**
 * @generated SignedSource<<181ab0892ed33a177cfebc96f2c700aa>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ConnectedUserProviderLogoutMutation$variables = Record<PropertyKey, never>;
export type ConnectedUserProviderLogoutMutation$data = {
  readonly logout: {
    readonly succeed: boolean;
  };
};
export type ConnectedUserProviderLogoutMutation = {
  response: ConnectedUserProviderLogoutMutation$data;
  variables: ConnectedUserProviderLogoutMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "LogoutNode",
    "kind": "LinkedField",
    "name": "logout",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "succeed",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ConnectedUserProviderLogoutMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ConnectedUserProviderLogoutMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "5a1db66cb1f48dc468c728f5386b992f",
    "id": null,
    "metadata": {},
    "name": "ConnectedUserProviderLogoutMutation",
    "operationKind": "mutation",
    "text": "mutation ConnectedUserProviderLogoutMutation {\n  logout {\n    succeed\n  }\n}\n"
  }
};
})();

(node as any).hash = "6b47911be54a6725f5b5744856395d69";

export default node;
