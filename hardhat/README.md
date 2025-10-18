# QualifyPro — Polkadot Hardhat Project

This repository contains a Hardhat setup for deploying and interacting with **soulbound certificate NFTs** on a Polkadot environment via the `@parity/hardhat-polkadot` plugin.

It includes two ERC‑721-based contracts:
- **CertificatePrivateNFT** — the _soulbound_ (non‑transferable) private certificate NFT that stores an immutable tokenURI and a Merkle root of selected certificate fields. It supports owner‑only minting _and_ EIP‑712 issuer‑signed minting. Implements **IERC5192 (Locked/Unlocked)** semantics.
- **CertificateViewNFT** — a _soulbound_ view-pass NFT linked to a specific private certificate. It exposes an **expirable** `tokenURI` (IPFS with selected fields) and simple getters. Also implements **IERC5192**.

---

## Table of contents
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running a local Polkadot VM + adapter](#running-a-local-polkadot-vm--adapter)
- [Deployments (Ignition)](#deployments-ignition)
  - [1) Deploy `CertificatePrivateNFT`](#1-deploy-certificateprivatenft)
  - [2) Deploy `CertificateViewNFT` linked to the private NFT](#2-deploy-certificateviewnft-linked-to-the-private-nft)
- [Verify basic interactions](#verify-basic-interactions)
- [EIP‑712 issuer‑signed mint flow](#eip712-issuer-signed-mint-flow)
- [Contract reference](#contract-reference)
- [License](#license)

---

## Architecture

```
Private certificate (soulbound) ──┐
  • immutable tokenURI            ├──> View NFT (soulbound, expirable tokenURI)
  • Merkle root per token         ┘
  • optional EIP‑712 issuer signature
```

Both NFTs are **non‑transferable** and emit **IERC5192** `Locked/Unlocked` events. Burning rules differ slightly per contract (see reference).

---

## Repository layout

```
contracts/
  CertifcatePrivateNFT.sol            CertificatePrivateNFT implementation
  CertificateViewNFT.sol            # View NFT implementation
  interfaces/
    IERC5192.sol                    # Minimal IERC5192 interface

ignition/
  modules/
    CertificatePrivateNFT.ts        # Ignition module: deploys Private NFT
    CertificateViewNFT.ts           # Ignition module: (needs link to Private NFT)

hardhat.config.ts                   # Hardhat + @parity/hardhat-polkadot config
README.md                           # You are here
```

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Hardhat** toolchain (installed via `pnpm i` / `npm i`)
- **Polkadot VM dev node** and **eth‑rpc adapter** binaries
  - `revive-dev-node` (PolkaVM node)
  - `eth-rpc-adapter` (Ethereum compatibility RPC)
- A Unix-like shell (macOS/Linux/WSL) is recommended

> You can build these from the Polkadot SDK or use prebuilt binaries. Place them under `./bin/` as shown below.

```
bin/
  revive-dev-node     # executable
  eth-rpc             # executable (or rename your eth-rpc-adapter binary to 'eth-rpc')
```

---

## Setup

Install dependencies:

```bash
npm install
```

Check `hardhat.config.ts` — make sure paths match your binaries:

```ts
nodeConfig: {
  nodeBinaryPath: './bin/revive-dev-node',
  rpcPort: 8000,
  dev: true,
},
adapterConfig: {
  adapterBinaryPath: "./bin/eth-rpc",
  dev: true,
},
```

---

## Running a local Polkadot VM + adapter

You have two options:

### A) Let Hardhat spin them up (recommended)

This project is set so that **`npx hardhat node`** will start the PolkaVM node and the adapter using the paths in `hardhat.config.ts`.

```bash
npx hardhat node
```

Leave this terminal running.

### B) Start them manually (advanced)

If you prefer, run your `revive-dev-node` and `eth-rpc` manually, then point Hardhat to the `localNode` network:

```bash
# Terminal 1
./bin/revive-dev-node --dev --rpc-port 8000

# Terminal 2
./bin/eth-rpc --dev --substrate-ws ws://127.0.0.1:8000

# In another terminal, use the localNode network
npx hardhat console --network localNode
```

---

## Deployments (Ignition)

> **Important:** The provided Ignition module for `CertificateViewNFT` currently does **not** pass the address of the already-deployed `CertificatePrivateNFT` to its constructor. See the **fix** below or deploy via a combined module.

### 1) Deploy `CertificatePrivateNFT`

```bash
# In a new terminal (with the node running)
npx hardhat ignition deploy ./ignition/modules/CertificatePrivateNFT.ts --network localhost
```

Note the deployed **CertificatePrivateNFT** address from the output (e.g. `0x...ABC`).

### 2) Deploy `CertificateViewNFT` linked to the private NFT

Then deploy with the parameter:

```bash
npx hardhat ignition deploy ./ignition/modules/CertificateViewNFT.ts \
  --network localhost \
  --parameters certificatePrivateAddress=0xYourPrivateNFTAddress \
               certificateViewName=QualifyProView
```

---

## Verify basic interactions

Open a Hardhat console:

```bash
npx hardhat console --network localhost
```

Then:

```js
const priv = await ethers.getContractAt("CertificatePrivateNFT", "<PRIVATE_NFT_ADDRESS>");

// Owner-only mint
const to = (await ethers.getSigners())[0].address;
const tokenURI = "ipfs://QmPrivateCertificateJson";
const pdfHash = ethers.zeroPadValue(ethers.id("pdf-bytes"), 32);
const merkleRoot = ethers.zeroPadValue(ethers.id("root-bytes"), 32);

(await priv.mintCertificate(to, tokenURI, pdfHash, merkleRoot)).hash;

// Readbacks
(await priv.tokenURI(1));
(await priv.rootOf(1));
(await priv.locked(1));  // true
```

For the **View NFT** (after deploying and linking to the private NFT):

```js
const view = await ethers.getContractAt("CertificateViewNFT", "<VIEW_NFT_ADDRESS>");

const signer = (await ethers.getSigners())[0];
const fieldsIpfs = "ipfs://QmSelectedFieldsJson";
const certId = 1;
const expiresAt = Math.floor(Date.now()/1000) + 3600; // 1 hour

// Only the certificate **owner** can mint a view NFT
(await view.connect(signer).mintViewNFT(signer.address, certId, fieldsIpfs, expiresAt)).hash;

// tokenURI() reverts with ViewExpired after expiry
(await view.tokenURI(1)); // ok now
```

---

## EIP‑712 issuer‑signed mint flow

`CertificatePrivateNFT` supports a trust‑minimized mint where the contract **owner (issuer)** signs a typed data payload off‑chain and anyone can submit it via `mintWithIssuerSig` until `deadline`.

**Domain:** `EIP712("CertificateNFT", "1")`  
**Typehash:**  
`Mint(address to,bytes32 tokenURIHash,bytes32 pdfHash,bytes32 merkleRoot,uint256 deadline)`

**High-level procedure:**

1. Issuer computes:
   - `tokenURIHash = keccak256(bytes(tokenURI))`
   - a unique `pdfHash` (keccak256 over the PDF bytes)
   - `merkleRoot` (keccak256 root of selected public fields)
   - `deadline` (unix timestamp)
2. Issuer signs the struct using EIP‑712.
3. Anyone calls `mintWithIssuerSig(to, tokenURI, pdfHash, merkleRoot, deadline, signature)`.

**Example (Hardhat script snippet):**

```js
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const contract = await ethers.getContractAt("CertificatePrivateNFT", "<PRIVATE_NFT_ADDRESS>");
const [issuer, recipient] = await ethers.getSigners();

const tokenURI = "ipfs://QmPrivateCertificateJson";
const pdfHash = ethers.zeroPadValue(ethers.id("pdf-raw-bytes"), 32);
const merkleRoot = ethers.zeroPadValue(ethers.id("root-bytes"), 32);
const deadline = Math.floor(Date.now()/1000) + 600;

const domain = { name: "CertificateNFT", version: "1", chainId: 31337, verifyingContract: await contract.getAddress() };
const types = {
  Mint: [
    { name: "to", type: "address" },
    { name: "tokenURIHash", type: "bytes32" },
    { name: "pdfHash", type: "bytes32" },
    { name: "merkleRoot", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
};

const value = {
  to: recipient.address,
  tokenURIHash: keccak256(toUtf8Bytes(tokenURI)),
  pdfHash,
  merkleRoot,
  deadline,
};

const sig = await issuer.signTypedData(domain, types, value);

await contract.connect(recipient).mintWithIssuerSig(
  recipient.address, tokenURI, pdfHash, merkleRoot, deadline, sig
);
```

> The contract prevents replay with `usedDigest[digest]` and disallows reusing the same `pdfHash` across tokens.

---

## Contract reference

### CertificatePrivateNFT

- **Minting**
  - `mintCertificate(address to, string _tokenURI, bytes32 _pdfHash, bytes32 _merkleRoot)` — owner‑only
  - `mintWithIssuerSig(address to, string _tokenURI, bytes32 _pdfHash, bytes32 _merkleRoot, uint256 _deadline, bytes signature)`
- **Burning**
  - `burn(uint256 tokenId)` — allowed by token owner or contract owner; releases the `pdfHash` for reuse and clears `merkleRoots[tokenId]`
- **Views**
  - `rootOf(uint256 tokenId) -> bytes32`
  - `isPdfHashUsed(bytes32 pdfHash) -> bool`
  - `pdfHashOf(uint256 tokenId) -> bytes32`
  - `locked(uint256 tokenId) -> bool` — always true for existing tokens
- **Events**
  - `CertificateMinted(address to, uint256 tokenId, string tokenURI, bytes32 pdfHash, bytes32 merkleRoot)`
  - `CertificateBurned(uint256 tokenId, bytes32 pdfHash)`
  - `Locked(uint256 tokenId)`, `Unlocked(uint256 tokenId)` (IERC5192)
- **Notable errors**
  - `AuthExpired`, `PdfAlreadyUsed`, `SigAlreadyUsed`, `InvalidIssuerSignature`, `NonexistentToken`, `TokenURIAlreadySet`, `Soulbound`, `NotAllowedToBurn`

### CertificateViewNFT

- **Minting**
  - `mintViewNFT(address to, uint256 certificateId, string fieldsIpfs, uint256 expiresAt)` — **only private certificate owner** can mint
- **Burning**
  - `burn(uint256 viewId)` — owner/approved may burn; clears internal `ViewInfo`
- **Views**
  - `tokenURI(uint256 viewId) -> string` — reverts with `ViewExpired` if now > `expiresAt`
  - `getViewData(uint256 viewId) -> (uint256 certificateId, uint256 expiresAt)` — also gated by expiry
  - `isExpired(uint256 viewId) -> bool`
  - `locked(uint256 tokenId) -> bool` — always true for existing tokens
- **Events**
  - `ViewMinted(address to, uint256 viewId, uint256 certId, uint256 expiresAt, string fieldsIpfs)`
  - `ViewBurned(uint256 viewId)`
  - `Locked(uint256 tokenId)`, `Unlocked(uint256 tokenId)` (IERC5192)
- **Notable errors**
  - `BadCertAddress`, `OnlyCertificateHolder`, `ViewExpired`, `NoRootForCertificate` (declared but not used), `NotAllowedToBurnYet`, `Soulbound`

---

## License
