type IpfsAddLine = { Hash?: string; [k: string]: unknown };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

const isIpfsAddLine = (x: unknown): x is IpfsAddLine => {
   return isRecord(x) && (!('Hash' in x) || typeof (x as { Hash?: unknown }).Hash === 'string');
}

export const uploadBlobToIpfs = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', blob, 'encrypted');

    const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
        method: 'POST',
        body: formData,
    });
    const bodyText = await response.text();
    if (!response.ok) throw new Error('IPFS upload failed: ' + bodyText);

    const lines = bodyText.split('\n').filter(Boolean);
    const lastUnknown: unknown = lines.length ? JSON.parse(lines[lines.length - 1]) : undefined;

    if (!isIpfsAddLine(lastUnknown)) throw new Error('IPFS response did not contain a valid object');
    const last = lastUnknown;

    if (!last.Hash) throw new Error('IPFS response did not contain a CID');
    return `ipfs://${last.Hash}`;
}