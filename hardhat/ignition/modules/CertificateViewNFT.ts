import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const CertificateViewNFTModule = buildModule("CertificateViewNFTModule", (m) => {
    const certificateViewName = "QualifyProView";

    const certificateNft = m.contract("CertificateViewNFT", [certificateViewName]);

    return { certificateNft }
})


export default CertificateViewNFTModule;