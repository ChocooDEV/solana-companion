"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  const companionImages = [
    "/companions/fluffy_0.png",
    "/companions/fluffy_1.png",
    "/companions/fluffy_2.png"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % companionImages.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [companionImages.length]);

  const handleStartJourney = () => {
    router.push("/transactions");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#A0EACF] to-[#E0B0E5] p-8 sm:p-20">      
      <header className="flex justify-between items-center">
        <div className="flex items-center">
          <Image 
            src="/logo.png" 
            alt="Solana Companion Logo" 
            width={200} 
            height={200}
            className="w-32 h-auto sm:w-48 md:w-52 lg:w-56 mr-2"
          />
        </div>
        <nav className={`z-10 flex flex-col items-center justify-center space-y-8 transition-all duration-300 ease-in-out ${isMenuOpen ? 'fixed inset-0 bg-white bg-opacity-90' : 'hidden'} md:flex md:static md:bg-transparent md:space-y-0 md:flex-row md:justify-end`}>
          <Link href="#features" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>Features</Link>
          <Link href="#technology" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>Technology</Link>
          <Link href="#companions" className="text-lg text-[#444] hover:text-[#222] md:mx-4" onClick={() => setIsMenuOpen(false)}>Companions</Link>
          <button className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 md:mx-4" onClick={() => {
            setIsMenuOpen(false);
            handleStartJourney();
          }}>
            Start Your Journey
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
      
      {/* Hero section - now full screen */}
      <section className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center">
        <h2 className="text-5xl font-extrabold mb-2 md:mt-[-250px] text-[#222]">Meet your Solana Companion</h2>
        
        <div className="relative w-[600px] h-[600px] mb-8">
          {companionImages.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt={`Solana Companion ${index + 1}`}
              width={600}
              height={600}
              className={`absolute top-0 left-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <p className="text-xl text-[#444] max-w-2xl">
          Your digital Companion grows as you interact with the Solana blockchain. Earn XP, evolve, and customize it along your journey!
        </p>
        
        <button className="mt-8 bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105" onClick={handleStartJourney}>
          Start Your Journey
        </button>
        
        <div className="flex justify-center mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center hover:translate-y-[-5px] hover:bg-white/90">
              <div className="bg-[#ff6f61] rounded-full p-2 mr-4 transition-transform duration-300 group-hover:scale-110">🌟</div>
              <span className="font-medium text-[#222]">Dynamic Companion Mood</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center hover:translate-y-[-5px] hover:bg-white/90">
              <div className="bg-[#6c5ce7] rounded-full p-2 mr-4 transition-transform duration-300 group-hover:scale-110">🎮</div>
              <span className="font-medium text-[#222]">Level Up and Evolve</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center hover:translate-y-[-5px] hover:bg-white/90">
              <div className="bg-[#00b894] rounded-full p-2 mr-4 transition-transform duration-300 group-hover:scale-110">🎨</div>
              <span className="font-medium text-[#222]">Customize Your Companion</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center hover:translate-y-[-5px] hover:bg-white/90">
              <div className="bg-[#fdcb6e] rounded-full p-2 mr-4 transition-transform duration-300 group-hover:scale-110">🚀</div>
              <span className="font-medium text-[#222]">On-chain Actions Earn Rewards</span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-grow flex flex-col items-center justify-center text-center">
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
                  Forget to check in? Uh-oh! Your Companion&apos;s mood will drop...
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
                      Simply connect your wallet no matter what device you&apos;re on to get your XP
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
        
        {/* Tech Stack section */}
        <section className="w-full max-w-6xl mx-auto mt-20 mb-10" id="technology">
          <h2 className="text-4xl font-bold mb-12 text-[#222] text-center">Our Tech Stack</h2>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <Image
                  src="/tech.png"
                  alt="Technology Stack"
                  width={500}
                  height={350}
                  className="rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                />
              </div>
              
              <div className="md:w-1/2 text-left">
                <h3 className="text-2xl font-bold text-[#333] mb-4 animate-fadeIn">Powered by Solana&apos;s Ecosystem</h3>
                <p className="text-[#555] mb-4 leading-relaxed animate-fadeIn animation-delay-200">
                  We leverage the best of Solana&apos;s ecosystem to create a seamless and engaging experience for your Companion journey
                </p>
                
                <div className="space-y-6 mt-6">
                  <div className="flex items-start animate-slideRight animation-delay-300 hover:translate-x-2 transition-transform duration-300">
                    <div className="bg-[#ff6f61] rounded-full p-2 mr-3 mt-1 animate-pulse animation-delay-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#333]">Irys for Permanent Storage</h4>
                      <p className="text-[#555] leading-relaxed">
                        Your Companion&apos;s data is securely stored on <a href="https://irys.xyz/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Irys</a>, ensuring permanent and decentralized storage of all your achievements and customizations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start animate-slideRight animation-delay-500 hover:translate-x-2 transition-transform duration-300">
                    <div className="bg-[#6c5ce7] rounded-full p-2 mr-3 mt-1 animate-pulse animation-delay-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#333]">Helius for Transaction History</h4>
                      <p className="text-[#555] leading-relaxed">
                        We use <a href="https://www.helius.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Helius</a> to read your wallet transaction history, allowing your Companion to react to your on-chain activities and reward you accordingly
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start animate-slideRight animation-delay-700 hover:translate-x-2 transition-transform duration-300">
                    <div className="bg-[#fdcb6e] rounded-full p-2 mr-3 mt-1 animate-pulse animation-delay-900">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#333]">Metaplex for NFTs</h4>
                      <p className="text-[#555] leading-relaxed">
                        We use <a href="https://www.metaplex.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Metaplex</a> to create and manage your Companion&apos;s NFTs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* New Companions/Monsters section */}
        <section className="w-full mt-20 mb-10" id="companions">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#222]">Mint your own Companion, evolve it, and customize it</h2>
          </div>
          
          <div className="grid grid-cols-5 gap-4 max-w-6xl mx-auto">
            {/* First companion (unlocked/featured) */}
            <div className="col-span-2 row-span-2 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center">
              <Image
                src="/companions/fluffy_0.png"
                alt="Fluffy companion with heart"
                width={180}
                height={180}
                className="transform hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Unlocked companions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center">
              <Image
                src="/companions/fluffy_1.png"
                alt="Brown furry companion"
                width={70}
                height={70}
                className="transform hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center">
              <Image
                src="/companions/fluffy_2.png"
                alt="Blue furry companion"
                width={70}
                height={70}
                className="transform hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center">
              <Image
                src="/companions/ember_0.png"
                alt="Brown companion with big eyes"
                width={70}
                height={70}
                className="transform hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            {/* Locked companions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center relative group">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="opacity-30 blur-sm">
                <Image
                  src="/companions/ember_1.png"
                  alt="Locked companion"
                  width={70}
                  height={70}
                />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center relative group">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="opacity-30 blur-sm">
                <Image  
                  src="/companions/ember_2.png"
                  alt="Locked companion"
                  width={70}
                  height={70}
                />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center relative group">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="opacity-30 blur-sm">
                <Image
                  src="/companions/sparky_0.png"
                  alt="Locked companion"
                  width={70}
                  height={70}
                />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center relative group">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="opacity-30 blur-sm">
                <Image
                  src="/companions/sparky_1.png"
                  alt="Locked companion"
                  width={70}
                  height={70}
                />
              </div>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <button className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-3 px-8 rounded-full mb-10 transition duration-300 ease-in-out transform hover:scale-105" onClick={handleStartJourney}>
              Start Your Journey
            </button>
          </div>
        </section>
      </main>
      
      <footer className="text-center text-xs text-[#777] mt-10">
        © 2025 Solana Companion, by <Link href="https://x.com/chocoo_web3" className="text-blue-500 hover:underline">Chocoo</Link>
      </footer>
    </div>
  );
}
