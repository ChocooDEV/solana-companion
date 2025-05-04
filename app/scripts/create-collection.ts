// scripts/mint-collection.ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createCollection } from '@metaplex-foundation/mpl-core';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { promises as fs } from 'fs';
import path from 'path';
import * as bs58 from 'bs58';

// Ensure output directory exists
const OUT_DIR = path.join(process.cwd(), '.soldir');

// Collection configuration
const COLLECTION_CONFIG = {
  name: 'Solana Companions',
  description: 'Digital companions that grow with you on your blockchain journey',
  image: 'https://i.imgur.com/xXnVejh.png', 
  soulbound: false,
};

// Generate collection metadata
const generateCollectionMetadata = ({
  name,
  image,
  description,
  creator,
}: {
  name: string;
  image: string;
  description: string;
  creator: string;
}) => {
  return {
    name,
    image,
    description,
    symbol: 'SOLCOMP',
    external_url: 'https://solana-companions.vercel.app',
    seller_fee_basis_points: 0,
    attributes: [],
    collection: {
      name,
      family: 'Solana Companions',
    },
    properties: {
      category: 'image',
      creators: [
        {
          address: creator,
          share: 100,
        },
      ],
    },
  };
};

// Create collection function
const createCompanionCollection = async () => {
  try {
    // Create UMI instance
    const umi = createUmi('https://api.devnet.solana.com'); // TODO: Change to mainnet if needed
    
    // Load or generate keypair
    let keypair;
    if (true) {
      // Use private key from environment variable
      const secretKeyString = "xyz"; // TODO: Change to your private key
      // Convert base58 string to Uint8Array
      const secretKey = bs58.decode(secretKeyString);
      keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
      console.log(`Using keypair from environment with public key: ${keypair.publicKey}`);
      
      // Check wallet balance
      const balance = await umi.rpc.getBalance(keypair.publicKey);
      console.log(`Wallet balance: ${Number(balance.basisPoints) / 10**9} SOL`);
      
      if (Number(balance.basisPoints) === 0) {
        console.error('Error: Wallet has no SOL. Please fund this address before continuing.');
        console.log(`You can request devnet SOL at https://faucet.solana.com/?address=${keypair.publicKey}`);
        process.exit(1);
      }
    }
    
    // Set the keypair as the identity
    umi.use(keypairIdentity(keypair));
    
    // Add Irys uploader to UMI
    umi.use(irysUploader({
      address: "https://devnet.irys.xyz", // TODO: Change to mainnet if needed
      payer: umi.identity,
    }));
    
    // Generate collection metadata
    const metadata = generateCollectionMetadata({
      name: COLLECTION_CONFIG.name,
      image: COLLECTION_CONFIG.image,
      description: COLLECTION_CONFIG.description,
      creator: keypair.publicKey.toString(),
    });
    
    // Upload metadata to Irys
    console.log('Uploading collection metadata to Irys...');
    const metadataUri = await umi.uploader.uploadJson(metadata);
    console.log(`Metadata uploaded: ${metadataUri}`);
    
    // Create collection signer
    const collectionSigner = generateSigner(umi);
    
    // Create the collection
    console.log('Creating collection...');
    const tx = await createCollection(umi, {
      collection: collectionSigner,
      name: COLLECTION_CONFIG.name,
      uri: metadataUri,
      plugins: COLLECTION_CONFIG.soulbound 
        ? [{
            type: 'PermanentFreezeDelegate',
            frozen: true,
            authority: {
              type: 'Address',
              address: umi.identity.publicKey,
            },
          }]
        : [],
    }).sendAndConfirm(umi);
    
    // Save collection info
    const collectionInfo = {
      signature: bs58.encode(tx.signature),
      collection: collectionSigner.publicKey,
      soulbound: COLLECTION_CONFIG.soulbound,
      metadataUri,
    };
    
    // Ensure output directory exists
    await fs.mkdir(OUT_DIR, { recursive: true });
    
    // Write collection info to file
    await fs.writeFile(
      path.join(OUT_DIR, 'companion-collection.json'),
      JSON.stringify(collectionInfo, null, 2)
    );
    
    console.log('Collection created successfully!');
    console.log(`Collection address: ${collectionSigner.publicKey}`);
    console.log(`Transaction signature: ${bs58.encode(tx.signature)}`);
    
    // Set the collection address as an environment variable
    console.log('\nAdd this to your .env file:');
    console.log(`COLLECTION_ADDRESS=${collectionSigner.publicKey}`);
    
    return collectionInfo;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};

// Run the script
(async () => {
  try {
    await createCompanionCollection();
  } catch (error) {
    console.error('Failed to create collection:', error);
    process.exit(1);
  }
})();