import React, { useState, useEffect } from 'react';
import { Check, ExternalLink, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/Card';
import { StepIndicator } from '../components/StepIndicator';
import { Alert } from '../components/Alert';
import { useWeb3 } from '../contexts/Web3Context';
import { CONTRACT_ADDRESS, ContractService } from '../services/contractService';
import { CertificateService } from '../services/certificateService';
import type { CertificateVerificationResponse } from '../types/certificate';
import { generatePdfHash, type Json } from '../utils/pdfUtils';
import { debug } from '../utils/debug';
import { CertificateDisplay } from '../components/CertificateDisplay';
import { deriveSymmetricKeyFromWallet, aesEncryptBytes, aesEncryptJson } from '../utils/cryptographyUtils';
import { uploadBlobToIpfs } from "../utils/ipfs_util";
import GradientText from "../components/GradientText";

export const MintCertificatePage: React.FC = () => {
  const { isConnected, provider, account } = useWeb3();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationHash, setVerificationHash] = useState<string>('');
  const [isOnChainVerified, setIsOnChainVerified] = useState(false);
  const [isServerSideVerified, setIsServerSideVerified] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isMinted, setIsMinted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingOnChain, setIsCheckingOnChain] = useState(false);
  const [isCheckingServerSide, setIsCheckingServerSide] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateVerificationResponse | null>(null);
  const [isOnChainMint, setIsOnChainMint] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txUrl, setTxUrl] = useState<string | null>(null);


  // Update overall verification state when both substeps are complete
  useEffect(() => {
    setIsVerified(isOnChainVerified && isServerSideVerified);
  }, [isOnChainVerified, isServerSideVerified]);

  const steps = [
    {
      id: 'upload',
      title: 'Upload Certificate',
      description: 'Upload your PDF certificate',
      completed: !!uploadedFile,
      active: !uploadedFile
    },
    {
      id: 'verify',
      title: 'Verify Certificate',
      description: 'On-chain and Server-side verification',
      completed: isVerified,
      active: !!uploadedFile && !isVerified,
      substeps: [
        {
          id: 'onchain',
          title: 'On-chain Verification',
          description: 'Generate hash and verify on blockchain.',
          completed: isOnChainVerified,
          active: !!uploadedFile && !isOnChainVerified
        },
        {
          id: 'serverside',
          title: 'Server-side Verification',
          description: 'Verify certificate details with backend.',
          completed: isServerSideVerified,
          active: isOnChainVerified && !isServerSideVerified
        }
      ]
    },
    {
      id: 'mint',
      title: 'Mint NFT',
      description: 'Create your certificate NFT',
      completed: isMinted,
      active: isVerified && !isMinted
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setError(null);
      // Reset verification state when new file is uploaded
      setIsOnChainVerified(false);
      setIsServerSideVerified(false);
      setIsVerified(false);
      setVerificationHash('');
      setIsCheckingOnChain(false);
      setIsCheckingServerSide(false);
      setCertificateData(null);
      setIsMinted(false);
    }
  };

  const checkOnChainVerification = async (file: File) => {
    debug.log('Starting on-chain verification process...');
    
    if (!isConnected || !provider) {
      debug.error('Wallet not connected');
      setError('Please connect your wallet first');
      return;
    }

    setIsCheckingOnChain(true);
    setError(null);

    try {
      debug.log('Step 1: Generating PDF hash...');
      // Generate PDF hash
      const pdfHash = await generatePdfHash(file);
      setVerificationHash(pdfHash);
      debug.log('Step 1 completed: Hash generated:', pdfHash);

      debug.log('Step 2: Checking hash on blockchain...');
      // Check if hash is already used on blockchain
      const contractService = new ContractService(provider);
      
      // Check if we're on the correct network first
      const isCorrectNetwork = await contractService.isCorrectNetwork();
      debug.log('Network check result:', isCorrectNetwork);
      
      // Temporary bypass for development
      const skipNetworkCheck = process.env.NODE_ENV === 'development';
      
      if (!isCorrectNetwork && !skipNetworkCheck) {
        debug.log('Not on correct network. Please switch to Paseo Passethub manually.');
        setError('Please switch to Paseo Passethub network in your wallet and try again.');
        setIsOnChainVerified(false);
        return;
      }
      
      if (skipNetworkCheck) {
        debug.log('Development mode: Skipping network validation');
      } else {
        debug.log('Network validation passed, proceeding with contract call...');
      }
      
      debug.log('Calling smart contract isPdfHashUsed...');
      const isUsed = await contractService.isPdfHashUsed(pdfHash);
      debug.log('Step 2 completed: Smart contract result:', isUsed);

      if (isUsed) {
        debug.log('Certificate already used - showing error');
        setError('This certificate has already been used and cannot be minted again.');
        setIsOnChainVerified(false);
      } else {
        debug.log('Certificate is unique - on-chain verification successful');
        setError(null);
        setIsOnChainVerified(true);
      }
    } catch (err: any) {
      debug.error('Error in on-chain verification process:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err.message?.includes('revert') || err.message?.includes('execution reverted')) {
        setError('Smart contract error. Please try again.');
      } else if (err.message?.includes('User rejected')) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(`Failed to verify certificate: ${err.message || 'Unknown error'}`);
      }
      setIsOnChainVerified(false);
    } finally {
      setIsCheckingOnChain(false);
      debug.log('On-chain verification process completed');
    }
  };

  const checkServerSideVerification = async (file: File) => {
    debug.log('Starting server-side verification process...');
    
    setIsCheckingServerSide(true);
    setError(null);

    try {
      debug.log('Calling backend API to verify certificate and extract data...');
      const certificateService = new CertificateService();
      const verificationResult = await certificateService.verifyCertificate(file);
      
      debug.log('Backend verification result:', verificationResult);
      
      if (verificationResult.is_verified) {
        setCertificateData(verificationResult);
        setIsServerSideVerified(true);
        debug.log('Server-side verification successful');
      } else {
        setError('Certificate verification failed. Please check your certificate and try again.');
        setIsServerSideVerified(false);
        debug.error('Certificate verification failed:', verificationResult);
      }
    } catch (err: any) {
      debug.error('Error during server-side verification process:', err);
      setError(`Failed to verify certificate: ${err.message || 'Unknown error'}`);
      setIsServerSideVerified(false);
    } finally {
      setIsCheckingServerSide(false);
      debug.log('Server-side verification process completed');
    }
  };

  const handleOnChainVerify = async () => {
    if (!uploadedFile) {
      setError('Please upload a PDF file first');
      return;
    }
    
    if (!isConnected || !provider) {
      setError('Please connect your wallet first');
      return;
    }

    await checkOnChainVerification(uploadedFile);
  };

  const handleServerSideVerify = async () => {
    if (!uploadedFile) {
      setError('Please upload a PDF file first');
      return;
    }

    await checkServerSideVerification(uploadedFile);
  };


  const handleOnChainMint = async () => {
    setTxHash(null);
    setTxUrl(null);
    if (!uploadedFile) {
      setError('No certificate file to mint.');
      return;
    }
    if (!provider) {
      setError('Wallet provider not found. Please reconnect your wallet.');
      return;
    }
    if (!account) {
      setError('No wallet account. Please reconnect your wallet.');
      return;
    }
    if (!verificationHash) {
      setError('Missing verification hash. Please verify your certificate again.');
      return;
    }
    if (!certificateData) {
      setError('No certificate data. Please run "Mint NFT" step first.');
      return;
    }

    setIsOnChainMint(true);
    setError(null);

    try {
      const contractService = new ContractService(provider);
      const isCorrectNetwork = await contractService.isCorrectNetwork();
      const skipNetworkCheck = process.env.NODE_ENV === 'development';

      if (!isCorrectNetwork && !skipNetworkCheck) {
        setError('Please switch to Paseo Passethub network in your wallet and try again.');
        setIsVerified(false);
        return;
      }

      const alreadyUsed = await contractService.isPdfHashUsed(verificationHash);
      if (alreadyUsed) {
        setError('This certificate has already been used and cannot be minted again.');
        setIsVerified(false);
        return;
      }

      debug.log('Start processing of encrypting the certificate');

      const key = await deriveSymmetricKeyFromWallet(provider);
      debug.log('Derived symmetric key (SHA-256 of signature):', key.toString());

      debug.log('Encrypt and upload the PDF');
      const fileBytes = new Uint8Array(await uploadedFile.arrayBuffer());
      const encryptedPdf = aesEncryptBytes(fileBytes, key);
      const encryptedPdfBlob = new Blob([encryptedPdf], {
        type: 'application/octet-stream',
      });
      const encryptedPdfIpfsUrl = await uploadBlobToIpfs(encryptedPdfBlob);

      if (certificateData === null) throw Error();

      const fieldsWithPdf = {
        ...certificateData.fields,
        certificate_ipfs_url: encryptedPdfIpfsUrl,
        __merkleSalts: certificateData.merkle_salts,
        __merkleVersion: 1,
      } satisfies Record<string, Json>;

      const encryptedFieldsBytes = aesEncryptJson(fieldsWithPdf, key);
      const encryptedFieldsBlob = new Blob([encryptedFieldsBytes], {
        type: 'application/octet-stream',
      });
      const encrypytedFieldsIpfsUrl = await uploadBlobToIpfs(encryptedFieldsBlob);
      
      debug.log('Building + uploading thumbnail image...');
      const safeName =
        `Certificate for ${account.slice(0, 6)}…${account.slice(-4)}`;

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
          <defs>
            <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#8b5cf6"/>
              <stop offset="100%" stop-color="#14b8a6"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="black"/>
          <rect x="32" y="32" width="448" height="448" rx="32" fill="url(#g)" opacity="0.25"/>
          <g fill="#ddd">
            <rect x="96" y="120" width="320" height="24" rx="4"/>
            <rect x="96" y="170" width="280" height="18" rx="4"/>
            <rect x="96" y="198" width="260" height="18" rx="4"/>
            <rect x="96" y="226" width="300" height="18" rx="4"/>
            <rect x="96" y="256" width="220" height="18" rx="4"/>
            <rect x="96" y="284" width="240" height="18" rx="4"/>
          </g>
          <text x="50%" y="360" fill="#fff" font-size="24" text-anchor="middle" font-family="ui-sans-serif,system-ui,Segoe UI,Roboto">
            ${safeName}
          </text>
        </svg>
      `.trim();

      const thumbBlob = new Blob([svg], { type: 'image/svg+xml' });
      const thumbIpfsUrl = await uploadBlobToIpfs(thumbBlob);

      debug.log('Building + uploading metadata JSON..');
      const metadata = {
        name: safeName,
        description: 'Private, soulbound certificate NFT. Encrypted data included in properties.',
        image: thumbIpfsUrl,
        attributes: [
          { trait_type: 'Type', value: 'Private Certificate' },
          { trait_type: 'Soulbound', value: 'Yes'},
        ],
        properties: {
          encrypted_pdf: encryptedPdfIpfsUrl,
          encrypted_fields: encrypytedFieldsIpfsUrl,
          merkle_root: certificateData.merkle_root,
          merkle_version: 1,
        },
      };

      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataIpfsUrl = await uploadBlobToIpfs(metadataBlob);

      debug.log('Requesting backend signature…');

      const backendBase =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:8000'
          : 'https://your-backend-url.com';

      const signUrl = `${backendBase}/api/sign-mint`;
      const net = await provider.getNetwork();
      const chainIdFromWallet = Number(net.chainId);

      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: account,
          tokenURI: metadataIpfsUrl.trim(),
          pdfHash: verificationHash,
          merkleRoot: certificateData.merkle_root,
          chainId: chainIdFromWallet,
          contract_address: CONTRACT_ADDRESS
        }),
      });

      if (!signRes.ok) {
        const txt = await signRes.text();
        throw new Error(`sign-mint failed: ${txt}`);
      }

      const { signature, deadline } = (await signRes.json()) as {
        signature: string;
        deadline: number;
      };

      const finalDeadline = BigInt(deadline);

      debug.log('Calling smart contract mintWithIssuerSing...');
      const tx = await contractService.mintWithIssuerSig(
        account,
        metadataIpfsUrl.trim(),
        verificationHash,
        certificateData.merkle_root,
        finalDeadline,
        signature
      );

      setTxHash(tx.hash);
      setTxUrl(contractService.buildTxUrl(tx.hash));
      setError(null);
      setIsMinted(true);
    } catch (e: any) {
      debug.error('On-chain mint error: ', e);
      setError(e?.message ?? 'Failed to complete on-chain mint.');
    } finally {
      setIsOnChainMint(false);
    }
  }

  return (
    <div className="min-h-screen hero-bg relative overflow-hidden pt-24 pb-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      
      {/* Floating Polkadot Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="polkadot-dot absolute top-1/4 left-1/4 animate-float" style={{ animationDelay: '0s' }} />
        <div className="polkadot-dot absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '1s' }} />
        <div className="polkadot-dot absolute bottom-1/3 left-1/3 animate-float" style={{ animationDelay: '2s' }} />
        <div className="polkadot-dot absolute top-2/3 right-1/3 animate-float" style={{ animationDelay: '3s' }} />
        <div className="polkadot-dot absolute bottom-1/4 right-1/2 animate-float" style={{ animationDelay: '4s' }} />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Mint Your <span 
                className="inline-block text-transparent bg-clip-text animate-gradient"
                style={{
                  backgroundImage: 'linear-gradient(to right, #a855f7, #14b8a6, #a855f7)',
                  backgroundSize: '300% 100%',
                  animationDuration: '3s',
                  WebkitBackgroundClip: 'text'
                }}
              >
                Certificate
              </span>
          </h1>
          <p className="text-xl text-gray-300">
            Upload, verify, and mint your certificate as an NFT
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <StepIndicator steps={steps} />
        </div>

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-yellow-400 mr-2">⚠️</div>
                <p className="text-yellow-400 text-sm">Please connect your wallet to verify certificates on the blockchain.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <Alert
              type="error"
              title="Certificate Verification Failed"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {/* Tx hash display */}
        {txHash && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Mint transaction submitted:</p>
              <p className="text-white font-mono text-sm break-all">{txHash}</p>
              {txUrl && (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-3 text-purple-300 hover:text-purple-200 underline"
                >
                  View on Explorer
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card className="max-w-2xl mx-auto">
          {/* Upload Step */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              {uploadedFile ? (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                  <Check className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-semibold">1</span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">Upload Certificate</h2>
            </div>
            <p className="text-gray-400 mb-6">Upload your PDF certificate.</p>
            
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FileText className="w-16 h-16 text-purple-500 mb-4" />
                {uploadedFile ? (
                  <div>
                    <p className="text-white font-medium">{uploadedFile.name}</p>
                    <p className="text-gray-400 text-sm">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white mb-2">Click to upload PDF certificate</p>
                    <p className="text-gray-400 text-sm">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Verify Step */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              {isVerified ? (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                  <Check className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-semibold">2</span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">Verify Certificate</h2>
            </div>
            <p className="text-gray-400 mb-6">Complete both verification steps to proceed with minting.</p>
            
            {/* On-chain Verification Substep */}
            <div className="mb-6 p-4 border border-gray-600 rounded-lg">
              <div className="flex items-center mb-3">
                {isOnChainVerified ? (
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xs font-semibold">2.1</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white">On-chain Verification</h3>
              </div>
              <p className="text-gray-400 mb-4">Generate hash and verify on blockchain.</p>
              
              <Button
                onClick={handleOnChainVerify}
                disabled={!uploadedFile || isCheckingOnChain || isOnChainVerified}
                className="w-full mb-4"
              >
                {isCheckingOnChain ? 'Checking...' : isOnChainVerified ? 'Verified ✓' : 'Verify On-chain'}
              </Button>

              {/* Network status indicator */}
              {isCheckingOnChain && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-3"></div>
                    <div>
                      <p className="text-blue-400 text-sm font-medium">Verifying on blockchain...</p>
                      <p className="text-blue-300 text-xs mt-1">This may take a few moments</p>
                    </div>
                  </div>
                </div>
              )}

              {verificationHash && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Certificate Hash:</p>
                  <p className="text-white font-mono text-sm break-all">{verificationHash}</p>
                  {isCheckingOnChain && (
                    <p className="text-sm text-blue-400 mt-2">Checking blockchain...</p>
                  )}
                </div>
              )}
              
              {isOnChainVerified && !error && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-green-400 text-sm">On-chain verification complete! Certificate is unique.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Server-side Verification Substep */}
            <div className="mb-6 p-4 border border-gray-600 rounded-lg">
              <div className="flex items-center mb-3">
                {isServerSideVerified ? (
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xs font-semibold">2.2</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white">Server-side Verification</h3>
              </div>
              <p className="text-gray-400 mb-4">Verify certificate details with backend.</p>
              
              <Button
                onClick={handleServerSideVerify}
                disabled={!uploadedFile || isCheckingServerSide || isServerSideVerified || !isOnChainVerified}
                className="w-full mb-4"
              >
                {isCheckingServerSide ? 'Verifying...' : isServerSideVerified ? 'Verified ✓' : 'Verify Server-side'}
              </Button>

              {/* Server-side verification status indicator */}
              {isCheckingServerSide && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-3"></div>
                    <div>
                      <p className="text-purple-400 text-sm font-medium">Verifying certificate details...</p>
                      <p className="text-purple-300 text-xs mt-1">Processing with backend server</p>
                    </div>
                  </div>
                </div>
              )}
              
              {isServerSideVerified && !error && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-green-400 text-sm">Server-side verification complete! Certificate details validated.</p>
                  </div>
                </div>
              )}
            </div>
            
            {isVerified && !error && (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-green-400 text-sm">All verifications complete! Certificate is ready to mint.</p>
                  </div>
                </div>
                
                {/* Certificate Display - Show automatically after verification */}
                {certificateData && (
                  <CertificateDisplay 
                    fields={certificateData.fields} 
                    isVerified={certificateData.is_verified} 
                  />
                )}
              </div>
            )}
          </div>

          {/* Mint Step */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              {isMinted ? (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                  <Check className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-semibold">3</span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">Mint NFT</h2>
            </div>
            <p className="text-gray-400 mb-4">Create your certificate NFT.</p>
            
            {isMinted ? (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Certificate NFT Minted Successfully!</h3>
                  <p className="text-gray-400 mb-6">Your certificate has been verified and minted as an NFT on the blockchain.</p>
                  
                  {/* Transaction Details */}
                  {txHash && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center mb-2">
                        <Check className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-medium">Transaction Confirmed</span>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-300 text-sm mb-2">Transaction Hash:</p>
                        <div className="bg-gray-800/50 rounded px-3 py-2 mb-3">
                          <code className="text-green-400 text-xs break-all">{txHash}</code>
                        </div>
                        {txUrl && (
                          <Button
                            onClick={() => window.open(txUrl, '_blank')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Explorer
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Certificate Details */}
                  {certificateData && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h4 className="text-blue-400 font-medium mb-2">Certificate Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Merkle Root:</span>
                          <code className="text-blue-300 text-xs">{certificateData.merkle_root}</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Verification Status:</span>
                          <span className="text-green-400">✓ Verified</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
                    <Button
                      onClick={() => {
                        setUploadedFile(null);
                        setVerificationHash('');
                        setIsOnChainVerified(false);
                        setIsServerSideVerified(false);
                        setIsVerified(false);
                        setIsMinted(false);
                        setError(null);
                        setCertificateData(null);
                        setTxHash(null);
                        setTxUrl(null);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Mint Another Certificate
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleOnChainMint}
                  disabled={!isVerified || isOnChainMint}
                  className="w-full"
                >
                  {isOnChainMint ? 'Minting NFT...' : 'Mint NFT'}
                </Button>
                
                {/* Minting progress indicator */}
                {isOnChainMint && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-3"></div>
                      <div>
                        <p className="text-purple-400 text-sm font-medium">Minting NFT...</p>
                        <p className="text-purple-300 text-xs mt-1">Please sign the transaction in your wallet</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
