import React from 'react';
import { Alert } from './Alert';

export const WalletInstructions: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto mb-6">
      <Alert
        type="info"
        title="Talisman Wallet Connection"
        message="When connecting with Talisman, a popup window will open. Please click 'Yes' to approve the connection, then return to this tab. The connection should complete automatically."
      />
    </div>
  );
};
