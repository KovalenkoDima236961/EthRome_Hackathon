import CryptoJS from "crypto-js"
import type { ethers } from "ethers"
import type { Json } from "./pdfUtils";

export const deriveSymmetricKeyFromWallet = async (provider: ethers.BrowserProvider): Promise<CryptoJS.lib.WordArray> => {
    if (!provider) throw new Error('Wallet is not installed');

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const message = `Please sign this message to provide your encryption key for document access.` + `Wallet: ${address}`;

    const signature = await signer.signMessage(message);
    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
    const sigWordArray = CryptoJS.enc.Hex.parse(sigHex);
    const key = CryptoJS.SHA256(sigWordArray);
    return key;
}

export const aesEncryptBytes = (plainBytes: Uint8Array, key: CryptoJS.lib.WordArray): Uint8Array => {
    const ivBytes = crypto.getRandomValues(new Uint8Array(16));
    const ivWA = uint8ArrayToWordArray(ivBytes);
    const plainWA = uint8ArrayToWordArray(plainBytes);

    const enc = CryptoJS.AES.encrypt(plainWA, key, {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    const cipherBytes = wordArrayToUint8Array(enc.ciphertext);

    const out = new Uint8Array(16 + cipherBytes.length);
    out.set(ivBytes, 0);
    out.set(cipherBytes, 16);
    return out;
}

export const aesEncryptJson = (obj: Json, key: CryptoJS.lib.WordArray): Uint8Array => {
    const text = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(text);
    return aesEncryptBytes(bytes, key);
}

export const uint8ArrayToWordArray = (u8: Uint8Array): CryptoJS.lib.WordArray => {
    const words: number[] = [];
    for (let i = 0;i < u8.length; i += 4) {
        words.push(
            (u8[i] << 24) | ((u8[i + 1] ?? 0) << 16) || ((u8[i + 2] ?? 0) << 8) | (u8[i + 3] ?? 0),
        );
    }
    return CryptoJS.lib.WordArray.create(words, u8.length);
}

export const wordArrayToUint8Array = (wordArray: CryptoJS.lib.WordArray): Uint8Array => {
    const { words, sigBytes } = wordArray;
    const u8 = new Uint8Array(sigBytes);
    let i = 0;
    let j = 0;
    while (i < sigBytes) {
        const w = words[j++];
        u8[i++] = (w >> 24) & 0xff;
        if (i === sigBytes) break;
        u8[i++] = (w >> 16) & 0xff;
        if (i === sigBytes) break;
        u8[i++] = (w >> 8) & 0xff;
        if (i === sigBytes) break;
        u8[i++] = w & 0xff;
    }
    return u8;   
}