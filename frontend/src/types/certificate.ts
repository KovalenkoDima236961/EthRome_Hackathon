export interface CertificateFields {
  "Certificate ID": string;
  "Instructor": string;
  "Course Name": string;
  "User Name & Surname": string;
}

export interface CertificateVerificationResponse {
  is_verified: boolean;
  fields: CertificateFields;
}

export interface CertificateErrorResponse {
  detail: string;
}
