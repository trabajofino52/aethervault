export type NavigationTab = 'store' | 'top_50_casino' | 'character' | 'arena' | 'roulette' | 'blackjack' | 'poker' | 'admin' | 'payment_platforms';

export type GamePlayMode = 'SOLO_AI' | 'MULTIPLAYER_LIVE';

export interface MultiplayerTableSeat {
  seatIndex: number;
  playerName: string;
  avatar: string;
  currentBet: number;
  action: string;
  isUser: boolean;
  score?: number;
}

export interface PayoutDestinationConfig {
  merchantName: string;
  usdtTrc20Address: string;
  usdtErc20Address: string;
  paypalEmail: string;
  bankIbanSwift: string;
  bankAccountHolder: string;
  stripeAccountId: string;
  autoForwardToWallet: boolean;
}

export interface AdminWithdrawalRecord {
  id: string;
  timestamp: number;
  amountUSD: number;
  destinationType: 'crypto_usdt' | 'bank_wire' | 'paypal';
  destinationAddress: string;
  status: 'PROCESSED' | 'PENDING';
  txHash: string;
}

export interface PlayerRedemptionRequest {
  id: string;
  playerEmail: string;
  playerName: string;
  amountCoins: number;
  grossUSD: number;
  feeUSD: number; // 20% commission that goes directly to Owner's Vault
  netUSD: number; // 80% paid to player
  destinationType: 'crypto_usdt' | 'paypal' | 'bank_wire';
  destinationAddress: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  timestamp: number;
  reviewedAt?: number;
  rejectionReason?: string;
  txHash: string;
}

export interface ServerResourceMetrics {
  cpuPercent: number;
  cpuCores: number;
  cpuModel: string;
  ramUsedGB: number;
  ramTotalGB: number;
  diskUsedGB: number;
  diskTotalGB: number;
  pingMs: number;
  uptimeHours: number;
  nginxStatus: 'ACTIVE_RUNNING' | 'STOPPED';
  pm2Status: 'ONLINE' | 'STOPPED';
}

export interface PlayerSessionRecord {
  id: string;
  name: string;
  email: string;
  level: number;
  coins: number;
  status: 'ONLINE' | 'OFFLINE';
  lastActive: number;
  country: string;
  device: string;
}

export interface VaultSplitEconomics {
  totalWagered: number;          // 100% total apostado
  houseVaultShare: number;       // 70% retenido en la Bóveda del Dueño
  playerPrizeReserve: number;    // 30% destinado a la cuenta especial de premios
  withdrawalFeesCollected: number; // 20% comisiones automáticas de retiros
  netOwnerProfitUSD: number;     // Ganancia neta final del propietario
}

export interface CoinPackageTier {
  level: number;
  name: string;
  coins: number;
  priceUSD: number;
  bonusPercent: number;
  badge: string;
  popular?: boolean;
  color: string;
  features: string[];
}

export interface CharacterSkills {
  attack: number;     // Poder ofensivo
  defense: number;    // Escudo cuántico
  luck: number;       // Fortuna cibernética (influencia en casino y críticos)
  agility: number;    // Velocidad de reflejos
  energy: number;     // Capacidad de energía
}

export interface CharacterProfile {
  name: string;
  title: string;
  level: number;
  experience: number;
  maxExperience: number;
  avatarUrl: string;
  skills: CharacterSkills;
  victories: number;
  totalBets: number;
  totalWon: number;
}

export type PaymentMethodType = 'credit_card' | 'paypal' | 'crypto_usdt' | 'bank_wire' | 'apple_google_pay';

export interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  provider: string;
  icon: string;
  processingFee: string;
  speed: string;
}

export interface TransactionRecord {
  id: string;
  timestamp: number;
  type: 'RECHARGE' | 'SKILL_UPGRADE' | 'CASINO_WIN' | 'CASINO_BET' | 'ARENA_REWARD' | 'REDEMPTION_REQUEST' | 'LEVEL_UNLOCK';
  title: string;
  description: string;
  amountCoins: number;
  amountUSD?: number;
  paymentMethod?: PaymentMethodType;
  status: 'COMPLETED' | 'PENDING' | 'SECURED';
  txHash: string;
  biometricVerified: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'success' | 'security' | 'reward' | 'info';
  read: boolean;
  amount?: number;
}

export interface ProvablyFairRound {
  id: string;
  game: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Top50Casino';
  timestamp: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  outcome: string;
  revealedServerSeed?: string;
  verified: boolean;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
  gameType: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Upgrade' | 'Top50Casino';
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  title: string;
  coinsWon: number;
  vipTier: 'Grandmaster' | 'Diamond' | 'Emerald' | 'Platinum' | 'Gold';
  isCurrentUser?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  level: number;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isUser?: boolean;
  badge?: string;
}

export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: number; // 1-13 (1=Ace, 11=J, 12=Q, 13=K)
  label: string;
}

export interface CoinGiftRecord {
  id: string;
  timestamp: number;
  targetType: 'ALL_PLAYERS' | 'GAME_ROULETTE' | 'GAME_BLACKJACK' | 'GAME_POKER' | 'GAME_ARENA' | 'VIP_TIER' | 'ONLINE_ONLY' | 'SPECIFIC_USER';
  targetLabel: string;
  amountCoins: number;
  reason: string;
  recipientsCount: number;
  totalCoinsDistributed: number;
  txHash: string;
}

export type HappyHourGameSection = 'ALL_GAMES' | 'TOP_50_CASINO' | 'ROULETTE' | 'BLACKJACK' | 'POKER' | 'ARENA';
export type HappyHourTargetGroup = 'ALL_PLAYERS' | 'VIP_PLAYERS' | 'NEW_PLAYERS' | 'ONLINE_ONLY';

export interface HappyHourCampaign {
  id: string;
  title: string;
  multiplier: number; // e.g. 1.5, 2.0, 3.0
  gameSection: HappyHourGameSection;
  targetGroup: HappyHourTargetGroup;
  isActive: boolean;
  startTime: number;
  durationMinutes: number; // 0 for manual/indefinite
  expiresAt: number; // timestamp
  bannerColor: string;
}

export type CasinoCategory = 'Slots' | 'Crash & Crypto' | 'Ruleta' | 'Blackjack' | 'Póker & Cartas' | 'En Vivo & Shows' | 'Dados & Baccarat';

export interface CasinoGameItem {
  id: string;
  title: string;
  provider: string;
  category: CasinoCategory;
  rtp: number;
  volatility: 'Baja' | 'Media' | 'Media-Alta' | 'Alta' | 'Extrema';
  maxMultiplier: string;
  description: string;
  tags: string[];
  colorGradient: string;
  iconEmoji: string;
  interactiveEngine: 'roulette' | 'blackjack' | 'poker' | 'slot_engine' | 'crash_engine' | 'mines_engine' | 'dice_engine' | 'baccarat_engine' | 'arena';
  featured?: boolean;
}


