import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create as createCoreAsset } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { signerIdentity } from '@metaplex-foundation/umi';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import { createSignerFromKeypair } from '@metaplex-foundation/umi';

async function mintCoreNFT() {
  try {    
    // Create UMI instance
    const rpcUrl = 'https://api.devnet.solana.com'; // TODO: Change to mainnet if needed
    const umi = createUmi(rpcUrl)
      .use(mplTokenMetadata());
    
    // Create a keypair from the private key
    const privateKeyString = "xyz" // TODO: Change to your private key
    const secretKey = bs58.decode(privateKeyString);
    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Create a proper UMI signer
    const signer = createSignerFromKeypair(umi, keypair);
    
    // Use the signer with UMI
    umi.use(signerIdentity(signer));
    
    // Add Irys uploader to UMI
    umi.use(irysUploader({
        address: "https://devnet.irys.xyz", // TODO: Change to mainnet if needed
        payer: signer,
    }));
      
    // Sample metadata - replace with your actual data
    const metadata = {
      name: "My Core NFT",
      description: "A sample Core NFT created with a simple script",
      image: "https://example.com/image.png",
      attributes: [
        { trait_type: "Type", value: "Sample" },
        { trait_type: "Version", value: "1.0" }
      ]
    };
    
    // Upload metadata to Irys
    console.log('Uploading metadata to Irys...');
    const metadataUri = await umi.uploader.uploadJson(metadata);
    console.log('Metadata uploaded successfully to:', metadataUri);
    
    // Generate a new asset signer
    const asset = generateSigner(umi);
    const ownerPublicKey = publicKey(umi.eddsa.createKeypairFromSecretKey(secretKey).publicKey);
    
    
    // Mint the Core NFT
    console.log('Minting Core NFT...');
    const { signature } = await createCoreAsset(umi, {
      asset: asset,
      authority: signer,
      payer: signer,
      owner: ownerPublicKey,
      name: metadata.name,
      uri: metadataUri,
      plugins: [
        {
          type: 'FreezeDelegate',
          frozen: false,
          authority: {
            type: 'Address',
            address: umi.eddsa.createKeypairFromSecretKey(secretKey).publicKey,
          },
        },
      ],
    })
    .useV0()
    .sendAndConfirm(umi);
    
    console.log('NFT minted successfully!');
    console.log('Asset address:', asset.publicKey.toString());
    console.log('Transaction signature:', signature.toString());
    
    return {
      success: true,
      assetAddress: asset.publicKey.toString(),
      signature: signature.toString(),
      metadataUri: metadataUri
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Execute the function
mintCoreNFT()
  .then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
