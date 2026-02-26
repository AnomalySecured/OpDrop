import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    EMPTY_POINTER,
    Revert,
    SafeMath,
    Selector,
    StoredU256,
    StoredMapU256,
    ReentrancyGuard,
    ReentrancyLevel,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';
import { AirdropCreatedEvent, ClaimedEvent, WithdrawnEvent } from './events';

// OP20 selectors for cross-contract calls
const TRANSFER_FROM_SELECTOR: u32 = 0x23b872dd; // transferFrom(address,address,uint256)
const TRANSFER_SELECTOR: u32 = 0xa9059cbb;       // transfer(address,uint256)

// Airdrop modes
const MODE_DIRECT: u256 = u256.Zero;
const MODE_CLAIM: u256 = u256.One;

// Airdrop statuses
const STATUS_ACTIVE: u256 = u256.One;
const STATUS_COMPLETED: u256 = u256.fromU32(2);
const STATUS_WITHDRAWN: u256 = u256.fromU32(3);

// Max recipients per direct airdrop (gas bound)
const MAX_DIRECT_RECIPIENTS: u32 = 1000;

// Response sizes
const U256_BYTES: u32 = 32;
const BOOL_BYTES: u32 = 1;

@final
export class OpDrop extends ReentrancyGuard {
    protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

    // --- Selectors ---
    private readonly createAirdropSelector: Selector = encodeSelector('createAirdrop(address,bytes32,uint256,uint256)');
    private readonly directAirdropSelector: Selector = encodeSelector('directAirdrop(address,tuple[])');
    private readonly claimSelector: Selector = encodeSelector('claim(uint256,uint256,bytes[])');
    private readonly withdrawSelector: Selector = encodeSelector('withdraw(uint256)');
    private readonly getAirdropSelector: Selector = encodeSelector('getAirdrop(uint256)');
    private readonly getAirdropCountSelector: Selector = encodeSelector('getAirdropCount()');
    private readonly hasClaimedSelector: Selector = encodeSelector('hasClaimed(uint256,address)');
    private readonly getAirdropsByCreatorSelector: Selector = encodeSelector('getAirdropsByCreator(address)');

    // --- Storage (inline initialized to avoid definite-assignment errors) ---
    private readonly _airdropCount: StoredU256 = new StoredU256(Blockchain.nextPointer, EMPTY_POINTER);
    private readonly _creatorMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _tokenMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _totalAmountMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _claimedAmountMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _recipientCountMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _claimedCountMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _merkleRootMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _modeMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _statusMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _createdAtMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _claimedMap: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _creatorAirdropCount: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);
    private readonly _creatorAirdropAt: StoredMapU256 = new StoredMapU256(Blockchain.nextPointer);

    public constructor() {
        super();
    }

    // --- Routing ---
    public callMethod(calldata: Calldata): BytesWriter {
        const selector = calldata.readSelector();

        switch (selector) {
            case this.createAirdropSelector:
                return this._createAirdrop(calldata);
            case this.directAirdropSelector:
                return this._directAirdrop(calldata);
            case this.claimSelector:
                return this._claim(calldata);
            case this.withdrawSelector:
                return this._withdraw(calldata);
            case this.getAirdropSelector:
                return this._getAirdrop(calldata);
            case this.getAirdropCountSelector:
                return this._getAirdropCount(calldata);
            case this.hasClaimedSelector:
                return this._hasClaimed(calldata);
            case this.getAirdropsByCreatorSelector:
                return this._getAirdropsByCreator(calldata);
            default:
                return super.callMethod(calldata);
        }
    }

    // ============================================================
    // WRITE METHODS
    // ============================================================

    @method(
        { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
        { name: 'merkleRoot', type: ABIDataTypes.BYTES32 },
        { name: 'totalAmount', type: ABIDataTypes.UINT256 },
        { name: 'recipientCount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'airdropId', type: ABIDataTypes.UINT256 })
    @emit('AirdropCreated')
    private _createAirdrop(calldata: Calldata): BytesWriter {
        const tokenAddress: Address = calldata.readAddress();
        const merkleRoot: u256 = calldata.readU256();
        const totalAmount: u256 = calldata.readU256();
        const recipientCount: u256 = calldata.readU256();

        // Validate
        if (totalAmount == u256.Zero) {
            throw new Revert('Total amount must be > 0');
        }
        if (recipientCount == u256.Zero) {
            throw new Revert('Recipient count must be > 0');
        }
        if (merkleRoot == u256.Zero) {
            throw new Revert('Merkle root cannot be zero');
        }

        const sender: Address = Blockchain.tx.sender;
        const contractAddr: Address = Blockchain.contract.address;

        // Pull tokens from sender to this contract via transferFrom
        this._pullTokens(tokenAddress, sender, contractAddr, totalAmount);

        // Allocate airdrop ID
        const airdropId: u256 = this._airdropCount.value;
        this._airdropCount.value = SafeMath.add(airdropId, u256.One);

        // Store airdrop data
        this._creatorMap.set(airdropId, this._addressToU256(sender));
        this._tokenMap.set(airdropId, this._addressToU256(tokenAddress));
        this._totalAmountMap.set(airdropId, totalAmount);
        this._claimedAmountMap.set(airdropId, u256.Zero);
        this._recipientCountMap.set(airdropId, recipientCount);
        this._claimedCountMap.set(airdropId, u256.Zero);
        this._merkleRootMap.set(airdropId, merkleRoot);
        this._modeMap.set(airdropId, MODE_CLAIM);
        this._statusMap.set(airdropId, STATUS_ACTIVE);
        this._createdAtMap.set(airdropId, u256.fromU64(Blockchain.block.number));

        // Track in creator's list
        this._addToCreatorList(sender, airdropId);

        // Emit event
        this.emitEvent(new AirdropCreatedEvent(airdropId, sender, tokenAddress, totalAmount, 1));

        const response = new BytesWriter(U256_BYTES);
        response.writeU256(airdropId);
        return response;
    }

    @method(
        { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
        { name: 'recipients', type: ABIDataTypes.ADDRESS_UINT256_TUPLE },
    )
    @returns({ name: 'airdropId', type: ABIDataTypes.UINT256 })
    @emit('AirdropCreated')
    private _directAirdrop(calldata: Calldata): BytesWriter {
        const tokenAddress: Address = calldata.readAddress();

        // Read tuple array manually: count, then (address, u256) pairs
        const count: u32 = calldata.readU32();

        if (count == 0) {
            throw new Revert('No recipients');
        }
        if (count > MAX_DIRECT_RECIPIENTS) {
            throw new Revert('Too many recipients (max 1000)');
        }

        const sender: Address = Blockchain.tx.sender;
        let totalAmount: u256 = u256.Zero;

        // Read and process each recipient
        const recipientAddresses: Address[] = new Array<Address>(count);
        const recipientAmounts: u256[] = new Array<u256>(count);

        for (let i: u32 = 0; i < count; i++) {
            const recipient: Address = calldata.readAddress();
            const amount: u256 = calldata.readU256();

            if (amount == u256.Zero) {
                throw new Revert('Amount must be > 0');
            }

            recipientAddresses[i] = recipient;
            recipientAmounts[i] = amount;
            totalAmount = SafeMath.add(totalAmount, amount);
        }

        // Transfer to each recipient via transferFrom
        for (let i: u32 = 0; i < count; i++) {
            this._pullTokens(tokenAddress, sender, recipientAddresses[i], recipientAmounts[i]);
        }

        // Allocate airdrop ID
        const airdropId: u256 = this._airdropCount.value;
        this._airdropCount.value = SafeMath.add(airdropId, u256.One);

        // Store airdrop metadata (direct mode = completed immediately)
        this._creatorMap.set(airdropId, this._addressToU256(sender));
        this._tokenMap.set(airdropId, this._addressToU256(tokenAddress));
        this._totalAmountMap.set(airdropId, totalAmount);
        this._claimedAmountMap.set(airdropId, totalAmount);
        this._recipientCountMap.set(airdropId, u256.fromU32(count));
        this._claimedCountMap.set(airdropId, u256.fromU32(count));
        this._merkleRootMap.set(airdropId, u256.Zero);
        this._modeMap.set(airdropId, MODE_DIRECT);
        this._statusMap.set(airdropId, STATUS_COMPLETED);
        this._createdAtMap.set(airdropId, u256.fromU64(Blockchain.block.number));

        // Track in creator's list
        this._addToCreatorList(sender, airdropId);

        // Emit event
        this.emitEvent(new AirdropCreatedEvent(airdropId, sender, tokenAddress, totalAmount, 0));

        const response = new BytesWriter(U256_BYTES);
        response.writeU256(airdropId);
        return response;
    }

    @method(
        { name: 'airdropId', type: ABIDataTypes.UINT256 },
        { name: 'amount', type: ABIDataTypes.UINT256 },
        { name: 'proof', type: ABIDataTypes.ARRAY_OF_BYTES },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Claimed')
    private _claim(calldata: Calldata): BytesWriter {
        const airdropId: u256 = calldata.readU256();
        const amount: u256 = calldata.readU256();

        // Read proof array: count then each proof element
        const proofCount: u32 = calldata.readU32();
        const proof: Uint8Array[] = new Array<Uint8Array>(proofCount);
        for (let i: u32 = 0; i < proofCount; i++) {
            proof[i] = calldata.readBytesWithLength();
        }

        // Validate airdrop exists and is active claim mode
        const status: u256 = this._statusMap.get(airdropId);
        if (status != STATUS_ACTIVE) {
            throw new Revert('Airdrop is not active');
        }

        const mode: u256 = this._modeMap.get(airdropId);
        if (mode != MODE_CLAIM) {
            throw new Revert('Not a claim-mode airdrop');
        }

        const claimer: Address = Blockchain.tx.sender;

        // Check not already claimed
        const claimKey: u256 = this._claimKey(airdropId, claimer);
        if (this._claimedMap.get(claimKey) != u256.Zero) {
            throw new Revert('Already claimed');
        }

        // Verify merkle proof
        const merkleRoot: u256 = this._merkleRootMap.get(airdropId);
        const leaf: Uint8Array = this._hashLeaf(claimer, amount);
        if (!this._verifyProof(leaf, proof, merkleRoot)) {
            throw new Revert('Invalid merkle proof');
        }

        // Check sufficient remaining
        const claimedAmount: u256 = this._claimedAmountMap.get(airdropId);
        const totalAmount: u256 = this._totalAmountMap.get(airdropId);
        const newClaimed: u256 = SafeMath.add(claimedAmount, amount);
        if (newClaimed > totalAmount) {
            throw new Revert('Insufficient pool balance');
        }

        // Effects: update state BEFORE interaction (checks-effects-interactions)
        this._claimedMap.set(claimKey, u256.One);
        this._claimedAmountMap.set(airdropId, newClaimed);
        const newClaimedCount: u256 = SafeMath.add(this._claimedCountMap.get(airdropId), u256.One);
        this._claimedCountMap.set(airdropId, newClaimedCount);

        // Check if fully claimed
        const recipientCount: u256 = this._recipientCountMap.get(airdropId);
        if (newClaimedCount >= recipientCount) {
            this._statusMap.set(airdropId, STATUS_COMPLETED);
        }

        // Interaction: transfer tokens from contract to claimer
        const tokenAddress: Address = this._u256ToAddress(this._tokenMap.get(airdropId));
        this._transferToken(tokenAddress, claimer, amount);

        // Emit event
        this.emitEvent(new ClaimedEvent(airdropId, claimer, amount));

        const response = new BytesWriter(BOOL_BYTES);
        response.writeBoolean(true);
        return response;
    }

    @method({ name: 'airdropId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'withdrawnAmount', type: ABIDataTypes.UINT256 })
    @emit('Withdrawn')
    private _withdraw(calldata: Calldata): BytesWriter {
        const airdropId: u256 = calldata.readU256();

        // Only creator can withdraw
        const sender: Address = Blockchain.tx.sender;
        const creatorU256: u256 = this._creatorMap.get(airdropId);
        if (creatorU256 != this._addressToU256(sender)) {
            throw new Revert('Only creator can withdraw');
        }

        // Must be active claim mode
        const status: u256 = this._statusMap.get(airdropId);
        if (status != STATUS_ACTIVE) {
            throw new Revert('Airdrop is not active');
        }
        const mode: u256 = this._modeMap.get(airdropId);
        if (mode != MODE_CLAIM) {
            throw new Revert('Cannot withdraw from direct airdrop');
        }

        // Calculate remaining
        const totalAmount: u256 = this._totalAmountMap.get(airdropId);
        const claimedAmount: u256 = this._claimedAmountMap.get(airdropId);
        const remaining: u256 = SafeMath.sub(totalAmount, claimedAmount);

        if (remaining == u256.Zero) {
            throw new Revert('Nothing to withdraw');
        }

        // Effects first
        this._statusMap.set(airdropId, STATUS_WITHDRAWN);

        // Transfer remaining back to creator
        const tokenAddress: Address = this._u256ToAddress(this._tokenMap.get(airdropId));
        this._transferToken(tokenAddress, sender, remaining);

        // Emit event
        this.emitEvent(new WithdrawnEvent(airdropId, remaining));

        const response = new BytesWriter(U256_BYTES);
        response.writeU256(remaining);
        return response;
    }

    // ============================================================
    // READ METHODS
    // ============================================================

    @method({ name: 'airdropId', type: ABIDataTypes.UINT256 })
    @returns(
        { name: 'creator', type: ABIDataTypes.ADDRESS },
        { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
        { name: 'totalAmount', type: ABIDataTypes.UINT256 },
        { name: 'claimedAmount', type: ABIDataTypes.UINT256 },
        { name: 'recipientCount', type: ABIDataTypes.UINT256 },
        { name: 'claimedCount', type: ABIDataTypes.UINT256 },
        { name: 'merkleRoot', type: ABIDataTypes.BYTES32 },
        { name: 'mode', type: ABIDataTypes.UINT8 },
        { name: 'status', type: ABIDataTypes.UINT8 },
        { name: 'createdAt', type: ABIDataTypes.UINT64 },
    )
    private _getAirdrop(calldata: Calldata): BytesWriter {
        const airdropId: u256 = calldata.readU256();

        // Check exists
        const currentCount: u256 = this._airdropCount.value;
        if (airdropId >= currentCount) {
            throw new Revert('Airdrop does not exist');
        }

        const creator: Address = this._u256ToAddress(this._creatorMap.get(airdropId));
        const tokenAddress: Address = this._u256ToAddress(this._tokenMap.get(airdropId));
        const totalAmount: u256 = this._totalAmountMap.get(airdropId);
        const claimedAmount: u256 = this._claimedAmountMap.get(airdropId);
        const recipientCount: u256 = this._recipientCountMap.get(airdropId);
        const claimedCount: u256 = this._claimedCountMap.get(airdropId);
        const merkleRoot: u256 = this._merkleRootMap.get(airdropId);
        const mode: u256 = this._modeMap.get(airdropId);
        const status: u256 = this._statusMap.get(airdropId);
        const createdAt: u256 = this._createdAtMap.get(airdropId);

        // 32 + 32 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8 = 234 bytes
        const response = new BytesWriter(234);
        response.writeAddress(creator);
        response.writeAddress(tokenAddress);
        response.writeU256(totalAmount);
        response.writeU256(claimedAmount);
        response.writeU256(recipientCount);
        response.writeU256(claimedCount);
        response.writeU256(merkleRoot);
        response.writeU8(u8(mode.toU32()));
        response.writeU8(u8(status.toU32()));
        response.writeU64(createdAt.toU64());
        return response;
    }

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    private _getAirdropCount(calldata: Calldata): BytesWriter {
        const response = new BytesWriter(U256_BYTES);
        response.writeU256(this._airdropCount.value);
        return response;
    }

    @method(
        { name: 'airdropId', type: ABIDataTypes.UINT256 },
        { name: 'claimer', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'claimed', type: ABIDataTypes.BOOL })
    private _hasClaimed(calldata: Calldata): BytesWriter {
        const airdropId: u256 = calldata.readU256();
        const claimer: Address = calldata.readAddress();

        const claimKey: u256 = this._claimKey(airdropId, claimer);
        const claimed: bool = this._claimedMap.get(claimKey) != u256.Zero;

        const response = new BytesWriter(BOOL_BYTES);
        response.writeBoolean(claimed);
        return response;
    }

    @method({ name: 'creator', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'airdropIds', type: ABIDataTypes.ARRAY_OF_UINT256 })
    private _getAirdropsByCreator(calldata: Calldata): BytesWriter {
        const creator: Address = calldata.readAddress();
        const creatorKey: u256 = this._addressToU256(creator);
        const count: u256 = this._creatorAirdropCount.get(creatorKey);
        const countU32: u32 = count.toU32();

        // 4 bytes for length + 32 bytes per ID
        const response = new BytesWriter(4 + countU32 * U256_BYTES);
        response.writeU32(countU32);
        for (let i: u32 = 0; i < countU32; i++) {
            const compositeKey: u256 = this._creatorAirdropKey(creatorKey, u256.fromU32(i));
            response.writeU256(this._creatorAirdropAt.get(compositeKey));
        }
        return response;
    }

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

    // --- Cross-contract token calls ---

    private _pullTokens(token: Address, from: Address, to: Address, amount: u256): void {
        const writer = new BytesWriter(100);
        writer.writeSelector(TRANSFER_FROM_SELECTOR);
        writer.writeAddress(from);
        writer.writeAddress(to);
        writer.writeU256(amount);

        Blockchain.call(token, writer, true);
    }

    private _transferToken(token: Address, to: Address, amount: u256): void {
        const writer = new BytesWriter(68);
        writer.writeSelector(TRANSFER_SELECTOR);
        writer.writeAddress(to);
        writer.writeU256(amount);

        Blockchain.call(token, writer, true);
    }

    // --- Address <-> u256 conversion ---

    private _addressToU256(addr: Address): u256 {
        return u256.fromUint8ArrayBE(addr);
    }

    private _u256ToAddress(val: u256): Address {
        const bytes: Uint8Array = val.toUint8Array(true);
        return Address.fromUint8Array(bytes);
    }

    // --- Composite storage keys ---

    private _claimKey(airdropId: u256, claimer: Address): u256 {
        const combined = new Uint8Array(64);
        const idBytes = airdropId.toUint8Array(true);
        combined.set(idBytes, 0);
        combined.set(claimer, 32);
        return u256.fromUint8ArrayBE(Blockchain.sha256(combined));
    }

    private _creatorAirdropKey(creatorKey: u256, index: u256): u256 {
        const combined = new Uint8Array(64);
        const creatorBytes = creatorKey.toUint8Array(true);
        const indexBytes = index.toUint8Array(true);
        combined.set(creatorBytes, 0);
        combined.set(indexBytes, 32);
        return u256.fromUint8ArrayBE(Blockchain.sha256(combined));
    }

    private _addToCreatorList(creator: Address, airdropId: u256): void {
        const creatorKey: u256 = this._addressToU256(creator);
        const count: u256 = this._creatorAirdropCount.get(creatorKey);
        const compositeKey: u256 = this._creatorAirdropKey(creatorKey, count);
        this._creatorAirdropAt.set(compositeKey, airdropId);
        this._creatorAirdropCount.set(creatorKey, SafeMath.add(count, u256.One));
    }

    // --- Merkle proof verification ---

    private _hashLeaf(address: Address, amount: u256): Uint8Array {
        const amountBytes: Uint8Array = amount.toUint8Array(true);
        const combined = new Uint8Array(address.length + 32);
        combined.set(address, 0);
        combined.set(amountBytes, address.length);
        return Blockchain.sha256(combined);
    }

    private _hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
        // Sort for deterministic ordering
        const cmp: i32 = this._compareBytes(a, b);
        const combined = new Uint8Array(64);
        if (cmp <= 0) {
            combined.set(a, 0);
            combined.set(b, 32);
        } else {
            combined.set(b, 0);
            combined.set(a, 32);
        }
        return Blockchain.sha256(combined);
    }

    private _verifyProof(leaf: Uint8Array, proof: Uint8Array[], expectedRoot: u256): bool {
        let computed: Uint8Array = leaf;
        for (let i: i32 = 0; i < proof.length; i++) {
            computed = this._hashPair(computed, proof[i]);
        }
        const computedU256: u256 = u256.fromUint8ArrayBE(computed);
        return computedU256 == expectedRoot;
    }

    private _compareBytes(a: Uint8Array, b: Uint8Array): i32 {
        const len: i32 = a.length < b.length ? a.length : b.length;
        for (let i: i32 = 0; i < len; i++) {
            if (a[i] != b[i]) return i32(a[i]) - i32(b[i]);
        }
        return a.length - b.length;
    }
}
