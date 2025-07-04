'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: FC = () => {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex flex-col items-center gap-4">
      <WalletMultiButton />
      {connected && publicKey ? (
        <p className="text-sm font-mono text-[#444]">
          Connected: {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-6)}
        </p>
      ) : (
        <p className="text-sm text-[#444]">Connect your wallet to track activities</p>
      )}
    </div>
  );
}; 