# CertifyChain — secure transfer of online certifications into self-bound tokens
<img width="1172" height="819" alt="image" src="https://github.com/user-attachments/assets/9407e9c2-5ed2-4be0-81b0-30a8251c2c38" />

CertifyChain is a platform that transforms traditional Web2 course certificates — such as those issued by platforms like Udemy — into self-bound NFT tokens on the blockchain. These tokens serve as verifiable proof that a specific user has successfully obtained a given certificate. In other words, CertifyChain acts as a bridge between Web2 achievements and the Web3 ecosystem.

To issue a token, the user simply uploads their certificate in PDF format. The system then performs a two-step verification process:

- Server-side validation — the certificate is verified through the issuing authority’s API to confirm its authenticity.

- On-chain validation — the system checks that no identical certificate has been minted before, ensuring its uniqueness.

Once both checks are successfully completed, the user can mint a self-bound NFT directly to their wallet. This NFT permanently proves ownership of the specific certificate and cannot be transferred, making it a trustworthy credential in the Web3 world.

<img width="707" height="728" alt="image" src="https://github.com/user-attachments/assets/16603c7c-a68e-47d2-8769-884b207280e8" />

Server-side verification is performed by checking the certificate ID through the issuing authority’s API. For example, each Udemy certificate includes a unique certificate hash, which is used to confirm its authenticity.

<img width="1581" height="771" alt="image" src="https://github.com/user-attachments/assets/ad5c8a5d-ca97-4432-b7be-691c174fc72a" />

The certificate hash is automatically extracted using AI-powered OCR (Optical Character Recognition) algorithms. Once identified, the backend sends a verification request to the certificate authority’s API to confirm its authenticity.

After successful verification, the system encrypts the entire certificate file and sends it to the smart contract, which checks whether this certificate has already been published on-chain.

Finally, the user can mint a self-bound NFT, which serves as a verifiable, non-transferable proof of certificate ownership.

# TODO: картинка с нашего сайта как выглядит отображение токенов

Authentication based on Zero-Knowledge (ZK) proofs ensure that users are properly authenticated and cannot submit third-party certificates.

ZK-proof integration has already been successfully implemented for Ethereum first-version prototype, but deployment on Polkadot encountered several technical problems. As a result, this feature was not included in the current version of the project, but it remains a key priority for future releases.

ZK-proof workflow:

# TODO: распиши как это работает, коротко, но четко, покажи картинки и диаграмы из твоей бакаларки
