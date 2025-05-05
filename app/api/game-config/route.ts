import { NextResponse } from 'next/server';

// Define the game configuration
const gameConfig = {
  // XP needed for each level (index = level, value = total XP needed)
  levelThresholds: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300],
  
  // Level thresholds for each evolution
  evolutionThresholds: [0, 1, 3, 6, 9],
  
  companionImages: {
    "fluffy": [
      "https://i.imgur.com/G23LWPB.png",
      "https://i.imgur.com/QfLdipz.png",
      "https://i.imgur.com/9C4gBgT.png"
    ],
    "sparky": [
      "https://i.imgur.com/kT3vhVB.png",
      "https://i.imgur.com/wh0a7rD.png",
      "https://i.imgur.com/ZllCJrP.png"
    ],
    "ember": [
      "https://i.imgur.com/HKXTRsf.png",
      "https://i.imgur.com/lsi8iM2.png",
      "https://i.imgur.com/ChMcpcb.png"
    ]
  }
};

export async function GET() {
  return NextResponse.json(gameConfig);
} 