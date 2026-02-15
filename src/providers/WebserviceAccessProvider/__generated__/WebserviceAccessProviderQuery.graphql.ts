/**
 * @generated SignedSource<<b99811e5597cf9c9977b594fb31cbe59>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type WebserviceAccessProviderQuery$variables = Record<PropertyKey, never>;
export type WebserviceAccessProviderQuery$data = {
  readonly allAccessibleWebservices: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly code: string;
        readonly userAccessLevels: ReadonlyArray<{
          readonly code: string;
        }>;
      };
    }>;
  };
};
export type WebserviceAccessProviderQuery = {
  response: WebserviceAccessProviderQuery$data;
  variables: WebserviceAccessProviderQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "code",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "WebserviceAccessProviderQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AccessedWebserviceNodeListConnection",
        "kind": "LinkedField",
        "name": "allAccessibleWebservices",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "AccessedWebserviceNodeEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "AccessedWebserviceNode",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  (v0/*: any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "AccessLevelNode",
                    "kind": "LinkedField",
                    "name": "userAccessLevels",
                    "plural": true,
                    "selections": [
                      (v0/*: any*/)
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
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
    "name": "WebserviceAccessProviderQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AccessedWebserviceNodeListConnection",
        "kind": "LinkedField",
        "name": "allAccessibleWebservices",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "AccessedWebserviceNodeEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "AccessedWebserviceNode",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  (v0/*: any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "AccessLevelNode",
                    "kind": "LinkedField",
                    "name": "userAccessLevels",
                    "plural": true,
                    "selections": [
                      (v0/*: any*/),
                      (v1/*: any*/)
                    ],
                    "storageKey": null
                  },
                  (v1/*: any*/)
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "0eb745d5632c205d2b339ac945f97748",
    "id": null,
    "metadata": {},
    "name": "WebserviceAccessProviderQuery",
    "operationKind": "query",
    "text": "query WebserviceAccessProviderQuery {\n  allAccessibleWebservices {\n    edges {\n      node {\n        code\n        userAccessLevels {\n          code\n          id\n        }\n        id\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "fc09839e36fcabc6d7704f800685b5a2";

export default node;
