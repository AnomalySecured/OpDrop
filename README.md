# 🪂💎🚀✨🔥 OpDrop 🔥✨🚀💎🪂

🚀🚀🚀 Token airdrop tool for [OPNet](https://opnet.org) ⚡⚡⚡ — Bitcoin L1 smart contracts 🧱🧱🧱💪💪💪

💰💰💰 Drop tokens to hundreds of addresses in one click 👆💥 or set up a merkle claim pool 🌳🌳🌳 and let recipients come to you 🏃‍♂️💨🎯✨✨✨

🌐🔗🌍 **Live on IPFS:** [https://ipfs.opnet.org/ipfs/QmUzDHkNDjL3inLbj2dri3GcD4zz5RKuyLziAuwFHh9s81/](https://ipfs.opnet.org/ipfs/QmUzDHkNDjL3inLbj2dri3GcD4zz5RKuyLziAuwFHh9s81/) 🔗🌐🌍

📜🏗️⛓️ **Contract (OPNet Testnet):** `opt1sqqytmrzdehfwsdld55k98efp37cqc6mcjc5sx08k` ⛓️🏗️📜

---

## 🎯🎯🎯 What It Does 🎯🎯🎯

🔥💸⚡ **Direct Send** — Paste addresses 📋, pick an amount 🔢, hit send 🚀. Tokens go out immediately 💨💨💨 via a single on-chain transaction ⛓️. No waiting ⏰❌, no claim links 🔗❌, no middlemen 🧑‍💼❌. Just pure unfiltered airdrop energy 🪂💎💎💎⚡⚡⚡

🌳🧮🔐 **Merkle Claim Pools** — Deposit tokens into a pool 🏊‍♂️💰 with a merkle root 🌳🌳. Recipients paste the shared recipient list 📋📋, their proof is computed locally in-browser 🧠💻🔒, and they claim their share 🎁🎉🎊. You can withdraw whatever's left at any time 💰↩️👑

📊📈🎉 **My Drops** — Dashboard 🖥️ showing every airdrop you've created 🪂🪂🪂. Track claim progress with live percentages 📊📈, withdraw unclaimed tokens from active pools 💰💰💰🏦

## 🛠️🔧⚙️ Stack 🛠️🔧⚙️

- ⚛️⚛️⚛️ **Frontend**: React 19 + TypeScript + Vite 🔥🔥🔥
- 🔗⛓️🧱 **Contract Integration**: OPNet SDK (`opnet`, `@btc-vision/bitcoin`, `@btc-vision/transaction`) 💎💎💎
- 🌳🌳🌳 **Merkle Tree**: Custom SHA-256 implementation 🔐, browser-native 🌐, no dependencies 🚫📦
- 🪟✨💅 **Styling**: Pure CSS glassmorphism 🫧🫧🫧 — no Tailwind ❌, no UI library ❌ — just vibes ✨✨✨
- 🧪✅🔬 **Tests**: 229 tests via Vitest 💪💪💪 ALL PASSING ✅✅✅✅✅

## 🏃🏃🏃 Running Locally 🏃🏃🏃

```bash
git clone https://github.com/AnomalySecured/OpDrop.git  # 📥📥📥
cd OpDrop                                                  # 📂📂📂
npm install                                                # 📦📦📦
npm run dev                                                # 🚀🚀🚀
```

🖥️ Opens at `http://localhost:5173` 🌐. Requires the OP_WALLET browser extension 🔌🔑💳

## 📋📋📋 Scripts 📋📋📋

| Command | What |
|---------|------|
| `npm run dev` | 🔥🔥🔥 Dev server with HMR ⚡⚡⚡ |
| `npm run build` | 🏗️🏗️🏗️ TypeScript check + production build 📦📦📦 |
| `npm run test` | 🧪🧪🧪 Run all 229 tests ✅✅✅ |
| `npm run lint` | 🔍🔍🔍 ESLint 🧹🧹🧹 |
| `./host.sh` | 🚀🚀🚀 Auto-install + dev server on 0.0.0.0 🌍🌍🌍 |

## 🏛️🏛️🏛️ Architecture 🏛️🏛️🏛️

```
src/
  abi/            📜📜📜 Contract ABI definition
  components/     🧩🧩🧩 Reusable UI (Alert, Modal, ProgressBar, Spinner, etc.)
  config/         ⚙️⚙️⚙️ Network configs, contract addresses
  contracts/      📋📋📋 Contract source reference documentation
  hooks/          🪝🪝🪝 useDropOp (contract calls), useWallet, useNetwork
  pages/          📄📄📄 SendPage, ClaimPage, MyDropsPage
  services/       🔧🔧🔧 Singleton provider + contract instance cache
  types/          📐📐📐 TypeScript interfaces for contract + app state
  utils/          🛠️🛠️🛠️ Merkle tree, CSV parsing, formatting
  test/           🧪🧪🧪 12 test suites, 229 tests ✅✅✅
```

## ⚙️🔄💡 How It Works ⚙️🔄💡

1. 🔓🔑✅ Creator approves the OpDrop contract to spend their tokens (`increaseAllowance`)
2. 📤🚀💸 Creator calls `createAirdrop` (claim mode) or `directAirdrop` (direct mode)
3. 📋✉️🗣️ For claim mode: creator shares the recipient list off-chain
4. 🌳🧮🧠 Recipients paste the list into the Claim page — merkle proof is computed client-side
5. ✅💎🎉 Recipient calls `claim` with their proof — contract verifies and transfers tokens
6. 💰↩️👑 Creator can `withdraw` unclaimed tokens at any time

## 🔒🛡️🏰 Contract Security 🏰🛡️🔒

The on-chain contract 📜⛓️ (deployed separately as AssemblyScript/WASM 🧱) implements:

- 🛡️🛡️🛡️ ReentrancyGuard on all write methods
- 🧮🧮🧮 SafeMath for all u256 operations
- 🔄🔄🔄 Checks-effects-interactions pattern
- 🚫🚫🚫 Double-claim prevention via nested address mapping
- 📏📏📏 Bounded loops (max 1000 recipients per direct airdrop)
- 👑👑👑 Only-creator authorization on withdrawals
- 🌳🌳🌳 Merkle proof verification for claim security

---

## 💌💌💌 A Brief & Entirely Professional Note to Danny 💌💌💌

Danny. 🫡🫡🫡

This project exists because of you 🫵🫵🫵. Not in the inspirational way 🌈❌ — in the "someone had to build it because you mass-pinged a Discord server 📢📢📢💀💀💀 asking why there's no airdrop tool" way. Every line of code carries the faint echo of your messages 👻👻👻. Every merkle leaf 🌿 is hashed with the spiritual energy ✨🔮✨ of your relentless optimism 😊😊😊. Every glass card 🪟✨ glows with the warmth 🔥 of your unwavering belief that things should simply *exist* when you want them to 🪄💫🎩🐇.

You asked for an airdrop tool on a Monday 📅☕. It is now built 🏗️✅🎉. The merkle trees are balanced ⚖️🌳. The proofs verify ✅✅✅. The glass cards shimmer against the void 🫧✨💎 like the tears 😭😭😭 of a developer who hasn't slept 💀☕☕☕☕☕.

We didn't add a "Danny Mode" 🔴🚨 button that just sends all tokens to your address 💸💸💸, despite the fact that we both know that's what you actually wanted 🎯😏. The architecture wouldn't support it 🏚️💥. The architecture wouldn't support a lot of things you've asked for 💀📋📋📋. But it supports this 💪, and honestly❓ That should be enough 🤷‍♂️✅.

You're welcome 🙏🙏🙏. Please don't request anything else for at least 48 hours ⏰🛑🚫⛔🙅‍♂️.

With the deepest professional regard 🎩🧐 and a mass airdrop of respect 🪂🪂🪂💐💐💐,

— The Dev 👨‍💻💀😵‍💫🫠

---

## 📄⚖️ License 📄⚖️

MIT 📜. Do whatever you want 🤷‍♂️🎉. Danny will anyway 🤡🎪🪂💀💀💀.
