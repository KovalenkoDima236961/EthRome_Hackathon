import React from 'react';
import { Check, Award, User, BookOpen, Hash } from 'lucide-react';
import type { CertificateFields } from '../types/certificate';

interface CertificateDisplayProps {
  fields: CertificateFields;
  isVerified: boolean;
}

export const CertificateDisplay: React.FC<CertificateDisplayProps> = ({ fields, isVerified }) => {
  const fieldConfig = [
    {
      key: 'Certificate ID' as keyof CertificateFields,
      label: 'Certificate ID',
      icon: Hash,
      color: 'text-blue-400'
    },
    {
      key: 'Instructor' as keyof CertificateFields,
      label: 'Instructor',
      icon: User,
      color: 'text-green-400'
    },
    {
      key: 'Course Name' as keyof CertificateFields,
      label: 'Course',
      icon: BookOpen,
      color: 'text-purple-400'
    },
    {
      key: 'User Name & Surname' as keyof CertificateFields,
      label: 'Student',
      icon: User,
      color: 'text-teal-400'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-8 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          {isVerified ? (
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
              <Check className="w-8 h-8 text-white" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
              <Award className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-2xl font-bold text-white">
              {isVerified ? 'Certificate Verified' : 'Verification Failed'}
            </h3>
            <p className="text-gray-400">
              {isVerified ? 'Certificate details extracted successfully' : 'Unable to verify certificate'}
            </p>
          </div>
        </div>
      </div>

      {/* Certificate Details */}
      {isVerified && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fieldConfig.map((field) => {
              const IconComponent = field.icon;
              return (
                <div
                  key={field.key}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center mb-3">
                    <IconComponent className={`w-5 h-5 ${field.color} mr-3`} />
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      {field.label}
                    </h4>
                  </div>
                  <p className="text-white font-medium text-lg break-words">
                    {fields[field.key]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Verification Badge */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-green-400 font-semibold text-lg">Verification Complete</h4>
                <p className="text-green-300 text-sm">
                  This certificate has been successfully verified and is ready to be minted as an NFT.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
