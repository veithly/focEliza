# Mina Protocol Plugin for ElizaOS

This plugin enables ElizaOS agents to interact with the Mina Protocol blockchain, providing secure character data storage and memory management with zero-knowledge proofs.

## Features

- **Character Data Storage**: Store character data on-chain with cryptographic verification
- **Memory Management**: Update and verify character memories using ZK proofs
- **Token Operations**: Handle MINA token transfers and ownership management
- **Zero-Knowledge Verification**: Verify memory updates without revealing content
- **Type-Safe Interfaces**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @elizaos/plugin-mina
```

## Configuration

The plugin requires the following environment variables to be set:

```env
MINA_NETWORK_URL=https://proxy.berkeley.minaexplorer.com/graphql
MINA_NETWORK=berkeley # or mainnet
MINA_DEPLOYER_KEY=EKE...  # Private key for contract deployment
MINA_PUBLIC_KEY=B62...    # Public key
MINA_CONTRACT_ADDRESS=B62... # Deployed contract address
MINA_DEFAULT_FEE=0.1
MINA_CHARACTER_CONTRACT_ADDRESS=B62... # Character contract address
MINA_MEMORY_CONTRACT_ADDRESS=B62...    # Memory contract address
MINA_PROVER_URL=http://localhost:8080  # Local prover service
MINA_VERIFICATION_KEY=xxx...           # Verification key for ZK proofs
```

## Usage

### Basic Setup

```typescript
import { createMinaPlugin } from '@elizaos/plugin-mina';

const minaPlugin = createMinaPlugin({
  envConfig: {
    networkUrl: process.env.MINA_NETWORK_URL,
    network: process.env.MINA_NETWORK,
    deployerKey: process.env.MINA_DEPLOYER_KEY,
    publicKey: process.env.MINA_PUBLIC_KEY,
    contractAddress: process.env.MINA_CONTRACT_ADDRESS,
    defaultFee: Number(process.env.MINA_DEFAULT_FEE),
    characterContractAddress: process.env.MINA_CHARACTER_CONTRACT_ADDRESS,
    memoryContractAddress: process.env.MINA_MEMORY_CONTRACT_ADDRESS,
    proverUrl: process.env.MINA_PROVER_URL,
    verificationKey: process.env.MINA_VERIFICATION_KEY
  }
});
```

### Storing Character Data

```typescript
await minaPlugin.storeCharacter(character);
```

### Updating Memory

```typescript
await minaPlugin.updateMemory({
  characterId: "character-id",
  memoryHash: Field(1234),
  proof: Field(5678),
  timestamp: Field(Date.now()),
  type: Field(1)
});
```

### Loading Character Data

```typescript
const characterData = await minaPlugin.loadCharacter("character-id");
```

### Loading Memory Data

```typescript
const memories = await minaPlugin.loadMemory("character-id");
```

### Transferring Tokens

```typescript
await minaPlugin.transferTokens("receiver-address", 1000);
```

## Architecture

The plugin consists of three main components:

1. **Character Contract**: Manages character data storage and ownership
2. **Memory Verification**: Handles ZK proofs for memory updates
3. **Plugin Interface**: Provides high-level methods for interaction

## Security

- All character data updates require valid signatures
- Memory updates are verified using zero-knowledge proofs
- Token transfers are protected by ownership verification
- Sensitive data is encrypted before storage

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For support, please open an issue in the repository or contact the ElizaOS team.
