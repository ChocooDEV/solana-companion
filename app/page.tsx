"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#A0EACF] to-[#E0B0E5] p-8 sm:p-20">      
      <header className="flex justify-between items-center py-2">
        <div className="text-2xl font-bold text-[#222]">Solana Companion</div>
        <nav className={`z-10 flex flex-col items-center justify-center space-y-8 transition-all duration-300 ease-in-out ${isMenuOpen ? 'fixed inset-0 bg-white bg-opacity-90' : 'hidden'} md:flex md:static md:bg-transparent md:space-y-0 md:flex-row md:justify-end`}>
          <Link href="#features" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>Features</Link>
          <Link href="#about" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>About Us</Link>
          <Link href="#companions" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>Companions</Link>
          <button className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 md:mx-4" onClick={() => setIsMenuOpen(false)}>
            Try for Free
          </button>
        </nav>
        <div className="md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#444] focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </div>
      </header>
      
      <h2 className="mt-10 text-5xl font-extrabold mb-6 text-[#222] text-center">Meet your Solana Companion</h2>

      <main className="flex-grow flex flex-col items-center justify-center text-center">
        <Image
          src="/companion.png"
          alt="Solana Companion"
          width={600}
          height={600}
          className="mb-8"
        />

        <p className="text-xl text-[#444]">
          Your digital Companion grows as you interact with the Solana blockchain. Earn XP, evolve, and customize it along your journey!
        </p>
        
        <button className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-3 px-8 rounded-full mb-10 transition duration-300 ease-in-out transform hover:scale-105">
          Start Your Journey
        </button>
        
        <div className="flex justify-center">
          <div className="grid grid-cols-2 grid-rows-2 gap-6 text-lg text-[#444]">
            <div className="text-left">🌟 Dynamic Companion Mood</div>
            <div className="text-left">🎮 Level Up and Evolve</div>
            <div className="text-left">🎨 Customize Your Companion</div>
            <div className="text-left">🚀 On-chain Actions Earn Rewards</div>
          </div>
        </div>
      </main>
      
      <footer className="text-center text-xs text-[#777] mt-10">
        © 2025 Solana Companion, by <Link href="https://x.com/chocoo_web3" className="text-blue-500 hover:underline">Chocoo</Link>
      </footer>
    </div>
  );
}
