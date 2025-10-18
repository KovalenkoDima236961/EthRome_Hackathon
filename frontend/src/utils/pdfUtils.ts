import { ethers } from 'ethers';
import { debug } from './debug';

// JSON-safe value type (what JSON.stringify can serialize)
type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [k: string]: Json };

function blobToArrayBufferPortable(blob: Blob): Promise<ArrayBuffer> {
  // Prefer native Blob/File.arrayBuffer when available
  const f = (blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (typeof f === 'function') return f.call(blob);
  // Fallback that works in Node/vitest environments
  return new Response(blob).arrayBuffer();
}

export async function hashPdfFile(file: File): Promise<string> {
  const arrayBuffer = await blobToArrayBufferPortable(file);
  const uint8 = new Uint8Array(arrayBuffer);
  return ethers.keccak256(uint8);
}

/**
 * Generate hash of a PDF file using ethers keccak256
 */
export const generatePdfHash = async (file: File): Promise<string> => {
  try {
    debug.log('Generating hash for file:', file.name, 'Size:', file.size);
    const hash = await hashPdfFile(file);
    debug.log('Generated hash:', hash);
    return hash;
  } catch (error) {
    debug.error('Error generating PDF hash:', error);
    throw new Error('Failed to generate PDF hash');
  }
};

/**
 * Convert hex string to bytes32 format
 */
export const hexToBytes32 = (hex: string): string => {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Pad to 64 characters (32 bytes)
  const paddedHex = cleanHex.padStart(64, '0');
  
  return '0x' + paddedHex;
};

/**
 * Validate if a string is a valid hex string
 */
export const isValidHex = (str: string): boolean => {
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(str);
};
