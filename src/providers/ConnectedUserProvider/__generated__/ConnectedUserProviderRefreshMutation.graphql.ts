/**
 * @generated SignedSource<<ef60feb678597d8526aef19f960a05e6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ConnectedUserProviderRefreshMutation$variables = Record<PropertyKey, never>;
export type ConnectedUserProviderRefreshMutation$data = {
  readonly refreshAccessToken: {
    readonly accessTokenExpireIn: number;
    readonly success: boolean;
    readonly xsrfToken: string;
  };
};
export type ConnectedUserProviderRefreshMutation = {
  response: ConnectedUserProviderRefreshMutation$data;
  variables: ConnectedUserProviderRefreshMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "LoginNode",
    "kind": "LinkedField",
    "name": "refreshAccessToken",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "success",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "accessTokenExpireIn",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "xsrfToken",
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
    "name": "ConnectedUserProviderRefreshMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ConnectedUserProviderRefreshMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "d8f0fefdfba04eb7d4aa3bee34d0991c",
    "id": null,
    "metadata": {},
    "name": "ConnectedUserProviderRefreshMutation",
    "operationKind": "mutation",
    "text": "mutation ConnectedUserProviderRefreshMutation {\n  refreshAccessToken {\n    success\n    accessTokenExpireIn\n    xsrfToken\n  }\n}\n"
  }
};
})();

(node as any).hash = "acbdb2f87ce474c94ae5a7b4ca0769c8";

export default node;
