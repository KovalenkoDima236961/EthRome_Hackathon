import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";


describe("CertificateViewNFT", () => {
    let cert: any;
    let certView: any;
    let deployer: any;
    let certHolder: any;
    let receiver: any;
    let stranger: any;
    let operator: any;

    const deployFixture = async () => {
        [deployer, certHolder, receiver, stranger, operator] = await hre.ethers.getSigners();

        const Cert = await hre.ethers.getContractFactory("CertificatePrivateNFT");
        cert = await Cert.deploy("My Certificates");
        await cert.waitForDeploy();

        const pdfHash = makeBytes32("pdf-1");
        const root = makeBytes32("root-1");
        await cert.mintCertificate(certHolder.address, "ipfs://cert1", pdfHash, root);

        const View = await hre.ethers.getContractFactory("CertificateViewNFT");
        certView = await View.deploy("My View Certificates");
        await certView.waitForDeploy();
    }

    const makeBytes32 = (s: string) =>
        hre.ethers.keccak256(hre.ethers.toUtf8Bytes(s));
    
    beforeEach( async () => {
        await deployFixture();
    })

    const nowTs = async () => {
        const b = await hre.ethers.provider.getBlock("latest");
        return b!.timestamp;
    }

    it("only the certificate holder cna mint a view (emits ViewMinted + Locked; locked() == true)", async () => {
        const fieldsIpfs = "ipfs://selected-fields";
        const expiresAt = 0;
        const certId = 1;

        await expect(
            certView.connect(stranger).mintViewNFT(stranger.address, certId, fieldsIpfs, expiresAt),
        ).to.be.revertedWithCustomError(certView, "OnlyCertificateHolder");

        const tx = await certView
            .connect(certHolder)
            .mintViewNFT(stranger.address, certId, fieldsIpfs, expiresAt);

        await expect(tx)
            .to.emit(certView, "ViewMinted")
            .withArgs(stranger.address, 1n, certId, expiresAt, fieldsIpfs);
        await expect(tx).to.emit(certView, "Locked").withArgs(1n);

        expect(await certView.ownerOf(1)).to.equal(stranger.address);
        expect(await certView.locked(1)).to.equal(true);

        const [cid, exp] = await certView.getViewData(1);
        expect(cid).to.equal(certId);
        expect(exp).to.equal(expiresAt);
        expect(await certView.tokenURI(1)).to.equal(fieldsIpfs);
    });

    it("expiry: isExpired toggles: tokenURI/getViewData revert after expiry", async () => {
        const certId = 1;
        const fieldsIpfs = "ipfs://expiring";
        const expiresAt = (await nowTs()) + 3600;

        await certView
            .connect(certHolder)
            .mintViewNFT(receiver.address, certId, fieldsIpfs, expiresAt);

        expect(await certView.isExpired(1)).to.equal(false);
        expect(await certView.tokenURI(1)).to.equal(fieldsIpfs);

        await time.increaseTo(expiresAt + 1);

        expect(await certView.isExpired(1)).to.equal(true);
        await expect(certView.tokenURI(1)).to.be.revertedWithCustomError(certView, "ViewExpired");
        await expect(certView.getViewData(1)).to.be.revertedWithCustomError(certView, "ViewExpired");
    });

    it("burn: owner/approved/operator can burn; emits ViewBurned + Unlocked; locked() reverts afterwards", async () => {
        const certId = 1;

        await certView
            .connect(certHolder)
            .mintViewNFT(receiver.address, certId, "ipfs://no-exp", 0);
        
        await expect(certView.connect(receiver).burn(1))
            .to.emit(certView, "ViewBurned").withArgs(1n)
            .and.to.emit(certView, "Unlocked").withArgs(1n);
        
        await expect(certView.ownerOf(1)).to.be.reverted;
        await expect(certView.locked(1)).to.be.revertedWithCustomError(certView, "NonexistentToken");

        await certView
            .connect(certHolder)
            .mintViewNFT(receiver.address, certId, "ipfs://exp2", 0);
        
        await certView.connect(receiver).approve(operator.address, 2);
        await expect(certView.connect(operator).burn(2))
            .to.emit(certView, "ViewBurned").withArgs(2n)
            .and.to.emit(certView, "Unlocked").withArgs(2n);
    });

    it("non-transferable: all transfer paths revert with Soulbound()", async () => {
        const certId = 1;

        await certView
            .connect(certHolder)
            .mintViewNFT(receiver.address, certId, "ipfs://nt", 0);
        
        await expect(
            certView.connect(receiver).transferFrom(receiver.address, stranger.address, 1),
        ).to.be.revertedWithCustomError(certView, "Soulbound");

        await expect(
            certView
                .connect(receiver)
                ["safeTransferFrom(address,address,uint256)"](receiver.address, stranger.address, 1),
        ).to.be.revertedWithCustomError(certView, "Soulbound");

        await expect(
            certView
                .connect(receiver)
                ["safeTransferFrom(address,address,uint256,bytes)"](receiver.address, stranger.address, 1, "0x"),
        ).to.be.revertedWithCustomError(certView, "Soulbound");
    });
});