import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { generateSigner, publicKey } from '@metaplex-foundation/umi';
import { create as createCoreAsset, fetchCollection } from '@metaplex-foundation/mpl-core';
import { WebUploader } from "@irys/web-upload";
import { WebSolana } from "@irys/web-upload-solana";
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

export const irysGateway = (dev: boolean) =>
  dev ? "https://devnet.irys.xyz" : "https://gateway.irys.xyz";

export const getIrys = async (
  adapter: { publicKey: PublicKey },
  rpcUrl: string,
  devnet: boolean
) => {
  try {
    let irysUploader;
    if (devnet) {
      // @ts-expect-error - Type incompatibility between different versions of Irys packages
      irysUploader = await WebUploader(WebSolana)
        .withProvider(adapter)
        .withRpc(rpcUrl)
        .devnet();
    } else {
      // @ts-expect-error - Type incompatibility between different versions of Irys packages
      irysUploader = await WebUploader(WebSolana).withProvider(adapter);
    }

    return irysUploader;
  } catch (error) {
    console.error("Error connecting to Irys:", error);
    throw new Error("Error connecting to Irys");
  }
};

export async function uploadToIrys(wallet: { publicKey: PublicKey }, metadata: Record<string, unknown>): Promise<string> {
  try {
    const rpcUrl = process.env.RPC_API_URL || 'https://api.devnet.solana.com';
    const isDevnet = rpcUrl.includes('devnet');
    
    // Connect to Irys using the new method
    const irys = await getIrys(
      wallet, 
      rpcUrl, 
      isDevnet
    );
    
    // Convert metadata to buffer
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    
    // Check and fund balance if needed
    const price = await irys.getPrice(metadataBuffer.length);
    const balance = await irys.getBalance();
    
    if (balance < price) {
      const fundAmount = price.minus(balance);
      console.log(`Funding Irys with ${irys.utils.fromAtomic(fundAmount)}`);
      const fundTx = await irys.fund(fundAmount);
      await irys.funder.submitFundTransaction(fundTx.id);
    }
    
    // Upload metadata
    const tags = [{ name: "Content-Type", value: "application/json" }];
    const upload = await irys.upload(metadataBuffer, { tags });
    
    return `${irysGateway(true)}/${upload.id}`;
  } catch (error) {
    console.error("Error uploading to Irys:", error);
    throw new Error(`Error uploading to Irys: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function mintCompanionNFT(
  connection: Connection,
  walletPublicKey: PublicKey,
  metadataUri: string,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
) {
  try {
    console.log('Minting NFT with metadata URI:', metadataUri);
    console.log('Using wallet address:', walletPublicKey.toString());
    
    // Create UMI instance
    const umi = createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata());
    
    // Use the signer with UMI
    umi.use(walletAdapterIdentity({
      publicKey: walletPublicKey,
      signMessage,
      signTransaction: signTransaction as unknown as <T>(transaction: T) => Promise<T>,
    }));
    
    const asset = generateSigner(umi);
    const ownerPublicKey = publicKey(walletPublicKey.toString());

    // Fetch collection address from API endpoint
    const response = await fetch('/api/env?key=COLLECTION_ADDRESS');
    if (!response.ok) {
      throw new Error('Failed to fetch collection address from API');
    }
    
    const { value: collectionAddress } = await response.json();
    if (!collectionAddress) {
      throw new Error('Collection address not found in environment variables');
    }

    // Fetch backend wallet address to use as update authority and freeze authority
    const backendWalletResponse = await fetch('/api/env?key=BACKEND_WALLET_ADDRESS');
    if (!backendWalletResponse.ok) {
      throw new Error('Failed to fetch backend wallet address from API');
    }
    
    const { value: backendWalletAddress } = await backendWalletResponse.json();
    if (!backendWalletAddress) {
      throw new Error('Backend wallet address not found in environment variables');
    }
    
    const backendPublicKey = publicKey(backendWalletAddress);

    const collection = await fetchCollection(
      umi,
      publicKey(collectionAddress)
    );
    console.log("Minting to collection: ", collection);

    const { signature } = await createCoreAsset(umi, {
      asset: asset,
      collection: collection,
      authority: backendPublicKey, // Set backend wallet as update authority
      payer: umi.identity, // Client pays for the transaction
      owner: ownerPublicKey, // NFT is owned by the client wallet
      name: 'Solana Companion',
      uri: metadataUri,
      plugins: [
        {
          type: 'FreezeDelegate',
          frozen: false,
          authority: {
            type: 'Address',
            address: backendPublicKey, // Set backend wallet as freeze authority
          },
        },
      ],
    })
    .useV0()
    .sendAndConfirm(umi);

    return {
      success: true,
      message: 'NFT minted successfully',
      mint: asset.publicKey.toString(),
      signature: signature.toString(),
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      message: `Error minting NFT: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
