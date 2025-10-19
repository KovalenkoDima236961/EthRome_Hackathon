# CertifyChain — A Secure Bridge from Online Certificates to Verifiable soulbound Tokens
<img width="1172" height="819" alt="image" src="https://github.com/user-attachments/assets/9407e9c2-5ed2-4be0-81b0-30a8251c2c38" />

Today, the number of fake and forged certificates is growing quickly, making it hard to know which ones are real. Certificates from platforms like Udemy, Coursera, AWS, or Cisco can be checked manually, but this process is slow and not practical for many users.

CertifyChain solves this problem by letting users create a soulbound NFT from their verified certificate. This token works as clear, on-chain proof that the certificate is real, original, and not fake.

CertifyChain is a platform that transforms traditional Web2 course certificates — such as those issued by platforms like Udemy — into soulbound NFT tokens on the blockchain. These tokens serve as verifiable proof that a specific user has successfully obtained a given certificate. In other words, CertifyChain acts as a bridge between Web2 achievements and the Web3 ecosystem.

To issue a token, the user simply uploads their certificate in PDF format. The system then performs a two-step verification process:

- Server-side validation — the certificate is verified through the issuing authority’s API to confirm its authenticity. For current version of project it was created functionality to verify the certificate for Udemy, but in the same way it caan be expanded for another platforms like: Coursera, AWS, Cisco etc.

- On-chain validation — the system checks that no identical certificate has been minted before, ensuring its uniqueness.

Once both checks are successfully completed, the user can mint a soulbound NFT directly to their wallet. This NFT permanently proves ownership of the specific certificate and cannot be transferred, making it a trustworthy credential in the Web3 world.

<img width="707" height="728" alt="image" src="https://github.com/user-attachments/assets/16603c7c-a68e-47d2-8769-884b207280e8" />

Server-side verification is performed by checking the certificate ID through the issuing authority’s API. For example, each Udemy certificate includes a unique certificate hash, which is used to confirm its authenticity.

<img width="1581" height="771" alt="image" src="https://github.com/user-attachments/assets/ad5c8a5d-ca97-4432-b7be-691c174fc72a" />

The certificate hash is automatically extracted using AI-powered OCR (Optical Character Recognition) algorithms. Once identified, the backend sends a verification request to the certificate authority’s API to confirm its authenticity.

If a user submits an invalid certificate, the verification process will reject it, and the transaction will be reverted.

<img width="1574" height="731" alt="image" src="https://github.com/user-attachments/assets/0e6b1900-60bd-47cf-b618-8f5f0f30fe96" />

<img width="677" height="610" alt="image" src="https://github.com/user-attachments/assets/34c4c4e6-505f-4cd8-855d-2fc68a695e2d" />

After successful verification, the system encrypts the entire certificate file and sends it to the smart contract, which checks whether this certificate has already been published on-chain.

Finally, the user can mint a soulbound NFT, which serves as a verifiable, non-transferable proof of certificate ownership.

**Non-decrypted view (Private NFT)**  
<img src="https://github.com/user-attachments/assets/9af77182-bb90-47ea-b16c-8e60896214cd" alt="Non-decrypted view of the Private NFT" width="420">

**Dencrypted view (Private NFT)**  
<img src="https://github.com/user-attachments/assets/54f09eb2-d4ac-47e4-b6bb-230f537bed4b" alt="Encrypted view of the Private NFT" width="420">

## Controlled Disclosure and Access
“View” NFTs let the holder of a private CertificateNFT share only selected certificate attributes. A View NFT is a non-transferable token that points to the base certificate and encodes an access policy (time-limited and/or link-gated). Only the certificate holder can mint a View NFT, ensuring holder-controlled disclosure.

How it works:
The holder decrypts their private certificate locally with a wallet-derived key (the key and plaintext never leave the device), chooses which fields to reveal, and creates a disclosure package (fields + proofs). They then mint a View NFT that references the base certificate and locks its transfer.

Disclosure modes:
-	Public view: the selected fields (and their proofs) are published as open JSON.
-	Link-based view: the selected fields (and proofs) are encrypted client-side; access is granted via a shareable link that automatically expires at the time set by the holder.

After minting, the contract stores the reference to the base certificate and marks the View NFT as locked (non-transferable). The holder can create multiple View NFTs with different field sets and expirations for different audiences.

## Verification Paths
Next step (after completing View NFTs): add zero-knowledge verification so anyone can confirm that a disclosed attribute in a View NFT comes from its underlying private CertificateNFT—without trusting our backend and without seeing raw values, salts, or Merkle branches.

Main idea: the holder generates a zk proof off-chain that recomputes the commitment from the selected fields to the certificate’s on-chain Merkle root. The smart contract verifies this proof, ties it to a fixed code identity, and checks it against the root stored in CertificateNFT. This delivers content-based verification, protects privacy, prevents replay, and avoids reliance on a trusted setup. We plan to implement this with a general-purpose zkVM (e.g., RISC Zero) so we can keep the workflow simple while enabling on-chain verification of the proof.

## Potential Impact on Polkadot
Safer OpenGov, bounties, and grants.
DAOs and treasuries can require proof of specific skills (e.g., Rust/Substrate, security) for proposers, curators, or bounty hunters—reducing spam, sybil abuse, and misaligned incentives while speeding due diligence.
Privacy-preserving disclosures by default.
Holder-controlled, selective disclosure (now) and zk verification (next) let users prove the parts that matter (course, issuer, date, level) without exposing the full document—aligning with Polkadot’s user-centric, multi-chain design. (Potential synergies with Phala/TEE and zkVMs.)

## Local Setup
To run the app locally, use the README inside each subfolder.

### Frontend
Go to frontend/ and follow frontend/README.md for install and run steps.

### Backend
Go to backend/ and follow backend/README.md for install and run steps.

### IPFS CORS preflight (run this before using the app) (required)
Before you start working with the app that talks to your local IPFS (Kubo) node, verify that CORS is properly configured for your frontend origin (e.g., http://localhost:5173). Use the helper script check-ipfs-cors.sh.
How to run it
```bash
chmod +x check-ipfs-cors.sh
./check-ipfs-cors.sh
```
- If you see ✅ CORS is properly configured, you’re good to go.
- If you see ❌ CORS is not properly configured, follow the printed ipfs config commands, then restart the daemon and run the script again.

Docker users: If you run IPFS in Docker, run the ipfs config ... commands inside the container (e.g., docker exec -it <container_name> sh), make sure ports 5001 (API) and 8080 (gateway) are published, and that the config is persisted via a volume.

### Local IPFS (required)
Install and run a local IPFS (Kubo) node. Ensure the HTTP API is reachable at http://localhost:5001 (gateway typically http://localhost:8080). Start it with:
```bash
ipfs init   # first time only
ipfs daemon
```
You may also use the ipfs service in docker-compose.yml.


### Docker Compose status (backend)
At the moment, the docker-compose.yml does not work for the backend service. Please run the backend outside Docker (per backend/README.md). The compose file may still be used for the IPFS service and the frontend dev server.
