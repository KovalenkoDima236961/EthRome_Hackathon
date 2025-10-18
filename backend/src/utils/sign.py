import re
from typing import Any, cast

from eth_abi import encode as abi_encode
from eth_typing import HexStr
from eth_utils import remove_0x_prefix
from web3 import Web3

HEX32_RE = re.compile(r"^0x[0-9a-fA-F]{64}$")

def is_bytes32(x: str) -> bool:
    return bool(HEX32_RE.match(x or ""))

def eip712_mint_digest(
    *,
    to_addr: str,
    token_uri_hash_hex: str,
    pdf_hash_hex: str,
    merkle_root_hex: str,
    deadline: int,
    chain_id: int,
    verifying_contract: str,
    name: str = "CertificateNFT",
    version: str = "1",
) -> bytes:
    mint_typehash = Web3.keccak(
        text="Mint(address to,bytes32 tokenURIHash,bytes32 pdfHash,bytes32 merkleRoot,uint256 deadline)"
    )
    domain_typehash = Web3.keccak(
        text="EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    )
    name_hash = Web3.keccak(text=name)
    version_hash = Web3.keccak(text=version)

    domain_bytes = abi_encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
            domain_typehash,
            name_hash,
            version_hash,
            int(chain_id),
            Web3.to_checksum_address(verifying_contract),
        ],
    )
    domain_separator = Web3.keccak(domain_bytes)

    msg_bytes = abi_encode(
        ["bytes32", "address", "bytes32", "bytes32", "bytes32", "uint256"],
        [
            mint_typehash,
            Web3.to_checksum_address(to_addr),
            Web3.to_bytes(hexstr=cast(HexStr, token_uri_hash_hex)),
            Web3.to_bytes(hexstr=cast(HexStr, pdf_hash_hex)),
            Web3.to_bytes(hexstr=cast(HexStr, merkle_root_hex)),
            int(deadline),
        ],
    )
    struct_hash = Web3.keccak(msg_bytes)
    return Web3.keccak(b"\x19\x01" + domain_separator + struct_hash)

def _sign_digest_65(digest: bytes, issuer_acct: Any, issuer_private_key: str) -> str:
    if not isinstance(digest, (bytes, bytearray)) or len(digest) != 32:
        raise ValueError("digest must be 32 bytes")
    
    for obj, name in ((issuer_acct, "signHash"), (issuer_acct, "sign_hash")):
        signer = getattr(obj, name, None)
        if callable(signer):
            sig = signer(digest).signature
            sig_bytes = bytes(sig)
            v_raw = sig_bytes[64]
            if v_raw in (0, 1):
                sig_bytes = sig_bytes[:64] + bytes([v_raw] + 27)
            return "0x" + sig_bytes.hex()
    
    from eth_keys import keys as eth_keys_keys
    pk_noprefix = remove_0x_prefix(cast(HexStr, issuer_private_key))
    pk_bytes = bytes.fromhex(pk_noprefix)
    priv = eth_keys_keys.PrivateKey(pk_bytes)
    sig_obj = priv.sign_msg_hash(digest)

    r: bytes = sig_obj.r.to_bytes(32, "big")
    s: bytes = sig_obj.s.to_bytes(32, "big")
    v_int: int = sig_obj.v + (27 if sig_obj.v in (0, 1) else 0)
    sig_hex: str = (r + s + bytes([v_int])).hex()
    return "0x" + sig_hex