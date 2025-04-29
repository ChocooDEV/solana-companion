'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { Companion } from '../types/companion';
import { CompanionUpdate } from './CompanionUpdate';

export const CompanionDisplay: FC = () => {
  const { publicKey } = useWallet();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  useEffect(() => {
    const fetchCompanion = async () => {
      if (!publicKey) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/get-companion?wallet=${publicKey.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch companion data');
        }
        
        const data = await response.json();
        if (data.companion) {
          setCompanion(data.companion);
          setMintAddress(data.mintAddress);
        }
      } catch (err) {
        console.error('Error fetching companion:', err);
        setError('Failed to load your companion. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanion();
  }, [publicKey]);

  const handleCompanionUpdate = (updatedCompanion: Companion) => {
    setCompanion(updatedCompanion);
    setShowUpdateForm(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#444]"></div>
        <p className="text-[#444]">Loading your companion...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!companion) {
    return null;
  }

  // Calculate age in days
  const birthDate = new Date(companion.dateOfBirth);
  const today = new Date();
  const ageInDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 mb-8">
      <div className="flex flex-col md:flex-row items-center">
        <div className="md:w-1/3 flex justify-center mb-4 md:mb-0">
          <Image
            src={companion.image}
            alt={companion.name}
            width={150}
            height={150}
            className="rounded-full border-4 border-[#ff6f61]"
          />
        </div>
        
        <div className="md:w-2/3 md:pl-6">
          <h3 className="text-2xl font-bold text-[#333] mb-2">{companion.name}</h3>
          
          <p className="text-sm text-[#666] mb-4">{companion.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-[#666]">Age</p>
              <p className="text-lg font-medium text-[#333]">{ageInDays} days</p>
            </div>
            
            {['level', 'experience', 'evolution', 'mood'].map(attr => {
              const value = companion[attr as keyof Companion];
              const displayValue = 
                attr === 'evolution' ? `Stage ${value}` : 
                attr === 'experience' ? `${value} XP` : 
                typeof value === 'string' || typeof value === 'number' ? value : 
                String(value);
                
              return (
                <div key={attr}>
                  <p className="text-sm text-[#666]">{attr.charAt(0).toUpperCase() + attr.slice(1)}</p>
                  <p className="text-lg font-medium text-[#333]">{displayValue}</p>
                </div>
              );
            })}
            
            {companion.attributes
              .filter(attr => 
                !['Level', 'Experience', 'Evolution', 'Mood', 'DateOfBirth'].includes(attr.trait_type)
              )
              .map(attr => (
                <div key={attr.trait_type}>
                  <p className="text-sm text-[#666]">{attr.trait_type}</p>
                  <p className="text-lg font-medium text-[#333]">{attr.value || "None"}</p>
                </div>
              ))
            }
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-[#ff6f61] h-2.5 rounded-full" 
              style={{ width: `${Math.min(companion.experience / 100, 100)}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-[#666] mb-4">
            {100 - companion.experience} XP until next level
          </p>
          
          <button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className="bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out"
          >
            {showUpdateForm ? 'Hide Update Form' : 'Update Companion'}
          </button>
        </div>
      </div>
      
      {showUpdateForm && mintAddress && (
        <CompanionUpdate 
          companion={companion} 
          mintAddress={mintAddress}
          onUpdate={handleCompanionUpdate}
        />
      )}
    </div>
  );
}; 