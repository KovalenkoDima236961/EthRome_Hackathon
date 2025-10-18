import { debug } from '../utils/debug';
import type { 
  CertificateFields, 
  CertificateVerificationResponse, 
  CertificateErrorResponse 
} from '../types/certificate';

export type { CertificateFields, CertificateVerificationResponse, CertificateErrorResponse };

export class CertificateService {
  private baseUrl: string;

  constructor() {
    // In development, use localhost. In production, use your deployed backend URL
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8000' 
      : 'https://your-backend-url.com';
  }

  /**
   * Verify certificate by sending PDF to backend
   */
  async verifyCertificate(file: File): Promise<CertificateVerificationResponse> {
    debug.log('CertificateService: Starting certificate verification...');
    
    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', file);
      
      debug.log('CertificateService: Sending request to backend...', {
        url: `${this.baseUrl}/api/verify_certificate`,
        fileName: file.name,
        fileSize: file.size
      });

      const response = await fetch(`${this.baseUrl}/api/verify_certificate`, {
        method: 'POST',
        body: formData,
      });

      debug.log('CertificateService: Response received:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData: CertificateErrorResponse = await response.json();
        debug.error('CertificateService: API error response:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: CertificateVerificationResponse = await response.json();
      debug.log('CertificateService: Verification successful:', data);
      
      return data;
    } catch (error: any) {
      debug.error('CertificateService: Error verifying certificate:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to verification service. Please check your connection and try again.');
      }
      
      // Re-throw API errors
      throw error;
    }
  }

  /**
   * Get the backend base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
