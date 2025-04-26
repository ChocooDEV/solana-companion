'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConfirmedSignatureInfo } from '@solana/web3.js';
import Image from 'next/image';

export const TransactionHistory: FC = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<Record<string, { type: string, summary: string }>>({});

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!connected || !publicKey) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/transactions?wallet=${publicKey.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        setTransactions(data.transactions);
        
        // Fetch transaction details to determine types and summaries
        const txDetails: Record<string, { type: string, summary: string }> = {};
        for (const tx of data.transactions) {
          try {
            // Add a delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Pass the wallet address to the transaction-details API
            const detailsResponse = await fetch(`/api/transaction-details?signature=${tx.signature}&wallet=${publicKey.toString()}`);
            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              txDetails[tx.signature] = {
                type: details.type || 'Unknown',
                summary: details.summary || 'Transaction details unavailable'
              };
            }
          } catch (err) {
            console.error('Error fetching transaction details:', err);
            txDetails[tx.signature] = {
              type: 'Unknown',
              summary: 'Failed to load details'
            };
          }
        }
        setTransactionDetails(txDetails);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [publicKey, connected]);

  if (!connected) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mt-8">
      <h2 className="text-xl font-bold mb-4">Transaction History</h2>
      
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {!loading && !error && transactions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No transactions found for this wallet.
        </div>
      )}
      
      {!loading && !error && transactions.length > 0 && (
        <div className="border border-black/[.08] dark:border-white/[.145] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/[.05] dark:bg-white/[.06]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Signature</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Summary</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Block Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.signature} className="border-t border-black/[.08] dark:border-white/[.145]">
                  <td className="px-4 py-3 text-sm font-mono">
                    <a 
                      href={`https://explorer.solana.com/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {transactionDetails[tx.signature]?.type || 'Loading...'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {transactionDetails[tx.signature]?.summary || 'Loading...'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.err ? (
                      <span className="text-red-600 dark:text-red-400">Failed</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">Success</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}; 