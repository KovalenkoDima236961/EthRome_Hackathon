import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CertificateViewNFTModule = buildModule("CertificateViewNFTModule", (m) => {
  const certificateViewName = m.getParameter("certificateViewName", "QualifyProView");

  const certificatePrivateAddress = m.getParameter("certificatePrivateAddress");

  const certificateViewNft = m.contract("CertificateViewNFT", [
    certificateViewName,
    certificatePrivateAddress,
  ]);

  return { certificateViewNft };
});

export default CertificateViewNFTModule;