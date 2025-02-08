import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  PrivateKey,
  AccountUpdate,
  Mina,
  Character,
  Circuit,
  ZkProgram,
  Struct
} from 'o1js';

// Define character data structure for on-chain storage
class CharacterData extends Struct({
  name: Field,
  id: Field,
  memoryHash: Field,
  lastUpdated: Field
}) {
  static fromCharacter(character: Character): CharacterData {
    return new CharacterData({
      name: Field(character.name),
      id: Field(character.id),
      memoryHash: Field(0), // Initial memory hash
      lastUpdated: Field(Date.now())
    });
  }
}

// ZK Program for memory verification
const MemoryVerification = ZkProgram({
  name: "memory-verification",
  publicInput: Field,
  publicOutput: Field,

  methods: {
    verify: {
      privateInputs: [Field],

      method(publicMemoryHash: Field, privateMemory: Field) {
        // Verify memory hash matches
        const computedHash = Circuit.if(
          privateMemory.equals(Field(0)),
          Field(0),
          privateMemory
        );
        computedHash.assertEquals(publicMemoryHash);
        return publicMemoryHash;
      },
    },
  },
});

// Main Mina Smart Contract
class MinaCharacterContract extends SmartContract {
  @state(Field) characterCount = State<Field>();
  @state(PublicKey) owner = State<PublicKey>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    super.init();
    this.characterCount.set(Field(0));
    this.owner.set(this.sender);
  }

  @method storeCharacter(character: CharacterData, signature: Signature) {
    // Verify signature
    const validSignature = signature.verify(this.owner.get(), [
      character.name,
      character.id,
      character.memoryHash,
      character.lastUpdated
    ]);
    validSignature.assertTrue();

    // Store character data
    this.characterCount.set(this.characterCount.get().add(1));
  }

  @method updateMemory(characterId: Field, newMemoryHash: Field, proof: Field, signature: Signature) {
    // Verify signature
    const validSignature = signature.verify(this.owner.get(), [
      characterId,
      newMemoryHash,
      proof
    ]);
    validSignature.assertTrue();

    // Verify memory proof
    const verified = MemoryVerification.verify(proof);
    verified.assertTrue();
  }

  @method transferMina(receiverAddress: PublicKey, amount: Field) {
    const receiver = AccountUpdate.create(receiverAddress);
    this.balance.subInPlace(amount);
    receiver.balance.addInPlace(amount);
  }
}

// Plugin implementation
export const minaPlugin = {
  name: 'mina',

  init: async (config: any) => {
    // Initialize Mina network connection
    const Network = Mina.Network(config.networkUrl);
    Mina.setActiveInstance(Network);

    // Deploy contract if needed
    const deployerKey = PrivateKey.fromBase58(config.deployerKey);
    const deployerAccount = deployerKey.toPublicKey();

    let contract: MinaCharacterContract;

    try {
      const zkApp = new MinaCharacterContract(deployerAccount);
      const deploy_txn = await Mina.transaction(deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        zkApp.deploy({});
        zkApp.init();
      });
      await deploy_txn.prove();
      await deploy_txn.sign([deployerKey]).send();
      contract = zkApp;
    } catch (err) {
      console.error('Failed to deploy contract:', err);
      throw err;
    }

    return {
      contract,
      deployerKey
    };
  },

  // Store character data on chain
  storeCharacter: async (character: Character, contract: MinaCharacterContract, deployerKey: PrivateKey) => {
    const characterData = CharacterData.fromCharacter(character);
    const signature = Signature.create(deployerKey, [
      characterData.name,
      characterData.id,
      characterData.memoryHash,
      characterData.lastUpdated
    ]);

    const txn = await Mina.transaction(() => {
      contract.storeCharacter(characterData, signature);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
  },

  // Update character memory with ZK proof
  updateMemory: async (
    characterId: string,
    memory: any,
    contract: MinaCharacterContract,
    deployerKey: PrivateKey
  ) => {
    // Generate memory hash and proof
    const memoryHash = Field(memory);
    const proof = await MemoryVerification.verify(memoryHash);

    const signature = Signature.create(deployerKey, [
      Field(characterId),
      memoryHash,
      proof
    ]);

    const txn = await Mina.transaction(() => {
      contract.updateMemory(Field(characterId), memoryHash, proof, signature);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
  },

  // Transfer MINA tokens
  transferMina: async (
    receiverAddress: string,
    amount: number,
    contract: MinaCharacterContract,
    deployerKey: PrivateKey
  ) => {
    const receiver = PublicKey.fromBase58(receiverAddress);

    const txn = await Mina.transaction(() => {
      contract.transferMina(receiver, Field(amount));
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
  }
};

export default minaPlugin;