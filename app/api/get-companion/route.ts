import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('walletAddress') || searchParams.get('wallet');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const umi = createUmi('https://api.devnet.solana.com'); ///*process.env.RPC_API_URL || */
    const collectionAddress = process.env.COLLECTION_ADDRESS || '6GfRWbTgpMJB51hXzp5CuDVGwVTFhAFCJvxqQEswe2bY';

    // Fetch all assets owned by the wallet
    const assets = await fetchAssetsByOwner(umi, publicKey(walletAddress));
    
    // Find all assets that belong to our collection
    const companions = assets.filter(asset => {
      // Check if the asset has an updateAuthority of type Collection
      if (asset.updateAuthority?.type === 'Collection') {
        // Compare the collection address with our target collection
        return asset.updateAuthority.address === collectionAddress;
      }
      return false;
    });
    
    if (companions.length === 0) {
      return NextResponse.json({ message: 'No companions found for this wallet' }, { status: 404 });
    }

    // Get the first companion
    const firstCompanion = companions[0];

    // Extract the mint address - this is the publicKey of the asset
    const mintAddress = firstCompanion.publicKey;

    // We need to fetch the metadata from the URI
    const metadataUri = firstCompanion.uri;

    // Initialize companion object - we'll populate it from metadata
    let companion: any = {};

    // Try to fetch the metadata from the URI
    try {
      if (metadataUri) {
        const metadataResponse = await fetch(metadataUri);
        
        // Check if the response is valid JSON before parsing
        const contentType = metadataResponse.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`Invalid content type: ${contentType}. Using fallback data.`);
          
          // Use fallback data
          companion = {
            name: firstCompanion.name || "Error please contact the team",
            description: "Error please contact the team",
            image: "/companions/companion1.png",
            dateOfBirth: new Date().toISOString(),
            level: 0,
            experience: 0,
            evolution: 0,
            mood: "ERROR",
            attributes: [
              { trait_type: "Experience", value: "0" },
              { trait_type: "Level", value: "0" },
              { trait_type: "Evolution", value: "0" },
              { trait_type: "Mood", value: "ERROR" },
              { trait_type: "DateOfBirth", value: new Date().toISOString() }
            ],
          };
        } else {
          // Try to parse the JSON
          try {
            const metadata = await metadataResponse.json();
            console.log("Metadata:", metadata);
            
            // Populate companion with metadata values
            companion = {
              name: metadata.name || "Error while fetching companion",
              description: metadata.description || "No description available",
              // Fix the image path if it's a relative path
              image: metadata.image?.startsWith('http') ? metadata.image : 
                     metadata.image?.startsWith('/') ? metadata.image : 
                     `/companions/companion1.png`,
              dateOfBirth: metadata.attributes?.find((attr: any) => attr.trait_type === "DateOfBirth")?.value || new Date().toISOString(),
              level: parseInt(metadata.attributes?.find((attr: any) => attr.trait_type === "Level")?.value) || 0,
              experience: parseInt(metadata.attributes?.find((attr: any) => attr.trait_type === "Experience")?.value) || 0,
              evolution: parseInt(metadata.attributes?.find((attr: any) => attr.trait_type === "Evolution")?.value) || 0,
              mood: metadata.attributes?.find((attr: any) => attr.trait_type === "Mood")?.value || "Neutral",
              attributes: metadata.attributes || [],
            };
          } catch (jsonError) {
            console.error("Error parsing JSON:", jsonError);
            throw new Error("Invalid JSON in metadata response");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
      // Removed fallback data - now we'll just throw the error
      throw error; // This will be caught by the outer try/catch
    }

    // Return the companion and mint address
    return NextResponse.json({ companion, mintAddress });
  } catch (error) {
    console.error('Error fetching companions:', error);
    return NextResponse.json({ error: 'Failed to fetch companions' }, { status: 500 });
  }
}
