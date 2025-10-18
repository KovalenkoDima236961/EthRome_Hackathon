import os
from typing import Any, Dict, List, Tuple

from web3 import Web3

w3 = Web3()

TAG_LEAF = b"\x01"
TAG_NODE = b"\x02"


def keccak_bytes32_hex(s: str) -> str:
    return "0x" + w3.keccak(text=s).hex()


def _keccak_bytes(x: bytes) -> bytes:
    return w3.keccak(x)


def _keccak_text(s: str) -> bytes:
    return w3.keccak(text=s)


def _ensure_bytes32(b: bytes) -> bytes:
    if len(b) != 32:
        raise ValueError("expected 32-byte value")
    return b


def _to0x(b: bytes) -> str:
    return "0x" + b.hex()


def _canonical(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return "[" + ",".join(_canonical(x) for x in v) + "]"
    if isinstance(v, dict):
        keys = sorted(v.keys())
        entries = [f'"{k}":{_canonical(v[k])}' for k in keys]
        return "{" + ",".join(entries) + "}"
    return str(v)

def _hash_path(path: str) -> bytes:
    return _keccak_text(path)


def _hash_value(val: Any) -> bytes:
    return _keccak_text(_canonical(val))


def _leaf_bytes(path: str, value: Any, salt_hex: str) -> bytes:
    path_hash = _ensure_bytes32(_hash_path(path))
    value_hash = _ensure_bytes32(_hash_value(value))
    salt = bytes.fromhex(salt_hex[2:] if salt_hex.startswith("0x") else salt_hex)
    if len(salt) != 32:
        raise ValueError("salt must be 32 bytes")
    preimage = TAG_LEAF + path_hash + value_hash + salt
    return _ensure_bytes32(_keccak_bytes(preimage))


def _parent(a: bytes, b: bytes) -> bytes:
    left, right = (a, b) if a < b else (b, a)
    preimage = TAG_NODE + left + right
    return _ensure_bytes32(_keccak_bytes(preimage))


def _random_salt_hex() -> str:
    return "0x" + os.urandom(32).hex()


def build_tree(
    all_fields: Dict[str, Any], optional_salts: Dict[str, str] | None = None
) -> Tuple[str, Dict[str, str], Dict[str, bytes], List[List[bytes]]]:
    paths = sorted(all_fields.keys())
    salts: Dict[str, str] = {}
    leaves_by_path: Dict[str, bytes] = {}

    for p in paths:
        salt = optional_salts.get(p) if optional_salts else None
        if not salt:
            salt = _random_salt_hex()
        salts[p] = salt
        leaves_by_path[p] = _leaf_bytes(p, all_fields[p], salt)

    levels: List[List[bytes]] = []
    cur = [leaves_by_path[p] for p in paths]
    levels.append(cur)

    if not cur:
        root = b"\x00" * 32
        return _to0x(root), salts, leaves_by_path, levels
    
    while len(cur) > 1:
        next: List[bytes] = []
        i = 0
        n = len(cur)
        while i < n:
            a = cur[i]
            b = cur[i + 1] if (i + 1) < n else cur[i]
            next.append(_parent(a, b))
            i += 2
        levels.append(next)
        cur = next

    root = cur[0]
    return _to0x(root), salts, leaves_by_path, levels


def build_merkle_proofs(
    all_fields: Dict[str, Any],
    field_to_prove: List[str],
    optional_salts: Dict[str, str] | None = None,
) -> Dict[str, Dict[str, Any]]:
    root, salts, leaves_by_path, levels = build_tree(all_fields, optional_salts)

    paths = sorted(all_fields.keys())
    index_of: Dict[str, int] = {p: i for i, p in enumerate(paths)}

    proofs: Dict[str, Dict[str, Any]] = {}
    for p in field_to_prove:
        if p not in index_of:
            continue
        index = index_of[p]
        proof: List[str] = []
        for level in range(0, len(levels) - 1):
            layer = levels[level]
            pair_index = index ^ 1
            sib = (
                layer[pair_index] if pair_index < len(layer) else layer[index]
            )
            proof.append(_to0x(sib))
            index //= 2
        proofs[p] = {"salt": salts[p], "proof": proof}
    return proofs