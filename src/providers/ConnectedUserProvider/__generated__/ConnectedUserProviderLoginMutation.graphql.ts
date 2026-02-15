/**
 * @generated SignedSource<<df4394fb203bc9d769f54a19ff82c88b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LoginInput = {
  login: string;
  password: string;
};
export type ConnectedUserProviderLoginMutation$variables = {
  inputs: LoginInput;
};
export type ConnectedUserProviderLoginMutation$data = {
  readonly login: {
    readonly accessTokenExpireIn: number;
    readonly success: boolean;
    readonly xsrfToken: string;
  };
};
export type ConnectedUserProviderLoginMutation = {
  response: ConnectedUserProviderLoginMutation$data;
  variables: ConnectedUserProviderLoginMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "inputs"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "inputs",
        "variableName": "inputs"
      }
    ],
    "concreteType": "LoginNode",
    "kind": "LinkedField",
    "name": "login",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ConnectedUserProviderLoginMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ConnectedUserProviderLoginMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "99e672b3c15baa2a34b730cc8794299f",
    "id": null,
    "metadata": {},
    "name": "ConnectedUserProviderLoginMutation",
    "operationKind": "mutation",
    "text": "mutation ConnectedUserProviderLoginMutation(\n  $inputs: LoginInput!\n) {\n  login(inputs: $inputs) {\n    success\n    accessTokenExpireIn\n    xsrfToken\n  }\n}\n"
  }
};
})();

(node as any).hash = "2a03da8b6fb25fbb7f5171fa53732b31";

export default node;
