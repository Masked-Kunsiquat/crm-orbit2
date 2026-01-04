```
PS C:\Users\blain\Documents\GitHub\expo-crm\CRMOrbit> npx tsc
domains/sync/automergeSync.ts:70:33 - error TS2345: Argument of type 'AutomergeDoc' is not assignable to parameter of type 'FreezeObject<{ organizations: Record<string, Organization>; accounts: Record<string, Account>; contacts: Record<string, Contact>; ... 4 more ...; relations: { ...; }; }>'.
  Types of property 'organizations' are incompatible.
    Type 'Record<string, Organization>' is not assignable to type 'FreezeObject<Record<string, Organization>>'.
      'string' index signatures are incompatible.
        Type 'Organization' is not assignable to type 'FreezeObject<Organization>'.
          Types of property 'metadata' are incompatible.
            Type 'Record<string, unknown> | undefined' is not assignable to type 'FreezeObject<Record<string, unknown>> | undefined'.
              Type 'Record<string, unknown>' is not assignable to type 'FreezeObject<Record<string, unknown>>'.
                'string' index signatures are incompatible.
                  Type 'unknown' is not assignable to type 'FreezeObject<unknown>'.

70       : Automerge.getAllChanges(currentDoc);
                                   ~~~~~~~~~~

domains/sync/automergeSync.ts:102:43 - error TS2345: Argument of type 'AutomergeDoc' is not assignable to parameter of type 'FreezeObject<{ organizations: Record<string, Organization>; accounts: Record<string, Account>; contacts: Record<string, Contact>; ... 4 more ...; relations: { ...; }; }>'.
  Types of property 'organizations' are incompatible.
    Type 'Record<string, Organization>' is not assignable to type 'FreezeObject<Record<string, Organization>>'.
      'string' index signatures are incompatible.
        Type 'Organization' is not assignable to type 'FreezeObject<Organization>'.
          Types of property 'metadata' are incompatible.
            Type 'Record<string, unknown> | undefined' is not assignable to type 'FreezeObject<Record<string, unknown>> | undefined'.
              Type 'Record<string, unknown>' is not assignable to type 'FreezeObject<Record<string, unknown>>'.
                'string' index signatures are incompatible.
                  Type 'unknown' is not assignable to type 'FreezeObject<unknown>'.

102     const newDoc = Automerge.applyChanges(currentDoc, decodedChanges);
                                              ~~~~~~~~~~

domains/sync/automergeSync.ts:122:37 - error TS2345: Argument of type 'AutomergeDoc' is not assignable to parameter of type 'FreezeObject<{ organizations: Record<string, Organization>; accounts: Record<string, Account>; contacts: Record<string, Contact>; ... 4 more ...; relations: { ...; }; }>'.
  Types of property 'organizations' are incompatible.
    Type 'Record<string, Organization>' is not assignable to type 'FreezeObject<Record<string, Organization>>'.
      'string' index signatures are incompatible.
        Type 'Organization' is not assignable to type 'FreezeObject<Organization>'.
          Types of property 'metadata' are incompatible.
            Type 'Record<string, unknown> | undefined' is not assignable to type 'FreezeObject<Record<string, unknown>> | undefined'.
              Type 'Record<string, unknown>' is not assignable to type 'FreezeObject<Record<string, unknown>>'.
                'string' index signatures are incompatible.
                  Type 'unknown' is not assignable to type 'FreezeObject<unknown>'.

122     const snapshot = Automerge.save(doc);
                                        ~~~

domains/sync/localNetworkSync.ts:2:22 - error TS7016: Could not find a declaration file for module 'react-native-zeroconf'. 'C:/Users/blain/Documents/GitHub/expo-crm/CRMOrbit/node_modules/react-native-zeroconf/dist/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/react-native-zeroconf` if it exists or add a new declaration (.d.ts) file containing `declare module 'react-native-zeroconf';`

2 import Zeroconf from "react-native-zeroconf";
                       ~~~~~~~~~~~~~~~~~~~~~~~

domains/sync/localNetworkSync.ts:26:3 - error TS2300: Duplicate identifier 'on'.

26   on: (event: "resolved", handler: (service: ZeroconfService) => void) => void;
     ~~

domains/sync/localNetworkSync.ts:27:3 - error TS2300: Duplicate identifier 'on'.

27   on: (event: "remove", handler: (service: ZeroconfService) => void) => void;
     ~~

domains/sync/localNetworkSync.ts:27:3 - error TS2717: Subsequent property declarations must have the same type.  Property 'on' must be of type '(event: "resolved", handler: (service: ZeroconfService) => void) => void', but here has type '(event: "remove", handler: (service: ZeroconfService) => void) => void'.

27   on: (event: "remove", handler: (service: ZeroconfService) => void) => void;
     ~~

  domains/sync/localNetworkSync.ts:26:3
    26   on: (event: "resolved", handler: (service: ZeroconfService) => void) => void;
         ~~
    'on' was also declared here.

domains/sync/localNetworkSync.ts:28:3 - error TS2300: Duplicate identifier 'on'.

28   on: (event: "error", handler: (error: unknown) => void) => void;
     ~~

domains/sync/localNetworkSync.ts:28:3 - error TS2717: Subsequent property declarations must have the same type.  Property 'on' must be of type '(event: "resolved", handler: (service: ZeroconfService) => void) => void', but here has type '(event: "error", handler: (error: unknown) => void) => void'.

28   on: (event: "error", handler: (error: unknown) => void) => void;
     ~~

  domains/sync/localNetworkSync.ts:26:3
    26   on: (event: "resolved", handler: (service: ZeroconfService) => void) => void;
         ~~
    'on' was also declared here.

domains/sync/localNetworkSync.ts:145:5 - error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'Uint8Array<ArrayBuffer>'.
  Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
    Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength

145     buffer = concatBuffers(buffer, chunk);
        ~~~~~~

domains/sync/localNetworkSync.ts:202:22 - error TS2345: Argument of type '"remove"' is not assignable to parameter of type '"resolved"'.

202     this.zeroconf.on("remove", (service) => {
                         ~~~~~~~~

domains/sync/localNetworkSync.ts:210:22 - error TS2345: Argument of type '"error"' is not assignable to parameter of type '"resolved"'.

210     this.zeroconf.on("error", (error) => {
                         ~~~~~~~

domains/sync/webrtcSync.ts:122:22 - error TS2339: Property 'onopen' does not exist on type 'RTCDataChannel'.

122     this.dataChannel.onopen = () => {
                         ~~~~~~

domains/sync/webrtcSync.ts:126:22 - error TS2339: Property 'onmessage' does not exist on type 'RTCDataChannel'.

126     this.dataChannel.onmessage = (event: { data: unknown }) => {
                         ~~~~~~~~~

domains/sync/webrtcSync.ts:133:22 - error TS2339: Property 'onerror' does not exist on type 'RTCDataChannel'.

133     this.dataChannel.onerror = (error: unknown) => {
                         ~~~~~~~

domains/sync/webrtcSync.ts:141:20 - error TS2339: Property 'ondatachannel' does not exist on type 'RTCPeerConnection'.     

141     peerConnection.ondatachannel = (event: {
                       ~~~~~~~~~~~~~

domains/sync/webrtcSync.ts:152:20 - error TS2551: Property 'onicecandidate' does not exist on type 'RTCPeerConnection'. Did you mean 'addIceCandidate'?

152     peerConnection.onicecandidate = (event: { candidate?: unknown }) => {
                       ~~~~~~~~~~~~~~

  node_modules/react-native-webrtc/lib/typescript/RTCPeerConnection.d.ts:70:5
    70     addIceCandidate(candidate: any): Promise<void>;
           ~~~~~~~~~~~~~~~
    'addIceCandidate' is declared here.

domains/sync/webrtcSync.ts:174:26 - error TS2339: Property 'removeEventListener' does not exist on type 'RTCPeerConnection'.

174           peerConnection.removeEventListener("icegatheringstatechange", handler);
                             ~~~~~~~~~~~~~~~~~~~

domains/sync/webrtcSync.ts:179:22 - error TS2339: Property 'addEventListener' does not exist on type 'RTCPeerConnection'.  

179       peerConnection.addEventListener("icegatheringstatechange", handler);
                         ~~~~~~~~~~~~~~~~


Found 19 errors in 3 files.

Errors  Files
     3  domains/sync/automergeSync.ts:70
     9  domains/sync/localNetworkSync.ts:2
     7  domains/sync/webrtcSync.ts:122
PS C:\Users\blain\Documents\GitHub\expo-crm\CRMOrbit> 
```