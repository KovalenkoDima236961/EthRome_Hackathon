// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC5192 } from "./interfaces/IERC5192.sol";

contract CertificatePrivateNFT is ERC721URIStorage, ERC721Enumerable, Ownable, IERC5192, EIP712 {
    // Errors
    error AuthExpired();
    error PdfAlreadyUsed();
    error SigAlreadyUsed();
    error InvalidIssuerSignature();
    error NonexistentToken();
    error TokenURIAlreadySet();
    error Soulbound();
    error NotAllowedToBurn();

    // Variables
    uint256 public nextCertificateId = 1;

    mapping(bytes32 => bool) public usedPdfHashes;
    mapping(uint256 => bytes32) public merkleRoots;
    mapping(uint256 => bytes32) private pdfHashOfNft;
    mapping(bytes32 => bool) public usedDigest; // prevents replaying the same EIP-712 signature digest

    bytes32 private constant MINT_TYPEHASH =
        keccak256(
            "Mint(address to,bytes32 tokenURIHash,bytes32 pdfHash,bytes32 merkleRoot,uint256 deadline)"
        );

    // Events
    event CertificateMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI,
        bytes32 indexed pdfHash,
        bytes32 merkleRoot
    );

    event CertificateBurned(uint256 indexed tokenId, bytes32 pdfHash);


    constructor(
        string memory _certificateName
    )
        ERC721(_certificateName, "CERTIF")
        Ownable(msg.sender)
        EIP712("CertificateNFT", "1")
    {}

    // Minting
    function mintCertificate(
        address to,
        string calldata _tokenURI,
        bytes32 _pdfHash,
        bytes32 _merkleRoot
    ) external onlyOwner returns (uint256) {
        return _mintInternal(to, _tokenURI, _pdfHash, _merkleRoot);
    }

    function mintWithIssuerSig(
        address to,
        string calldata _tokenURI,
        bytes32 _pdfHash,
        bytes32 _merkleRoot,
        uint256 _deadline,
        bytes calldata signature
    ) external returns (uint256) {
        if (block.timestamp > _deadline) revert AuthExpired();
        if (usedPdfHashes[_pdfHash]) revert PdfAlreadyUsed();

        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                to,
                keccak256(bytes(_tokenURI)),
                _pdfHash,
                _merkleRoot,
                _deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        if (usedDigest[digest]) revert SigAlreadyUsed();

        if (!SignatureChecker.isValidSignatureNow(owner(), digest, signature)) revert InvalidIssuerSignature();
        usedDigest[digest] = true;

        return _mintInternal(to, _tokenURI, _pdfHash, _merkleRoot);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _mintInternal(
        address to,
        string calldata _tokenURI,
        bytes32 _pdfHash,
        bytes32 _merkleRoot
    ) internal returns (uint256) {
        if (usedPdfHashes[_pdfHash]) revert PdfAlreadyUsed();

        uint256 tokenId = nextCertificateId;
        ++nextCertificateId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        usedPdfHashes[_pdfHash] = true;
        pdfHashOfNft[tokenId] = _pdfHash;
        merkleRoots[tokenId] = _merkleRoot;

        emit CertificateMinted(to, tokenId, _tokenURI, _pdfHash, _merkleRoot);
        emit Locked(tokenId);

        return tokenId;
    }

    function _setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) internal override {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        if (bytes(tokenURI(tokenId)).length != 0) revert TokenURIAlreadySet();
        super._setTokenURI(tokenId, _tokenURI);
    }

    // Soulbound guard
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public pure override(ERC721, IERC721) {
        from;
        to;
        tokenId;
        revert Soulbound();
    }

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // Burn
    function burn(uint256 tokenId) public {
        if (!(ownerOf(tokenId) == msg.sender || msg.sender == owner())) {
            revert NotAllowedToBurn();
        }
        _burnMeta(tokenId);
    }

    function _burnMeta(uint256 tokenId) internal {
        bytes32 pdfHash = pdfHashOfNft[tokenId];

        if (pdfHash != bytes32(0)) {
            delete usedPdfHashes[pdfHash];
            delete pdfHashOfNft[tokenId];
        }
        delete merkleRoots[tokenId];

        super._burn(tokenId);

        emit CertificateBurned(tokenId, pdfHash);
        emit Unlocked(tokenId);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // Views
    function rootOf(uint256 tokenId) external view returns (bytes32) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return merkleRoots[tokenId];
    }

    function isPdfHashUsed(bytes32 pdfHash) external view returns (bool) {
        return usedPdfHashes[pdfHash];
    }

    function pdfHashOf(uint256 tokenId) external view returns (bytes32) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return pdfHashOfNft[tokenId];
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return true;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}