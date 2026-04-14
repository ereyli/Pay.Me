import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  keccak256,
  parseAbiItem,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/chain";

export const ERC8004_CONTRACTS = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
} as const;

export const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadataURI", type: "string" }],
    outputs: [],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "score", type: "int128" },
      { name: "feedbackType", type: "uint8" },
      { name: "tag", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "evidenceURI", type: "string" },
      { name: "comment", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

export const VALIDATION_REGISTRY_ABI = [
  {
    name: "validationRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "validator", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "requestURI", type: "string" },
      { name: "requestHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "validationResponse",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
    ],
    outputs: [],
  },
] as const;

export const publicArcClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

export function requireAgentEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getPlatformAgentAccounts() {
  const ownerAccount = privateKeyToAccount(
    requireAgentEnv("PAYME_AGENT_OWNER_PRIVATE_KEY") as `0x${string}`,
  );
  const validatorAccount = privateKeyToAccount(
    requireAgentEnv("PAYME_AGENT_VALIDATOR_PRIVATE_KEY") as `0x${string}`,
  );

  return { ownerAccount, validatorAccount };
}

export function createArcWalletClient(privateKeyEnv: string) {
  const account = privateKeyToAccount(
    requireAgentEnv(privateKeyEnv) as `0x${string}`,
  );

  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http("https://rpc.testnet.arc.network"),
  });
}

export function getIdentityRegistryContract() {
  return getContract({
    address: ERC8004_CONTRACTS.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    client: publicArcClient,
  });
}

export async function registerPlatformAgentOnchain(metadataUri: string) {
  const { ownerAccount } = getPlatformAgentAccounts();
  const ownerWalletClient = createArcWalletClient("PAYME_AGENT_OWNER_PRIVATE_KEY");

  const txHash = await ownerWalletClient.writeContract({
    address: ERC8004_CONTRACTS.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [metadataUri],
    account: ownerAccount,
  });

  const receipt = await publicArcClient.waitForTransactionReceipt({ hash: txHash });

  const transferLogs = await publicArcClient.getLogs({
    address: ERC8004_CONTRACTS.identityRegistry,
    event: parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ),
    args: { to: ownerAccount.address },
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  const tokenId = transferLogs[transferLogs.length - 1]?.args?.tokenId;
  if (tokenId == null) {
    throw new Error("ERC-8004 registration succeeded but tokenId was not found");
  }

  return {
    txHash,
    tokenId: tokenId.toString(),
    ownerWallet: ownerAccount.address,
  };
}

export async function readAgentIdentity(tokenId: string) {
  const identityContract = getIdentityRegistryContract();
  const bigintTokenId = BigInt(tokenId);
  const [owner, tokenURI] = await Promise.all([
    identityContract.read.ownerOf([bigintTokenId]),
    identityContract.read.tokenURI([bigintTokenId]),
  ]);

  return { owner, tokenURI };
}

export async function writeAgentReputationOnchain(input: {
  agentTokenId: string;
  score: number;
  tag: string;
  comment?: string;
  metadataUri?: string;
  evidenceUri?: string;
  feedbackType?: number;
}) {
  const { validatorAccount } = getPlatformAgentAccounts();
  const validatorWalletClient = createArcWalletClient(
    "PAYME_AGENT_VALIDATOR_PRIVATE_KEY",
  );

  const feedbackHash = keccak256(toHex(input.tag));
  const txHash = await validatorWalletClient.writeContract({
    address: ERC8004_CONTRACTS.reputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      BigInt(input.agentTokenId),
      BigInt(input.score),
      input.feedbackType ?? 0,
      input.tag,
      input.metadataUri ?? "",
      input.evidenceUri ?? "",
      input.comment ?? "",
      feedbackHash,
    ],
    account: validatorAccount,
  });

  await publicArcClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    feedbackHash,
    validatorWallet: validatorAccount.address,
  };
}

export async function writeAgentValidationOnchain(input: {
  agentTokenId: string;
  tag: string;
  requestUri?: string;
  responseUri?: string;
  requestSeed: string;
}) {
  const { ownerAccount, validatorAccount } = getPlatformAgentAccounts();
  const ownerWalletClient = createArcWalletClient("PAYME_AGENT_OWNER_PRIVATE_KEY");
  const validatorWalletClient = createArcWalletClient(
    "PAYME_AGENT_VALIDATOR_PRIVATE_KEY",
  );

  const requestHash = keccak256(toHex(input.requestSeed));

  const requestTxHash = await ownerWalletClient.writeContract({
    address: ERC8004_CONTRACTS.validationRegistry,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "validationRequest",
    args: [
      validatorAccount.address,
      BigInt(input.agentTokenId),
      input.requestUri ?? "",
      requestHash,
    ],
    account: ownerAccount,
  });

  await publicArcClient.waitForTransactionReceipt({ hash: requestTxHash });

  const responseTxHash = await validatorWalletClient.writeContract({
    address: ERC8004_CONTRACTS.validationRegistry,
    abi: VALIDATION_REGISTRY_ABI,
    functionName: "validationResponse",
    args: [
      requestHash,
      100,
      input.responseUri ?? "",
      `0x${"0".repeat(64)}`,
      input.tag,
    ],
    account: validatorAccount,
  });

  await publicArcClient.waitForTransactionReceipt({ hash: responseTxHash });

  return {
    requestHash,
    requestTxHash,
    responseTxHash,
    validatorWallet: validatorAccount.address,
  };
}
