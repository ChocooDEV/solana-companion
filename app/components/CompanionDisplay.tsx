'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { Companion, CompanionAttribute } from '../types/companion';
import { CompanionProgress } from './CompanionProgress';

export const CompanionDisplay: FC = () => {
  const { publicKey } = useWallet();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          // Extract xpForNextLevel from attributes if it exists
          const xpForNextLevelAttr = data.companion.attributes.find(
            (attr: CompanionAttribute) => attr.trait_type === 'XpForNextLevel'
          );
          
          // Set the companion with the extracted xpForNextLevel
          setCompanion({
            ...data.companion,
            xpForNextLevel: xpForNextLevelAttr ? Number(xpForNextLevelAttr.value) : 100 // Default to 100 if not found
          });
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

  // Format the lastUpdated date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    
    // Format date as "2nd May 2025" with ordinal suffix
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    // Format time as "8:07pm" (12-hour format with am/pm)
    const timeString = date.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `${day}${ordinalSuffix} ${month} ${year}, ${timeString}`;
  };
  
  // Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 mb-8">
      <div className="flex flex-col md:flex-row items-center">
        <div className="md:w-1/3 flex justify-center mb-4 md:mb-0">
          <Image
            src={companion.image}
            alt={companion.name}
            width={200}
            height={200}
            className="rounded-lg"
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
            
            <div>
              <p className="text-sm text-[#666]">Last sync</p>
              <p className="text-lg font-medium text-[#333]">{formatDate(companion.lastUpdated)}</p>
            </div>
            
            {companion.attributes
              .filter(attr => 
                !['Level', 'Experience', 'Evolution', 'Mood', 'DateOfBirth', 'LastUpdated', 'XpForNextLevel'].includes(attr.trait_type)
              )
              .map(attr => (
                <div key={attr.trait_type}>
                  <p className="text-sm text-[#666]">{attr.trait_type}</p>
                  <p className="text-lg font-medium text-[#333]">{attr.value || "None"}</p>
                </div>
              ))
            }
          </div>
          
          <div className="w-full bg-gray-200 rounded-md h-2.5 mb-4">
            <div 
              className="bg-[#ff6f61] h-2.5 rounded-md" 
              style={{ 
                width: `${companion.xpForNextLevel ? 
                  Math.min((companion.experience / (companion.experience + companion.xpForNextLevel)) * 100, 100) : 0}%` 
              }}
            ></div>
          </div>
          
          <p className="text-sm text-[#666] mb-4">
            {companion.xpForNextLevel ? 
              `${companion.xpForNextLevel} XP until next level` : 
              "Loading XP requirements..."}
          </p>
        </div>
      </div>
      
      {mintAddress && (
        <CompanionProgress 
          companion={companion} 
          mintAddress={mintAddress}
          onUpdate={handleCompanionUpdate}
        />
      )}
    </div>
  );
}; 