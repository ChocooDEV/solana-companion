"use client";
import { WalletConnect } from '../components/WalletConnect';
import { TransactionHistory } from '../components/TransactionHistory';
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function TransactionsPage() {
  const [network, setNetwork] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the RPC URL to determine if we're on devnet
    const fetchNetwork = async () => {
      try {
        const response = await fetch('/api/env?key=RPC_API_URL');
        if (response.ok) {
          const data = await response.json();
          // Check if the URL contains 'devnet'
          if (data.value && data.value.includes('devnet')) {
            setNetwork('devnet');
          } else {
            setNetwork('mainnet');
          }
        }
      } catch (error) {
        console.error('Error fetching network info:', error);
        // Default to devnet if there's an error
        setNetwork('devnet');
      } finally {
        setLoading(false);
      }
    };

    fetchNetwork();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#A0EACF] to-[#E0B0E5] p-4 sm:p-6">
      <header className="flex flex-col mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <Image 
                src="/logo.png" 
                alt="Solana Companion Logo" 
                width={200} 
                height={200}
                className="w-20 h-auto sm:w-24 md:w-28 cursor-pointer"
              />
            </Link>
            
            {/* Devnet Banner - now next to logo */}
            {network === 'devnet' && (
              <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-2 ml-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">On <span className="font-bold">Devnet</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col items-center">        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-7xl mb-3">
          <WalletConnect/>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-7xl flex-grow">
          <TransactionHistory />
        </div>
        
        <div className="mt-4">
          <Link 
            href="/"
            className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-2 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
      
      <footer className="text-center text-xs text-[#777] mt-4">
        © 2025 Solana Companion, by <Link href="https://x.com/chocoo_web3" className="text-blue-500 hover:underline">Chocoo</Link>
      </footer>
    </div>
  );
} 