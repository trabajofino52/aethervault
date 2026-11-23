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

export type UsdtNetwork = 'TRC20' | 'ERC20' | 'BEP20';

export type PrimarySettlementRail = 'USDT' | 'BTC' | 'PAYPAL_BUSINESS' | 'BANK_WIRE';
export type CardGatewayProvider =
  | 'NOWPAYMENTS_CARD_TO_CRYPTO'
  | 'BTCPAY_SERVER'
  | 'MOONPAY_ONRAMP'
  | 'TRANSAK_ONRAMP'
  | 'BANXA_ONRAMP'
  | 'COINGATE_CRYPTO'
  | 'STRIPE_DIGITAL'
  | 'PAYPAL_BUSINESS';

export type OnRampProvider = 'NOWPAYMENTS_FIAT' | 'MOONPAY' | 'TRANSAK' | 'BANXA';
export type VirtualCardBrand = 'REDOTPAY' | 'BYBIT' | 'BITPAY' | 'WISE';

export interface VaultGatewayApisConfig {
  btcpay: {
    enabled: boolean;
    serverUrl: string;
    storeId: string;
    apiKey: string;
    webhookSecret: string;
  };
  nowpayments: {
    enabled: boolean;
    apiKey: string;
    ipnSecret: string;
    sandbox: boolean;
  };
  coingate: {
    enabled: boolean;
    apiToken: string;
    environment: 'sandbox' | 'live';
  };
  paypal: {
    enabled: boolean;
    environment: 'sandbox' | 'live';
    clientId: string;
    clientSecret: string;
    webhookId: string;
    merchantEmail: string;
  };
  onramps: {
    activeProvider: OnRampProvider;
    moonpayPublicKey: string;
    moonpaySecretKey: string;
    transakApiKey: string;
    transakEnvironment: 'STAGING' | 'PRODUCTION';
    banxaDomain: string;
    banxaApiKey: string;
    banxaSecret: string;
  };
  virtualCards: {
    preferredBrand: VirtualCardBrand;
    redotpayAccountId: string;
    redotpayDepositWallet: string;
    redotpayCardLabel: string;
    redotpayApiKey: string;
    bybitUid: string;
    bybitDepositAddress: string;
    bybitCardLabel: string;
    bybitApiKey: string;
    bitpayMerchantToken: string;
    bitpayPayoutEmail: string;
    bitpayCardLabel: string;
    wiseBusinessEmail: string;
    wiseProfileId: string;
    wiseIbanOrRouting: string;
    wiseApiToken: string;
  };
}

export interface GatewayPublicAvailability {
  btcpayConfigured: boolean;
  btcpayServerUrl: string;
  nowpaymentsConfigured: boolean;
  coingateConfigured: boolean;
  paypalConfigured: boolean;
  paypalEnvironment: 'sandbox' | 'live';
  activeOnRamp: OnRampProvider;
  onRampConfigured: boolean;
  preferredVirtualCard: VirtualCardBrand;
}

export interface PayoutDestinationConfig {
  merchantName: string;
  usdtTrc20Address: string;
  usdtErc20Address: string;
  usdtBep20Address?: string;
  btcAddress?: string;
  binancePayId?: string;
  paypalEmail: string;
  paypalMode?: 'BUSINESS' | 'PERSONAL';
  cardGatewayProvider?: CardGatewayProvider;
  primarySettlementRail?: PrimarySettlementRail;
  bankIbanSwift: string;
  bankAccountHolder: string;
  stripeAccountId: string;
  autoForwardToWallet: boolean;
  autoConvertToUsdt?: boolean;
  vmTestModeEnabled?: boolean;
  maxVmTesters?: number;
}

export interface CoinPurchaseOrder {
  id: string;
  userEmail: string;
  tierLevel: number;
  tierName: string;
  coinsAmount: number;
  priceUSD: number;
  paymentMethod: PaymentMethodType;
  usdtNetwork: UsdtNetwork;
  destinationUsdtWallet: string;
  txHash?: string;
  gatewayProvider?: string;
  gatewayInvoiceId?: string;
  checkoutUrl?: string;
  isLiveApi?: boolean;
  status: 'PENDING_TX' | 'VERIFIED_SETTLED' | 'REJECTED';
  autoSettledToUsdt: boolean;
  createdAt: number;
  settledAt?: number;
}

export interface BtcpayWebhookEventRecord {
  id: string;
  deliveryId: string;
  invoiceId: string;
  eventType: 'InvoiceSettled' | 'InvoicePaymentSettled' | 'InvoiceProcessing' | 'InvoiceExpired' | 'InvoiceInvalid' | 'ManualTest';
  userEmail: string;
  coinsCredited: number;
  amountUSD: number;
  blockchainConfirmed: boolean;
  signatureVerified: boolean;
  firestoreSynced: boolean;
  firestoreSyncedAt?: number;
  rawSummary: string;
  createdAt: number;
}

export interface DeterministicRecommendation {
  id: string;
  category: 'WEBHOOKS' | 'DATABASE' | 'ANTI_FREEZE' | 'SECURITY' | 'VIRTUAL_CARDS' | 'PAYPAL';
  status: 'OPTIMAL' | 'ACTION_REQUIRED' | 'RECOMMENDED';
  title: string;
  ruleTrigger: string;
  recommendation: string;
  actionHint: string;
}

export interface VmExperienceLog {
  seq?: number;
  id: string;
  timestamp: number;
  userEmail: string;
  sessionId: string;
  category: 'GAME_ACTION' | 'PAYMENT_FLOW' | 'AUTH_EVENT' | 'UI_ERROR' | 'API_ERROR' | 'USER_FEEDBACK' | 'SYSTEM';
  gameName: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';
  summary: string;
  detailsJson: string;
  ipAddress?: string;
}

export interface VmTesterSlot {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  coinsBalance: number;
  lastSeenAt: number;
}

export interface AdminWithdrawalRecord {
  id: string;
  timestamp: number;
  amountUSD: number;
  destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'bank_wire' | 'paypal';
  destinationAddress: string;
  status: 'PROCESSED' | 'PENDING';
  txHash: string;
}

export interface PlayerRedemptionRequest {
  id: string;
  playerEmail: string;
  playerName: string;
  balanceBeforeCoins?: number;
  maxAllowed30PctCoins?: number;
  requestedOriginalCoins?: number;
  cappedAutomatically?: boolean;
  amountCoins: number;
  grossUSD: number;
  feeUSD: number; // 20% commission that goes directly to Owner's Vault
  netUSD: number; // 80% paid to player
  destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
  destinationAddress: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  awaitingAuthorization: boolean;
  authorizedByEmail?: string;
  timestamp: number;
  reviewedAt?: number;
  rejectionReason?: string;
  txHash: string;
  payoutStatus?: string;
  externalPayoutId?: string;
  firestoreSynced?: boolean;
}

export interface EconomyConfig {
  vaultRetentionPct: number;
  redemptionFeePct: number;
  transferFeePct: number;
  maxWithdrawalRatioPct: number;
  updatedAt: number;
  updatedBy: string;
}

export interface DirectoryPlayer {
  id: string;
  email: string;
  displayName: string;
  role: 'OWNER' | 'PLAYER' | 'DEMO';
  isActive: boolean;
  coinsBalance: number;
  lastLoginAt: number;
}

export interface CoinTransferRecord {
  id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  grossCoins: number;
  feeCoins: number;
  netCoins: number;
  feePct: number;
  usdEquivalent: number;
  note: string;
  txHash: string;
  createdAt: number;
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
  type: 'RECHARGE' | 'SKILL_UPGRADE' | 'CASINO_WIN' | 'CASINO_BET' | 'ARENA_REWARD' | 'REDEMPTION_REQUEST' | 'LEVEL_UNLOCK' | 'COIN_TRANSFER';
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

export type TicketCategory = 'PAYMENT_ISSUE' | 'WITHDRAWAL_QUERY' | 'ACCOUNT_SECURITY' | 'GAME_BUG' | 'GENERAL_SUPPORT';
export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TicketStatus = 'ABIERTO' | 'EN_REVISION' | 'RESPONDIDO' | 'RESUELTO' | 'REEMBOLSO_PROCESADO';

export interface TicketMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  isAdmin: boolean;
  message: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  userEmail: string;
  userName: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  messages: TicketMessage[];
  paymentTxHash?: string;
  paymentAmountCoins?: number;
  paymentGateway?: string;
}

export interface PaymentResolutionLookup {
  txHashOrReference: string;
  gateway: string;
  amountExpectedUSD: number;
  resolved: boolean;
  creditedCoins?: number;
}

export type AuditTrailCategory = 'FINANCIAL' | 'API_CONFIG' | 'AUTHORIZATION' | 'SECURITY';

export interface AuditTrailEntry {
  seq: number;
  id: string;
  timestamp: number;
  actor_email: string;
  ip_address: string;
  action: string;
  category: AuditTrailCategory;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  details: string;
  prev_hash: string;
  row_hash: string;
  firestoreSynced?: boolean;
}

export interface AuditTrailPageResponse {
  items: AuditTrailEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categoryCounts: {
    ALL: number;
    FINANCIAL: number;
    API_CONFIG: number;
    AUTHORIZATION: number;
    SECURITY: number;
  };
  integrity: {
    sqliteOk: boolean;
    chainValid: boolean;
    checkedRows: number;
    lockedAccountsCount: number;
    dbSizeKB: number;
  };
}

