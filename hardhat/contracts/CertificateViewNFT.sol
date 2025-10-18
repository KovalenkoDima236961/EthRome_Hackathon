// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC712/extensions/ERC721URIStorage.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC5192 } from "./interfaces/IERC5192.sol";

interface ICertificateNFT {
    function ownerOf(uint256 certificateId) external view returns (address);
    function rootOf(uint256 certificateId) external view returns (bytes32);
}

contract CertificateViewNFT is ERC721URIStorage, Ownable, IERC5192 {
    // Errors
    error BadCertAddress();
    error OnlyCertificateHolder();
    error ViewExpired();
    error NoRootForCertificate();
    error NotAllowedToBurnYet();
    error Soulbound();

    // variables
    struct ViewInfo {
        uint256 certificateId;
        uint256 expiresAt;
    }

    ICertificateNFT public immutable CERTIFICATE_NFT;
    uint256 public nextViewId = 1;

    mapping(uint256 => ViewInfo) public viewInfos;

    // Events
    event ViewMinted(
        address indexed to,
        uint256 indexed viewId,
        uint256 indexed certId,
        uint256 expiresAt,
        string fieldsIpfs
    );

    event ViewBurned(uint256 indexed viewId);

    constructor(
        string memory _certificateName,
        address certNFT
    ) ERC721(_certificateName, "CERTViewNFT") Ownable(msg.sender) {
        if (certNFT == address(0)) revert BadCertAddress();
        CERTIFICATE_NFT = ICertificateNFT(certNFT);
    }

    function _notExpired(
        uint256 viewId
    ) internal view returns (bool notExpired) {
        uint256 exp = viewInfos[viewId].expiresAt;
        return (exp == 0 || block.timestamp < exp);
    }

    function isExpired(uint256 viewId) external view returns (bool expired) {
        return !_notExpired(viewId);
    }

    function mintViewNFT(
        address to,
        uint256 certificateId,
        string memory fieldsIpfs,
        uint256 expiresAt
    ) public returns (uint256 viewId) {
        if (CERTIFICATE_NFT.ownerOf(certificateId) != msg.sender) revert OnlyCertificateHolder();

        viewId = nextViewId;
        ++nextViewId;

        _safeMint(to, viewId);
        _setTokenURI(viewId, fieldsIpfs);
        viewInfos[viewId] = ViewInfo(certificateId, expiresAt);

        emit ViewMinted(to, viewId, certificateId, expiresAt, fieldsIpfs);
        emit Locked(viewId);
    }

    function burn(uint256 viewId) public {
        address owner = ownerOf(viewId);
        if (
            !(msg.sender == owner ||
                getApproved(viewId) == msg.sender ||
                isApprovedForAll(owner, msg.sender))
        ) {
            revert NotAllowedToBurnYet();
        }
        _burn(viewId);
        delete viewInfos[viewId];
        emit ViewBurned(viewId);
        emit Unlocked(viewId);
    }

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

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert Soulbound();
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 viewId)
        public view override returns (string memory) 
    {
        if (!_notExpired(viewId)) revert ViewExpired();
        return super.tokenURI(viewId);    
    }

    function getViewData(uint256 viewId)
        public view returns (uint256 certificateId, uint256 expiresAt) 
    {
        if(!_notExpired(viewId)) revert ViewExpired();
        ViewInfo memory info = viewInfos[viewId];
        return (info.certificateId, info.expiresAt);
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return true;
    }
}