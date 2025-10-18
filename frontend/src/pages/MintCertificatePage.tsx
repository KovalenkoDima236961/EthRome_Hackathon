import React, { useState } from 'react';
import { Check, ExternalLink, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StepIndicator } from '../components/StepIndicator';
import { Alert } from '../components/Alert';
import { WalletInstructions } from '../components/WalletInstructions';
import { useWeb3 } from '../contexts/Web3Context';
import { ContractService } from '../services/contractService';
import { CertificateService } from '../services/certificateService';
import type { CertificateVerificationResponse } from '../types/certificate';
import { generatePdfHash, type Json } from '../utils/pdfUtils';
import { detectWallets } from '../utils/walletDetection';
import { debug } from '../utils/debug';
import { CertificateDisplay } from '../components/CertificateDisplay';
import { deriveSymmetricKeyFromWallet, aesEncryptBytes, aesEncryptJson } from '../utils/cryptographyUtils';
import { uploadBlobToIpfs } from "../utils/ipfs_util";

export const MintCertificatePage: React.FC = () => {
  const { isConnected, provider, account } = useWeb3();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationHash, setVerificationHash] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [isMinted, setIsMinted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingHash, setIsCheckingHash] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateVerificationResponse | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isOnChainMint, setIsOnChainMint] = useState(false);

  // Check if Talisman is available
  const wallets = detectWallets();
  const hasTalisman = wallets.some(wallet => wallet.name === 'Talisman');

  const steps = [
    {
      id: 'upload',
      title: 'Upload Certificate',
      description: 'Upload your PDF certificate to begin the verification process.',
      completed: !!uploadedFile,
      active: !uploadedFile
    },
    {
      id: 'verify',
      title: 'Verify Certificate',
      description: 'Generate hash and verify on blockchain.',
      completed: isVerified,
      active: !!uploadedFile && !isVerified
    },
    {
      id: 'mint',
      title: 'Mint NFT',
      description: 'Create your certificate NFT.',
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
      setIsVerified(false);
      setVerificationHash('');
      setIsCheckingHash(false);
      setCertificateData(null);
      setIsMinted(false);
    }
  };

  const checkPdfHash = async (file: File) => {
    debug.log('Starting PDF hash verification process...');
    
    if (!isConnected || !provider) {
      debug.error('Wallet not connected');
      setError('Please connect your wallet first');
      return;
    }

    setIsCheckingHash(true);
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
        setIsVerified(false);
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
        setIsVerified(false);
      } else {
        debug.log('Certificate is unique - verification successful');
        setError(null);
        setIsVerified(true);
      }
    } catch (err: any) {
      debug.error('Error in verification process:', err);
      
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
      setIsVerified(false);
    } finally {
      setIsCheckingHash(false);
      debug.log('Verification process completed');
    }
  };

  const handleVerify = async () => {
    if (!uploadedFile) {
      setError('Please upload a PDF file first');
      return;
    }
    
    if (!isConnected || !provider) {
      setError('Please connect your wallet first');
      return;
    }

    await checkPdfHash(uploadedFile);
  };

  const handleMint = async () => {
    if (!isVerified || !uploadedFile) return;
    
    setIsMinting(true);
    setError(null);
    
    try {
      debug.log('Starting NFT minting process...');
      
      // Call backend API to verify certificate and extract data
      const certificateService = new CertificateService();
      const verificationResult = await certificateService.verifyCertificate(uploadedFile);
      
      debug.log('Backend verification result:', verificationResult);
      
      if (verificationResult.is_verified) {
        setCertificateData(verificationResult);
        setIsMinted(true);
        debug.log('Certificate successfully verified and ready for minting');
      } else {
        setError('Certificate verification failed. Please check your certificate and try again.');
        debug.error('Certificate verification failed:', verificationResult);
      }
    } catch (err: any) {
      debug.error('Error during NFT minting process:', err);
      setError(`Failed to mint NFT: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  const handleOnChainMint = async () => {
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
      
      const backendBase =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:8000'
          : 'https://your-backend-url.com';

      const signUrl = `${backendBase}/api/sign-mint`;
      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: account,
          tokenURI: encrypytedFieldsIpfsUrl.trim(),
          verificationHash,
          merkle_root: certificateData.merkle_root,
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
      const result = await contractService.mintWithIssuerSig(
        account,
        encrypytedFieldsIpfsUrl.trim(),
        verificationHash,
        certificateData.merkle_root,
        finalDeadline,
        signature
      );
      debug.log('Mint result:', result);

      setError(null);

      alert('Certificate Minted');
    } catch (e: any) {
      debug.error('On-chain mint error: ', e);
      setError(e?.message ?? 'Failed to complete on-chain mint.');
    } finally {
      setIsOnChainMint(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Mint Your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
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

        {/* Wallet Connection Required */}
        {!isConnected && (
          <div className="max-w-2xl mx-auto mb-6">
            <Alert
              type="warning"
              title="Wallet Connection Required"
              message="Please connect your wallet to verify certificates on the blockchain."
            />
            {hasTalisman && <WalletInstructions />}
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
            <p className="text-gray-400 mb-6">Upload your PDF certificate to begin the verification process.</p>
            
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
            <p className="text-gray-400 mb-4">Click the button below to generate hash and verify on blockchain.</p>
            
            <Button
              onClick={handleVerify}
              disabled={!uploadedFile || isCheckingHash || isVerified}
              className="w-full mb-4"
            >
              {isCheckingHash ? 'Checking...' : isVerified ? 'Verified ✓' : 'Verify Certificate'}
            </Button>

            {/* Network status indicator */}
            {isCheckingHash && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-3"></div>
                  <div>
                    <p className="text-blue-400 text-sm font-medium">Verifying certificate...</p>
                    <p className="text-blue-300 text-xs mt-1">This may take a few moments</p>
                  </div>
                </div>
              </div>
            )}

            
            {verificationHash && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 mb-1">Certificate Hash:</p>
                <p className="text-white font-mono text-sm break-all">{verificationHash}</p>
                {isCheckingHash && (
                  <p className="text-sm text-blue-400 mt-2">Checking blockchain...</p>
                )}
              </div>
            )}
            
            {isVerified && !error && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  <p className="text-green-400 text-sm">Certificate verified! This certificate is unique and ready to mint.</p>
                </div>
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
                  <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                  <p className="text-gray-400 mb-6">Your certificate has been verified and is ready to mint as an NFT.</p>
                </div>
                
                {/* Certificate Display */}
                {certificateData && (
                  <CertificateDisplay 
                    fields={certificateData.fields} 
                    isVerified={certificateData.is_verified} 
                  />
                )}
                
                <div className="text-center">
                  <Button 
                    onClick={handleOnChainMint}
                    disabled={isOnChainMint}
                    className="group"
                  >
                    Complete NFT Minting
                    <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleMint}
                  disabled={!isVerified || isMinting}
                  className="w-full"
                >
                  {isMinting ? 'Processing Certificate...' : 'Mint NFT'}
                </Button>
                
                {/* Minting progress indicator */}
                {isMinting && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-3"></div>
                      <div>
                        <p className="text-purple-400 text-sm font-medium">Processing certificate...</p>
                        <p className="text-purple-300 text-xs mt-1">Verifying certificate details with backend</p>
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
