/**
 * @generated SignedSource<<656875e1bf06623a68fff1a35296db4e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ConnectedUserProviderQuery$variables = Record<PropertyKey, never>;
export type ConnectedUserProviderQuery$data = {
  readonly connectedUser: {
    readonly " $fragmentSpreads": FragmentRefs<"ConnectedUserFragment_user">;
  } | null | undefined;
};
export type ConnectedUserProviderQuery = {
  response: ConnectedUserProviderQuery$data;
  variables: ConnectedUserProviderQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = [
  (v0/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "code",
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ConnectedUserProviderQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "UserNode",
        "kind": "LinkedField",
        "name": "connectedUser",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "ConnectedUserFragment_user"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ConnectedUserProviderQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "UserNode",
        "kind": "LinkedField",
        "name": "connectedUser",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "clientId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "UserEmailAddressNode",
            "kind": "LinkedField",
            "name": "emailAddress",
            "plural": false,
            "selections": [
              (v0/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "address",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "createdAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "updatedAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "validatedAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "lastValidationRequestAt",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "UserStatusNode",
            "kind": "LinkedField",
            "name": "status",
            "plural": false,
            "selections": (v1/*: any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "LanguageNode",
            "kind": "LinkedField",
            "name": "language",
            "plural": false,
            "selections": (v1/*: any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "UserPrivateDataNode",
            "kind": "LinkedField",
            "name": "privateData",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "firstName",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "lastName",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "GenderNode",
                "kind": "LinkedField",
                "name": "gender",
                "plural": false,
                "selections": (v1/*: any*/),
                "storageKey": null
              },
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "654e16a74dc1101f903a371ee713c943",
    "id": null,
    "metadata": {},
    "name": "ConnectedUserProviderQuery",
    "operationKind": "query",
    "text": "query ConnectedUserProviderQuery {\n  connectedUser {\n    ...ConnectedUserFragment_user\n    id\n  }\n}\n\nfragment ConnectedUserFragment_user on UserNode {\n  id\n  clientId\n  emailAddress {\n    id\n    address\n    createdAt\n    updatedAt\n    validatedAt\n    lastValidationRequestAt\n  }\n  status {\n    id\n    code\n  }\n  language {\n    id\n    code\n  }\n  privateData {\n    firstName\n    lastName\n    gender {\n      id\n      code\n    }\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "d5fbaec2a40f0880257954b852fe81fa";

export default node;
