"use client";
import { WalletConnect } from '../components/WalletConnect';
import { TransactionHistory } from '../components/TransactionHistory';
import Link from "next/link";
import Image from "next/image";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#A0EACF] to-[#E0B0E5] p-4 sm:p-8 md:p-12 lg:p-16">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/">
            <Image 
              src="/logo.png" 
              alt="Solana Companion Logo" 
              width={200} 
              height={200}
              className="w-28 h-auto sm:w-36 md:w-40 lg:w-44 mr-2 cursor-pointer"
            />
          </Link>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col items-center">        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-7xl mb-4">
          <WalletConnect/>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-7xl flex-grow">
          <TransactionHistory />
        </div>
        
        <div className="mt-6">
          <Link 
            href="/"
            className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-2 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
      
      <footer className="text-center text-xs text-[#777] mt-8">
        © 2025 Solana Companion, by <Link href="https://x.com/chocoo_web3" className="text-blue-500 hover:underline">Chocoo</Link>
      </footer>
    </div>
  );
} 