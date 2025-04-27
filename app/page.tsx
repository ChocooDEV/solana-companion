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
        
        {/* New productivity features section */}
        <section className="w-full max-w-6xl mx-auto mt-20 mb-10" id="features">
          <h2 className="text-4xl font-bold mb-12 text-[#222] text-center">Track Your Blockchain Journey</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full border-l-4 border-[#ff6f61] hover:translate-y-[-5px] group">
              <div className="flex items-start mb-4">
                <div className="bg-[#ff6f61] rounded-full p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#333] text-left">Daily Activities🔥</h3>
              </div>
              <div className="pl-12 text-left">
                <p className="text-[#555] mb-3 leading-relaxed">
                  Connect daily and watch your Companion grow with XP rewards
                </p>
                <p className="text-[#555] mb-3 leading-relaxed">
                  Keep your streak alive and your Companion will be in a good mood
                </p>
                <p className="text-[#555] mb-3 leading-relaxed">
                  Forget to check in? Uh-oh! Your Companion's mood will drop...
                </p>
                <p className="text-[#555] leading-relaxed">
                  Stack that XP to unlock epic evolutions and new customizations
                </p>
              </div>
            </div>
            
            {/* Feature 2 */} 
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full border-l-4 border-[#6c5ce7] hover:translate-y-[-5px] group">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-start mb-4">
                    <div className="bg-[#6c5ce7] rounded-full p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-[#333] text-left">Pocket-Sized Friend 📱</h3>
                  </div>
                  <div className="pl-12 text-left">
                    <p className="text-[#555] mb-3 leading-relaxed">
                      Your Companion follows you everywhere
                    </p>
                    <p className="text-[#555] mb-3 leading-relaxed">
                      Simply connect your wallet no matter what device you're on to get your XP
                    </p>
                    <p className="text-[#555] leading-relaxed">
                      Show off your Companion to your friends and make them jealous
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 md:w-1/3 flex justify-center group-hover:rotate-3 transition-transform duration-300">
                  <Image
                    src="/mobile_mockup.png" 
                    alt="Mobile app mockup"
                    width={180}
                    height={360}
                    className="shadow-lg rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "https://placehold.co/180x360/6c5ce7/white?text=App+Preview";
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full border-l-4 border-[#00b894] hover:translate-y-[-5px] group">
              <div className="flex items-start mb-4">
                <div className="bg-[#00b894] rounded-full p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#333] text-left">Customize Your Companion 🎨</h3>
              </div>
              <div className="pl-12 text-left">
                <p className="text-[#555] mb-3 leading-relaxed">
                  Dress up your Companion with accessories and styles
                </p>
                <p className="text-[#555] mb-3 leading-relaxed">
                  Crush challenges to unlock the coolest gear in the Solanaverse
                </p>
                <p className="text-[#555] leading-relaxed">
                  Hunt for ultra-rare items that only drop from special on-chain quests
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="text-center text-xs text-[#777] mt-10">
        © 2025 Solana Companion, by <Link href="https://x.com/chocoo_web3" className="text-blue-500 hover:underline">Chocoo</Link>
      </footer>
    </div>
  );
}
