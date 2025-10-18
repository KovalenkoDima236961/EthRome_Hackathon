import hre, { ethers } from "hardhat"
import { expect } from "chai"



describe("CertificatePrivateNFT", () => {
    let cert: any;
    let deployer: any;
    let alice: any;
    let bob: any;
    let stranger: any;
    let certAddress: any;

    const deployFixture = async () => {
        [deployer, alice, bob, stranger] = await hre.ethers.getSigners();
        const CertPrivateNft = await hre.ethers.getContractFactory("CertificatePrivateNFT");
        cert = await CertPrivateNft.deploy("My Certificates");
        await cert.waitForDeployment();
        certAddress = await cert.getAddress();
    }

    const makeBytes32 = (s: string) => hre.ethers.keccak256(hre.ethers.toUtf8Bytes(s));

    const signMint = async (
        issuer: any,
        contractAddress: string,
        to: string,
        tokenURI: string,
        pdfHash: string,
        merkleRoot: string,
        deadline: bigint | number,
    ) => {
        const network = await hre.ethers.provider.getNetwork();
        const domain = {
            name: "CertificatePrivateNFT",
            version: "1",
            chainId: Number(network.chainId),
            verifyingContract: contractAddress
        };

        const types = {
            Mint: [
                { name: "to", type: "address" },
                { name: "tokenURIHash", type: "bytes32" },
                { name: "pdfHash", type: "bytes32" },
                { name: "merkleRoot", type: "bytes32" },
                { name: "deadline", type: "uint256" }
            ],
        };

        const value = {
            to,
            tokenURIHash: hre.ethers.keccak256(ethers.toUtf8Bytes(tokenURI)),
            pdfHash,
            merkleRoot,
            deadline,
        };

        return issuer.signTypedData(domain, types as any, value);
    }

    const nowTs = async () => {
        const b = await hre.ethers.provider.getBlock("latest");
        return b!.timestamp;
    }

    beforeEach(async () => {
        await deployFixture();
    })

    it("deploys with corret name/symbol and initial state", async () => {
        expect(await cert.name()).to.eq("My Certificates");
        expect(await cert.symbol()).to.eq("CERTIF");
        expect(await cert.nextCertificateId()).to.eq(1n);
    });

    it("rejects duplicate pdfHash on mint", async () => {
        const root1 = makeBytes32("root-1");
        const root2 = makeBytes32("root-2");
        const pdfHash = makeBytes32("same-pdf");

        await cert.mintCertificate(alice.address, "ipfs://two", pdfHash, root1);

        await expect(
            cert.mintCertificate(alice.address, "ipfs://two", pdfHash, root2),
        ).to.be.revertedWithCustomError(cert, "PdfAlreadyUsed");
    });

    it("is non-transferable: transferFrom and safeTransferFrom revert", async () => {
        const root = makeBytes32("root-x");
        const pdfHash = makeBytes32("pdf-x");

        await cert.mintCertificate(alice.address, "ipfs://x", pdfHash, root);

        await expect(
            cert.connect(alice).transferFrom(alice.address, bob.address, 1),
        ).to.be.revertedWithCustomError(cert, "Soulbound");

        await expect(
            cert
                .connect(alice)
                [
                    "safeTransferFrom(address,address,uint256)"
                ](alice.address, bob.address, 1),
        ).to.be.revertedWithCustomError(cert, "Soulbound");

        await expect(
            cert
                .connect(alice)
                [
                    "safeTransferFrom(address,address,uint256,bytes)"
                ](alice.address, bob.address, 1, "0x")
        ).to.be.revertedWithCustomError(cert, "Soulbound");
    });

    it("allows burn by token owner", async () => {
        const root = makeBytes32("root-burn-1");
        const pdfHash = makeBytes32("pdf-burn-1");
        await cert.mintCertificate(alice.address, "ipfs://burn", pdfHash, root);

        await expect(cert.connect(alice).burn(1))
            .to.emit(cert, "CertificateBurned")
            .withArgs(1n, pdfHash);

        await expect(cert.ownerOf(1)).to.be.reverted;

        expect(await cert.isPdfHashUsed(pdfHash)).to.eq(false);

        await expect(cert.rootOf(1)).to.be.revertedWithCustomError(
            cert,
            "NonexistentToken",
        );
        await expect(cert.pdfHashOf(1)).to.be.revertedWithCustomError(
            cert,
            "NonexistentToken",
        );
    });

    it("prevents burn by others", async () => {
        const root = makeBytes32("root-burn-3");
        const pdfHash = makeBytes32("pdf-burn-3");
        await cert.mintCertificate(alice.address, "ipfs://burn3", pdfHash, root);

        await expect(
            cert.connect(stranger).burn(1),
        ).to.be.revertedWithCustomError(cert, "NotAllowedToBurn");

        expect(await cert.ownerOf(1)).to.eq(alice.address);
    });

    it("mints with a valid issuer signature (emits events, locked() true", async () => {
        const uri = "ipfs://signed-1";
        const pdf = makeBytes32("pdf-1");
        const root = makeBytes32("root-1");
        const deadline = (await nowTs()) + 3600;

        const sig = await signMint(
            deployer,
            certAddress,
            alice.address,
            uri,
            pdf,
            root,
            deadline
        );

        await expect(
            cert
                .connect(alice)
                .mintWithIssuerSig(alice.address, uri, pdf, root, deadline, sig),
        )
            .to.emit(cert, "CertificateMinted")
            .withArgs(alice.address, 1n, uri, pdf, root)
            .and.to.emit(cert, "Locked")
            .withArgs(1n);
        
        expect(await cert.ownerOf(1)).to.eq(alice.address);
        expect(await cert.tokenURI(1)).to.eq(uri);
        expect(await cert.locked(1)).to.eq(true);
    });

    it("reverts with AuthExpired when deadline has passed", async () => {
        const uri = "ipfs://expired";
        const pdf = makeBytes32("pdf-exp");
        const root = makeBytes32("root-exp");
        const past = (await nowTs()) - 1;

        const sig = await signMint(
            deployer,
            certAddress,
            alice.address,
            uri,
            pdf,
            root,
            past
        );

        await expect(
            cert
                .connect(alice)
                .mintWithIssuerSig(alice.address, uri, pdf, root, past, sig),
        ).to.be.revertedWithCustomError(cert, "AuthExpired");
    });

    it("reverts with InvalidIssuerSignature if a non-owner signed", async () => {
        const uri = "ipfs://bad-signer";
        const pdf = makeBytes32("pdf-bad");
        const root = makeBytes32("root-bad");
        const deadline = (await nowTs()) + 600;

        const sig = await signMint(bob, certAddress, alice.address, uri, pdf, root, deadline);

        await expect(
            cert
                .connect(alice)
                .mintWithIssuerSig(alice.address, uri, pdf, root, deadline, sig),
        ).to.be.revertedWithCustomError(cert, "InvalidIssuerSignature");
    });
})