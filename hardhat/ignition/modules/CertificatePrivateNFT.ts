import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const CertificatePrivateNFTModule = buildModule("CertificatePrivateNFTModule", (m) => {
    const certificateName = "QualifyPro";

    const certificateNft = m.contract("CertificatePrivateNFT", [certificateName]);

    return { certificateNft }
})


export default CertificatePrivateNFTModule;