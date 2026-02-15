/**
 * @generated SignedSource<<01ac667780642633f84cf48ae783c749>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ConnectedUserFragment_user$data = {
  readonly clientId: string | null | undefined;
  readonly emailAddress: {
    readonly address: string;
    readonly createdAt: any | null | undefined;
    readonly id: string;
    readonly lastValidationRequestAt: any | null | undefined;
    readonly updatedAt: any | null | undefined;
    readonly validatedAt: any | null | undefined;
  };
  readonly id: string;
  readonly language: {
    readonly code: string;
    readonly id: string;
  };
  readonly privateData: {
    readonly firstName: string | null | undefined;
    readonly gender: {
      readonly code: string;
      readonly id: string;
    } | null | undefined;
    readonly lastName: string | null | undefined;
  } | null | undefined;
  readonly status: {
    readonly code: string;
    readonly id: string;
  };
  readonly " $fragmentType": "ConnectedUserFragment_user";
};
export type ConnectedUserFragment_user$key = {
  readonly " $data"?: ConnectedUserFragment_user$data;
  readonly " $fragmentSpreads": FragmentRefs<"ConnectedUserFragment_user">;
};

const node: ReaderFragment = (function(){
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
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ConnectedUserFragment_user",
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
        }
      ],
      "storageKey": null
    }
  ],
  "type": "UserNode",
  "abstractKey": null
};
})();

(node as any).hash = "be884da6a0b3dc538f08a2a609730684";

export default node;
