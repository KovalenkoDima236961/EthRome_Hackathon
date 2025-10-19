# CertifyChain — A Secure Bridge from Online Certificates to Verifiable Self-Bound Tokens
<img width="1172" height="819" alt="image" src="https://github.com/user-attachments/assets/9407e9c2-5ed2-4be0-81b0-30a8251c2c38" />

Today, the number of fake and forged certificates is growing quickly, making it hard to know which ones are real. Certificates from platforms like Udemy, Coursera, AWS, or Cisco can be checked manually, but this process is slow and not practical for many users.

CertifyChain solves this problem by letting users create a self-bound NFT from their verified certificate. This token works as clear, on-chain proof that the certificate is real, original, and not fake.

CertifyChain is a platform that transforms traditional Web2 course certificates — such as those issued by platforms like Udemy — into self-bound NFT tokens on the blockchain. These tokens serve as verifiable proof that a specific user has successfully obtained a given certificate. In other words, CertifyChain acts as a bridge between Web2 achievements and the Web3 ecosystem.

To issue a token, the user simply uploads their certificate in PDF format. The system then performs a two-step verification process:

- Server-side validation — the certificate is verified through the issuing authority’s API to confirm its authenticity. For current version of project it was created functionality to verify the certificate for Udemy, but in the same way it caan be expanded for another platforms like: Coursera, AWS, Cisco etc.

- On-chain validation — the system checks that no identical certificate has been minted before, ensuring its uniqueness.

Once both checks are successfully completed, the user can mint a self-bound NFT directly to their wallet. This NFT permanently proves ownership of the specific certificate and cannot be transferred, making it a trustworthy credential in the Web3 world.

<img width="707" height="728" alt="image" src="https://github.com/user-attachments/assets/16603c7c-a68e-47d2-8769-884b207280e8" />

Server-side verification is performed by checking the certificate ID through the issuing authority’s API. For example, each Udemy certificate includes a unique certificate hash, which is used to confirm its authenticity.

<img width="1581" height="771" alt="image" src="https://github.com/user-attachments/assets/ad5c8a5d-ca97-4432-b7be-691c174fc72a" />

The certificate hash is automatically extracted using AI-powered OCR (Optical Character Recognition) algorithms. Once identified, the backend sends a verification request to the certificate authority’s API to confirm its authenticity.

If a user submits an invalid certificate, the verification process will reject it, and the transaction will be reverted.

<img width="1574" height="731" alt="image" src="https://github.com/user-attachments/assets/0e6b1900-60bd-47cf-b618-8f5f0f30fe96" />

<img width="677" height="610" alt="image" src="https://github.com/user-attachments/assets/34c4c4e6-505f-4cd8-855d-2fc68a695e2d" />

After successful verification, the system encrypts the entire certificate file and sends it to the smart contract, which checks whether this certificate has already been published on-chain.

Finally, the user can mint a self-bound NFT, which serves as a verifiable, non-transferable proof of certificate ownership.

# TODO: картинка с нашего сайта как выглядит отображение токенов

Authentication based on Zero-Knowledge (ZK) proofs ensure that users are properly authenticated and cannot submit third-party certificates.

ZK-proof integration has already been successfully implemented for Ethereum first-version prototype, but deployment on Polkadot encountered several technical problems. As a result, this feature was not included in the current version of the project, but it remains a key priority for future releases.

ZK-proof workflow:

# TODO: распиши как это работает, коротко, но четко, покажи картинки и диаграмы из твоей бакаларки
