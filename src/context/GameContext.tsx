import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  NavigationTab,
  CoinPackageTier,
  CharacterProfile,
  CharacterSkills,
  TransactionRecord,
  PushNotification,
  ProvablyFairRound,
  PaymentMethodType,
  PayoutDestinationConfig,
  AdminWithdrawalRecord,
  PlayerRedemptionRequest,
  ServerResourceMetrics,
  PlayerSessionRecord,
  VaultSplitEconomics,
  GamePlayMode,
  MultiplayerTableSeat,
  DailyQuest,
  ChatMessage,
  CoinGiftRecord,
  HappyHourCampaign,
  SupportTicket,
  TicketMessage,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UsdtNetwork,
  GatewayPublicAvailability,
  CoinPurchaseOrder,
  CoinTransferRecord,
  DirectoryPlayer,
  EconomyConfig,
  PlayerVisibilityConfig
} from '../types';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  syncUserProfileToFirestore,
  subscribeToUserFirestoreBalance,
  upsertRedemptionRequestToFirestore,
  reviewRedemptionRequestInFirestore,
  subscribeToFirestoreRedemptionRequests
} from '../services/firestoreVaultService';
import { logVmExperience, installGlobalErrorTelemetry } from '../utils/telemetry';
import { COIN_TIERS } from '../data/coinTiers';
import { soundFx } from '../utils/audio';
import { generateTxHash, sha256, generateRandomHex } from '../utils/crypto';

interface BiometricConfig {
  enabled: boolean;
  requireForHighValue: boolean;
  highValueThresholdUSD: number;
  deviceName: string;
  fingerprintId: string;
}

interface GameContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  coins: number;
  character: CharacterProfile;
  transactions: TransactionRecord[];
  notifications: PushNotification[];
  activeToast: PushNotification | null;
  dismissToast: () => void;
  provablyFairHistory: ProvablyFairRound[];
  biometrics: BiometricConfig;
  setBiometrics: React.Dispatch<React.SetStateAction<BiometricConfig>>;
  
  // Modals
  isStoreOpen: boolean;
  setIsStoreOpen: (open: boolean) => void;
  selectedStoreTier: CoinPackageTier | null;
  setSelectedStoreTier: (tier: CoinPackageTier | null) => void;
  isBiometricModalOpen: boolean;
  setIsBiometricModalOpen: (open: boolean) => void;
  isProvablyFairModalOpen: boolean;
  setIsProvablyFairModalOpen: (open: boolean) => void;
  isHistoryModalOpen: boolean;
  setIsHistoryModalOpen: (open: boolean) => void;
  
  // User, Owner & Demo Session
  userEmail: string;
  authToken: string | null;
  firebaseUser: User | null;
  firestoreSyncedBalance: number | null;
  isOwner: boolean;
  isDemoAccount: boolean;
  isRealAccountActive: boolean;
  loginUser: (email: string) => void;
  loginUserWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerUserWithEmail: (params: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<{ ok: boolean; error?: string; user?: { email: string; displayName: string; coinsBalance: number } }>;
  loginOwnerWithKey: (password: string) => Promise<boolean>;
  loginDemoUser: (password: string) => Promise<boolean>;
  loginVmTester: (testerId: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  resetDemoFunds: () => void;
  activateRealAccountWithDeposit: () => void;
  logoutUser: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'LOGIN' | 'REGISTER';
  setAuthModalMode: (mode: 'LOGIN' | 'REGISTER') => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;

  // Modals for Redemption, Level 100, Daily Wheel, Leaderboard, and Referrals
  isRedemptionModalOpen: boolean;
  setIsRedemptionModalOpen: (open: boolean) => void;
  isLevelModalOpen: boolean;
  setIsLevelModalOpen: (open: boolean) => void;
  isDailyBonusModalOpen: boolean;
  setIsDailyBonusModalOpen: (open: boolean) => void;
  isLeaderboardModalOpen: boolean;
  setIsLeaderboardModalOpen: (open: boolean) => void;
  isReferralModalOpen: boolean;
  setIsReferralModalOpen: (open: boolean) => void;
  isChatWidgetOpen: boolean;
  setIsChatWidgetOpen: (open: boolean) => void;
  isSupportPanelOpen: boolean;
  setIsSupportPanelOpen: (open: boolean) => void;
  isTransferModalOpen: boolean;
  setIsTransferModalOpen: (open: boolean) => void;

  // Support Tickets, User Security & Payment Issue Resolution
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: {
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    initialMessage: string;
    paymentTxHash?: string;
    paymentAmountCoins?: number;
    paymentGateway?: string;
  }) => SupportTicket;
  replyToTicket: (ticketId: string, message: string, asAdmin?: boolean) => boolean;
  resolveSupportTicket: (ticketId: string, creditCoinsAmount?: number, resolutionNotes?: string) => boolean;
  updateSupportTicketStatus: (ticketId: string, newStatus: TicketStatus, notes?: string, refundCoinsAmount?: number) => boolean;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resolvePaymentByTxHash: (txHashOrRef: string, gateway: string, expectedCoins: number) => { success: boolean; credited: boolean; message: string; coinsAdded?: number };

  // Game Mode: Solo vs Live Multiplayer
  gameMode: GamePlayMode;
  setGameMode: (mode: GamePlayMode) => void;

  // Admin & Financial Management
  payoutConfig: PayoutDestinationConfig;
  gatewayAvailability: GatewayPublicAvailability;
  playerVisibility: PlayerVisibilityConfig;
  refreshPlayerVisibility: () => Promise<void>;
  updatePlayerVisibility: (patch: Partial<Omit<PlayerVisibilityConfig, 'updatedAt' | 'updatedBy'>>) => Promise<boolean>;
  refreshPayoutConfigFromServer: () => Promise<void>;
  updatePayoutConfig: (config: Partial<PayoutDestinationConfig>) => void;
  adminWithdrawals: AdminWithdrawalRecord[];
  executeAdminWithdrawal: (amountUSD: number, destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'bank_wire' | 'paypal', destinationAddress: string) => Promise<boolean>;
  grossRevenueUSD: number;
  withdrawnUSD: number;
  availableBalanceUSD: number;
  totalCoinsSold: number;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;

  // Dynamic Vault Margins & Economics (70% House / 30% Player Reserve / 20% Withdrawal Fee / 5% Transfer Fee)
  vaultRetentionRate: number;
  playerPrizeRate: number;
  redemptionFeeRate: number;
  transferFeeRate: number;
  updateVaultMargins: (retentionRate: number, feeRate: number, transferFeeRate?: number) => void;
  vaultEconomics: VaultSplitEconomics;

  // Multi-Player P2P Transfers, Directory & Currency Exchange
  directoryPlayers: DirectoryPlayer[];
  transfersHistory: CoinTransferRecord[];
  refreshTransfersAndDirectory: () => Promise<void>;
  transferCoinsToPlayer: (params: {
    recipientEmail: string;
    amountCoins: number;
    note?: string;
  }) => Promise<{ ok: boolean; message: string; transfer?: CoinTransferRecord }>;
  capturePayPalOrder: (
    paypalOrderId: string,
    localOrderId?: string
  ) => Promise<{ ok: boolean; message: string; updatedCoinsBalance?: number }>;
  
  // Coin Redemptions (Auto-capped 30% balance limit + explicit Espera de Autorización)
  redemptionRequests: PlayerRedemptionRequest[];
  redeemableUsers: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
    coinsBalance: number;
    maxAllowed30PctCoins: number;
  }>;
  refreshRedemptionsFromServer: () => Promise<void>;
  validateAndCreateAdminRedemption: (params: {
    playerEmail: string;
    playerName?: string;
    requestedCoins: number;
    destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
    destinationAddress: string;
  }) => Promise<{ ok: boolean; message: string; request?: PlayerRedemptionRequest }>;
  syncRedemptionToFirestore: (req: PlayerRedemptionRequest) => Promise<boolean>;
  requestPlayerRedemption: (coins: number, destType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire', destAddress: string) => Promise<boolean>;
  approveRedemptionRequest: (requestId: string) => Promise<boolean>;
  rejectRedemptionRequest: (requestId: string, reason?: string) => Promise<boolean>;

  // Server Resources & Live Players Telemetry
  serverMetrics: ServerResourceMetrics;
  playerSessions: PlayerSessionRecord[];
  totalPlayersCount: number;
  onlinePlayersCount: number;
  offlinePlayersCount: number;

  // Daily Quests & Lucky Spin
  dailyQuests: DailyQuest[];
  claimQuestReward: (questId: string) => void;
  claimDailySpinReward: (coinsAmount: number, prizeName: string) => void;
  lastDailySpinTime: number;

  // Promo Code Redemption
  redeemPromoCode: (code: string) => { success: boolean; message: string; coins?: number };

  // Multiplayer Live Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;

  // Coin Administration & Airdrops / Gifts
  coinGifts: CoinGiftRecord[];
  sendCoinsGift: (
    targetType: CoinGiftRecord['targetType'],
    targetLabel: string,
    amountCoins: number,
    reason: string,
    specificEmail?: string
  ) => Promise<{ success: boolean; recipientsCount: number; totalCoins: number }>;
  adminAdjustUserCoins: (amountDelta: number, reason: string) => void;

  // Happy Hour & Payout Multipliers Management
  happyHourCampaign: HappyHourCampaign;
  updateHappyHourCampaign: (campaign: Partial<HappyHourCampaign>) => void;
  toggleHappyHour: (active?: boolean) => void;
  isHappyHourActiveForGame: (game: 'Roulette' | 'Blackjack' | 'Poker' | 'Greyhounds' | 'Horses' | 'Arena' | 'Top50Casino') => {
    active: boolean;
    multiplier: number;
    title: string;
    remainingSeconds: number;
    targetGroup: string;
    gameSection: string;
  };

  // Actions
  unlockNextHeroLevel: (costCoins: number, costUSD: number) => Promise<boolean>;
  rechargeCoins: (tier: CoinPackageTier, paymentMethod: PaymentMethodType, biometricVerified: boolean) => Promise<TransactionRecord>;
  createLiveGatewayInvoice: (params: {
    tier: CoinPackageTier;
    paymentMethod: PaymentMethodType;
    usdtNetwork: UsdtNetwork;
    gatewayProvider: string;
  }) => Promise<{ ok: boolean; order?: CoinPurchaseOrder; checkoutUrl?: string | null; isLiveApi?: boolean; gatewayNotice?: string; error?: string }>;
  settleCoinPurchaseWithUsdt: (params: {
    tier: CoinPackageTier;
    paymentMethod: PaymentMethodType;
    usdtNetwork: UsdtNetwork;
    txHash: string;
    biometricVerified: boolean;
    existingOrderId?: string;
    gatewayProvider?: string;
  }) => Promise<{ ok: boolean; error?: string; record?: TransactionRecord; destinationWallet?: string }>;
  upgradeSkill: (skill: keyof CharacterSkills) => boolean;
  getSkillUpgradeCost: (skill: keyof CharacterSkills) => number;
  executeBet: (game: 'Roulette' | 'Blackjack' | 'Poker' | 'Greyhounds' | 'Horses' | 'Arena' | 'Top50Casino', betAmount: number, winAmount: number, details: string) => Promise<{ won: boolean; net: number; round: ProvablyFairRound }>;
  addNotification: (title: string, message: string, type: 'success' | 'security' | 'reward' | 'info', amount?: number) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetAllData: () => void;
}

const STORAGE_KEY_COINS = 'aethervault_coins_v1';
const STORAGE_KEY_CHARACTER = 'aethervault_character_v1';
const STORAGE_KEY_TXS = 'aethervault_txs_v1';
const STORAGE_KEY_BIOMETRICS = 'aethervault_biometrics_v1';
const STORAGE_KEY_ROUNDS = 'aethervault_rounds_v1';
const STORAGE_KEY_PAYOUT_CONFIG = 'aethervault_payout_config_v1';
const STORAGE_KEY_ADMIN_WITHDRAWALS = 'aethervault_admin_withdrawals_v1';
const STORAGE_KEY_USER_EMAIL = 'aethervault_user_email_v1';

export const OWNER_EMAIL = 'trabajofino52@gmail.com';

// Cuenta Demo Aislada para Pruebas Completas sin Afectar Cuentas Reales
export const DEMO_USERNAME = 'gokudemo';
export const DEMO_PASSWORD = 'goku30309982';
export const VM_TESTER_DEFAULT_PASS = 'vmtest2026';
// Tasa oficial: 1,000 monedas = $800.00 USD -> $5,000.00 USD = 6,250 monedas
export const DEMO_INITIAL_COINS = 6250;
export const DEMO_INITIAL_USD = 5000;

const INITIAL_PAYOUT_CONFIG: PayoutDestinationConfig = {
  merchantName: 'AetherVault Gaming Ltd. (Bóveda Principal USDT / BTC)',
  usdtTrc20Address: 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether',
  usdtErc20Address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  usdtBep20Address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  binancePayId: '',
  paypalEmail: 'cobros@aethervault.io',
  paypalMode: 'BUSINESS',
  cardGatewayProvider: 'NOWPAYMENTS_CARD_TO_CRYPTO',
  primarySettlementRail: 'USDT',
  bankIbanSwift: 'ES76 2100 0418 4502 0005 1332 (SWIFT: CAIXESBBXXX)',
  bankAccountHolder: 'AetherVault Operaciones Internacionales',
  stripeAccountId: 'acct_1NvAether89234',
  autoForwardToWallet: true,
  autoConvertToUsdt: true,
  vmTestModeEnabled: true,
  maxVmTesters: 10
};

const INITIAL_SKILLS: CharacterSkills = {
  attack: 1,
  defense: 1,
  luck: 1,
  agility: 1,
  energy: 1
};

const INITIAL_CHARACTER: CharacterProfile = {
  name: 'Valkyrie Cypher',
  title: 'Iniciado Cibernético',
  level: 1,
  experience: 120,
  maxExperience: 500,
  avatarUrl: '/src/assets/images/character_avatar_hero_1793650646771.jpg',
  skills: INITIAL_SKILLS,
  victories: 0,
  totalBets: 0,
  totalWon: 0
};

const INITIAL_BIOMETRICS: BiometricConfig = {
  enabled: true,
  requireForHighValue: true,
  highValueThresholdUSD: 100,
  deviceName: 'Secure Enclave Passkey (Touch ID / Face ID)',
  fingerprintId: 'passkey_sec_a7e930f1'
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('store');

  // Coins (unlimited accumulation allowed, starts with 85 free trial coins)
  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COINS);
      return saved !== null ? Number(saved) : 85;
    } catch {
      return 85;
    }
  });

  // Character Profile
  const [character, setCharacter] = useState<CharacterProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHARACTER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_CHARACTER;
  });

  // Transactions
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'tx_init_genesis',
        timestamp: Date.now() - 3600000,
        type: 'RECHARGE',
        title: 'Bono de Bienvenida Aether',
        description: 'Crédito de cortesía para pruebas en el Hub y Tienda de Monedas',
        amountCoins: 85,
        amountUSD: 0,
        paymentMethod: 'apple_google_pay',
        status: 'COMPLETED',
        txHash: '0x8f4d92a11b623cf634791e8432a9cd103e390c58e5788c03e878546b45a2789f',
        biometricVerified: true
      }
    ];
  });

  // Biometrics
  const [biometrics, setBiometrics] = useState<BiometricConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BIOMETRICS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BIOMETRICS;
  });

  // Notifications
  const [notifications, setNotifications] = useState<PushNotification[]>([
    {
      id: 'notif_welcome',
      title: '¡Bienvenido a AetherVault!',
      message: 'Tu billetera segura ha sido inicializada con 85 monedas de prueba.',
      timestamp: Date.now() - 3600000,
      type: 'info',
      read: true
    }
  ]);
  const [activeToast, setActiveToast] = useState<PushNotification | null>(null);

  // Provably Fair Rounds history
  const [provablyFairHistory, setProvablyFairHistory] = useState<ProvablyFairRound[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROUNDS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Modals
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [selectedStoreTier, setSelectedStoreTier] = useState<CoinPackageTier | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // User Authentication & Owner Gate with 256-bit Key
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_EMAIL);
      return saved !== null ? saved : OWNER_EMAIL;
    } catch {
      return OWNER_EMAIL;
    }
  });

  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aethervault_owner_auth_v1');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const openAuthModal = useCallback((mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  // Auth bearer token stays strictly in React memory; browser persistence uses HttpOnly av_session cookie
  const [authToken, setAuthToken] = useState<string | null>(null);

  const persistAuthToken = useCallback((token: string | null) => {
    setAuthToken(token);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async res => {
        if (!res.ok || !active) return;
        const data = (await res.json().catch(() => ({}))) as {
          authenticated?: boolean;
          token?: string;
          user?: {
            email: string;
            displayName: string;
            role: 'OWNER' | 'DEMO' | 'PLAYER';
            isActive: boolean;
            isDemoIsolated: boolean;
            coinsBalance: number;
          };
        };
        if (!active || !data.authenticated || !data.user) return;
        if (data.token) setAuthToken(data.token);
        setUserEmail(data.user.email);
        const ownerAuth = data.user.role === 'OWNER' && data.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
        setIsOwnerAuthenticated(ownerAuth);
        if (typeof data.user.coinsBalance === 'number') {
          setCoins(data.user.coinsBalance);
          try {
            localStorage.setItem(STORAGE_KEY_COINS, String(data.user.coinsBalance));
          } catch {
            // ignore
          }
        }
        if (data.user.displayName) {
          setCharacter(prev => ({ ...prev, name: data.user!.displayName }));
        }
        if (data.user.isActive && !data.user.isDemoIsolated) {
          setHasConfirmedRealDeposit(true);
        }
        try {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, data.user.email);
          localStorage.setItem('aethervault_owner_auth_v1', ownerAuth ? 'true' : 'false');
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore session check network errors
      });
    return () => {
      active = false;
    };
  }, []);

  const isOwner = userEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase() && isOwnerAuthenticated;
  const isDemoAccount =
    userEmail.trim().toLowerCase() === DEMO_USERNAME.toLowerCase() ||
    userEmail.trim().toLowerCase() === 'gokudemo@aethervault.com';

  const [hasConfirmedRealDeposit, setHasConfirmedRealDeposit] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aethervault_real_deposit_v1');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isRealAccountActive = isOwner || isDemoAccount || hasConfirmedRealDeposit;

  const activateRealAccountWithDeposit = () => {
    setHasConfirmedRealDeposit(true);
    try {
      localStorage.setItem('aethervault_real_deposit_v1', 'true');
    } catch {
      // ignore
    }
    soundFx.playBiometricSuccess();
    addNotification(
      'Cuenta Activada por Depósito',
      'Tu cuenta real ha sido activada tras la confirmación de depósito. Todos los juegos y canjes están plenamente habilitados.',
      'success'
    );
  };

  const loginOwnerWithKey = async (password: string): Promise<boolean> => {
    const cleanPass = password.trim();
    if (!cleanPass) return false;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: OWNER_EMAIL, password: cleanPass })
      });

      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          persistAuthToken(data.token);
        }
        setUserEmail(OWNER_EMAIL);
        setIsOwnerAuthenticated(true);
        try {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, OWNER_EMAIL);
          localStorage.setItem('aethervault_owner_auth_v1', 'true');
        } catch {
          // ignore
        }
        soundFx.playBiometricSuccess();
        logVmExperience({
          userEmail: OWNER_EMAIL,
          category: 'AUTH_EVENT',
          gameName: 'ADMIN_VAULT',
          severity: 'INFO',
          summary: 'Administrador autenticado correctamente mediante verificación scrypt SQL.'
        });
        addNotification(
          'Sesión de Propietario Cifrada Verificada',
          `Bienvenido ${OWNER_EMAIL}. Bóveda del Dueño y Auditoría de Servidor desbloqueadas con token HMAC-SHA256.`,
          'security'
        );
        return true;
      }

      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      soundFx.playClick();
      logVmExperience({
        userEmail: OWNER_EMAIL,
        category: 'AUTH_EVENT',
        gameName: 'ADMIN_VAULT',
        severity: 'WARN',
        summary: `Fallo de autenticación de propietario (HTTP ${res.status}).`
      });
      addNotification(
        res.status === 429 ? 'Bloqueo de Seguridad Activo' : 'Clave Maestra Inválida',
        errData.error || 'La clave ingresada no coincide con los registros cifrados en SQL.',
        'security'
      );
      return false;
    } catch {
      soundFx.playClick();
      logVmExperience({
        userEmail: OWNER_EMAIL,
        category: 'API_ERROR',
        gameName: 'ADMIN_VAULT',
        severity: 'ERROR',
        summary: 'No se pudo contactar /api/auth/login para validar credenciales del propietario.'
      });
      addNotification(
        'Servidor de Autenticación No Disponible',
        'Asegúrate de que el servidor backend esté activo para validar la clave en la base de datos SQL.',
        'security'
      );
      return false;
    }
  };

  const loginDemoUser = async (password: string): Promise<boolean> => {
    const cleanPass = password.trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_USERNAME, password: cleanPass })
      });

      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          persistAuthToken(data.token);
        }
        setUserEmail(DEMO_USERNAME);
        setIsOwnerAuthenticated(false);
        setCoins(DEMO_INITIAL_COINS);
        try {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, DEMO_USERNAME);
          localStorage.setItem('aethervault_owner_auth_v1', 'false');
          localStorage.setItem(STORAGE_KEY_COINS, DEMO_INITIAL_COINS.toString());
        } catch {
          // ignore
        }
        soundFx.playWinFanfare();
        confetti({ particleCount: 90, spread: 70 });
        addNotification(
          '🎮 Cuenta Demo Activada (gokudemo)',
          '¡Bienvenido gokudemo! Tu cuenta demo aislada cuenta con $5,000 USD (6,250 monedas) para probar todos los juegos sin riesgo.',
          'reward'
        );
        setActiveTab('store');
        return true;
      }

      if (res.status === 401 || res.status === 429) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        soundFx.playClick();
        addNotification(
          res.status === 429 ? 'Bloqueo Temporal Activo' : 'Clave Demo Incorrecta',
          errData.error || 'La clave ingresada para la cuenta demo gokudemo es incorrecta.',
          'security'
        );
        return false;
      }
    } catch {
      // Fallback to local verification
    }

    if (cleanPass === DEMO_PASSWORD) {
      setUserEmail(DEMO_USERNAME);
      setIsOwnerAuthenticated(false);
      setCoins(DEMO_INITIAL_COINS);
      try {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, DEMO_USERNAME);
        localStorage.setItem('aethervault_owner_auth_v1', 'false');
        localStorage.setItem(STORAGE_KEY_COINS, DEMO_INITIAL_COINS.toString());
      } catch {
        // ignore
      }
      soundFx.playWinFanfare();
      confetti({ particleCount: 90, spread: 70 });
      addNotification(
        '🎮 Cuenta Demo Activada (gokudemo)',
        '¡Bienvenido gokudemo! Tu cuenta demo aislada cuenta con $5,000 USD (6,250 monedas) para probar todos los juegos sin riesgo.',
        'reward'
      );
      setActiveTab('store');
      return true;
    } else {
      soundFx.playClick();
      addNotification(
        'Clave Demo Incorrecta',
        'La clave ingresada para la cuenta demo gokudemo es incorrecta (clave requerida: goku30309982).',
        'security'
      );
      return false;
    }
  };

  const loginVmTester = async (
    testerId: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanId = testerId.trim().toLowerCase();
    const cleanPass = password.trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanId, password: cleanPass })
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
        user?: { email: string; displayName: string; isActive?: boolean; isDemoIsolated: boolean; coinsBalance?: number };
      };
      if (!res.ok) {
        return { ok: false, error: data.error || 'Credenciales inválidas para tester VM.' };
      }
      const resolvedEmail = data.user?.email || cleanId;
      const syncedCoins = typeof data.user?.coinsBalance === 'number' ? data.user.coinsBalance : DEMO_INITIAL_COINS;
      if (data.token) {
        persistAuthToken(data.token);
      }
      setUserEmail(resolvedEmail);
      setIsOwnerAuthenticated(false);
      setCoins(syncedCoins);
      if (data.user?.isActive && !data.user?.isDemoIsolated) {
        setHasConfirmedRealDeposit(true);
      }
      try {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, resolvedEmail);
        localStorage.setItem('aethervault_owner_auth_v1', 'false');
        localStorage.setItem(STORAGE_KEY_COINS, syncedCoins.toString());
        if (data.user?.isActive && !data.user?.isDemoIsolated) {
          localStorage.setItem('aethervault_real_deposit_v1', 'true');
        }
      } catch {
        // ignore
      }
      soundFx.playCoinChime();
      logVmExperience({
        userEmail: resolvedEmail,
        category: 'AUTH_EVENT',
        gameName: 'VM_QA_SANDBOX',
        severity: 'INFO',
        summary: `Tester VM conectado (${resolvedEmail}) con ${syncedCoins.toLocaleString()} mo.`
      });
      addNotification(
        'Tester VM Conectado (Máx. 10)',
        `Sesión de prueba activa para ${resolvedEmail} (${syncedCoins.toLocaleString()} monedas). Listo para jugar, transferir y probar PayPal/USDT.`,
        'info'
      );
      setActiveTab('store');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Error conectando con el servidor de pruebas VM.' };
    }
  };

  const resetDemoFunds = () => {
    setCoins(DEMO_INITIAL_COINS);
    try {
      localStorage.setItem(STORAGE_KEY_COINS, DEMO_INITIAL_COINS.toString());
    } catch {
      // ignore
    }
    soundFx.playWinFanfare();
    confetti({ particleCount: 75, spread: 60 });
    addNotification(
      'Saldo Demo Recargado ($5,000 USD)',
      'Tu cuenta demo ha sido recargada con $5,000 USD (6,250 monedas) para continuar tus pruebas en todos los juegos.',
      'reward'
    );
  };

  const registerUserWithEmail = async (params: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ ok: boolean; error?: string; user?: { email: string; displayName: string; coinsBalance: number } }> => {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPassword = params.password;
    const cleanName = params.displayName?.trim() || '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          displayName: cleanName
        })
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        error?: string;
        user?: { email: string; displayName: string; coinsBalance: number; isActive?: boolean };
      };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error || 'No se pudo completar el registro con correo.' };
      }
      if (data.token) persistAuthToken(data.token);
      setUserEmail(data.user.email);
      setIsOwnerAuthenticated(false);
      setCoins(data.user.coinsBalance ?? 0);
      setHasConfirmedRealDeposit(Boolean(data.user.isActive));
      if (data.user.displayName) {
        setCharacter(prev => ({ ...prev, name: data.user!.displayName }));
      }
      try {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, data.user.email);
        localStorage.setItem('aethervault_owner_auth_v1', 'false');
        localStorage.setItem(STORAGE_KEY_COINS, String(data.user.coinsBalance ?? 0));
        localStorage.setItem('aethervault_real_deposit_v1', data.user.isActive ? 'true' : 'false');
      } catch {
        // ignore
      }
      soundFx.playWinFanfare();
      addNotification(
        'Cuenta Registrada por Correo',
        `¡Bienvenido ${data.user.displayName}! Tu cuenta ${data.user.email} está lista para comprar monedas en la Tienda.`,
        'success'
      );
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Error de red contactando al servidor de registro.' };
    }
  };

  const loginUserWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: 'Ingresa tu correo electrónico.' };
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
        user?: { email: string; displayName: string; coinsBalance: number; isActive: boolean; isDemoIsolated: boolean };
      };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error || 'Correo o contraseña inválidos.' };
      }
      if (data.token) persistAuthToken(data.token);
      setUserEmail(data.user.email);
      setIsOwnerAuthenticated(false);
      setCoins(typeof data.user.coinsBalance === 'number' ? data.user.coinsBalance : 0);
      const activeReal = Boolean(data.user.isActive && !data.user.isDemoIsolated);
      setHasConfirmedRealDeposit(activeReal);
      if (data.user.displayName) {
        setCharacter(prev => ({ ...prev, name: data.user!.displayName }));
      }
      try {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, data.user.email);
        localStorage.setItem('aethervault_owner_auth_v1', 'false');
        localStorage.setItem(STORAGE_KEY_COINS, String(data.user.coinsBalance ?? 0));
        localStorage.setItem('aethervault_real_deposit_v1', activeReal ? 'true' : 'false');
      } catch {
        // ignore
      }
      soundFx.playBiometricSuccess();
      addNotification(
        'Sesión Iniciada',
        `Bienvenido de nuevo, ${data.user.displayName || data.user.email}. Saldo actual: ${(data.user.coinsBalance ?? 0).toLocaleString()} monedas.`,
        'success'
      );
      setActiveTab('store');
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo conectar con el servidor de autenticación.' };
    }
  };

  const loginUser = (email: string) => {
    const cleanEmail = email.trim();
    if (cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      openAuthModal('LOGIN');
      return;
    }
    if (cleanEmail.toLowerCase() === DEMO_USERNAME.toLowerCase()) {
      openAuthModal('LOGIN');
      return;
    }
    setUserEmail(cleanEmail);
    setIsOwnerAuthenticated(false);
    try {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, cleanEmail);
      localStorage.setItem('aethervault_owner_auth_v1', 'false');
    } catch {
      // ignore
    }

    fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: '' })
    })
      .then(async res => {
        if (res.ok) {
          const data = (await res.json()) as {
            token?: string;
            user?: { coinsBalance?: number; isActive?: boolean; isDemoIsolated?: boolean };
          };
          if (data.token) persistAuthToken(data.token);
          if (typeof data.user?.coinsBalance === 'number') {
            setCoins(data.user.coinsBalance);
            try {
              localStorage.setItem(STORAGE_KEY_COINS, String(data.user.coinsBalance));
            } catch {
              // ignore
            }
          }
          if (data.user?.isActive && !data.user?.isDemoIsolated) {
            setHasConfirmedRealDeposit(true);
            try {
              localStorage.setItem('aethervault_real_deposit_v1', 'true');
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => {
        // ignore network fallback
      });

    soundFx.playClick();
    addNotification(
      'Sesión de Jugador Estándar',
      `Sesión activa como ${cleanEmail}. Las cuentas reales se activan tras confirmación de depósito.`,
      'info'
    );
    setActiveTab('store');
  };

  const logoutUser = () => {
    const guestEmail = 'jugador_anonimo@aethervault.com';
    setUserEmail(guestEmail);
    setIsOwnerAuthenticated(false);
    persistAuthToken(null);
    try {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, guestEmail);
      localStorage.setItem('aethervault_owner_auth_v1', 'false');
    } catch {
      // ignore
    }
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // ignore
    });
    soundFx.playClick();
    addNotification('Sesión Cerrada', 'Has cerrado sesión. La Bóveda del Dueño y el módulo de Banco Digital ahora están bloqueados.', 'info');
    setActiveTab('store');
  };

  // Admin Payout Config (Authoritative sync with server DB)
  const [payoutConfig, setPayoutConfig] = useState<PayoutDestinationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAYOUT_CONFIG);
      if (saved) return { ...INITIAL_PAYOUT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return INITIAL_PAYOUT_CONFIG;
  });

  const [gatewayAvailability, setGatewayAvailability] = useState<GatewayPublicAvailability>({
    btcpayConfigured: false,
    btcpayServerUrl: '',
    nowpaymentsConfigured: false,
    coingateConfigured: false,
    paypalConfigured: false,
    paypalEnvironment: 'sandbox',
    activeOnRamp: 'NOWPAYMENTS_FIAT',
    onRampConfigured: false,
    preferredVirtualCard: 'REDOTPAY'
  });

  const [playerVisibility, setPlayerVisibility] = useState<PlayerVisibilityConfig>({
    showTop50Casino: false,
    showCharacterHero: false,
    showArenaBattle: false,
    showStoreCatalog: false,
    showSecurityTools: false,
    showNeobankCard: false,
    updatedAt: Date.now(),
    updatedBy: OWNER_EMAIL
  });

  const refreshPlayerVisibility = useCallback(async () => {
    try {
      const res = await fetch('/api/config/player-visibility');
      if (res.ok) {
        const data = (await res.json()) as { config?: PlayerVisibilityConfig };
        if (data.config) {
          setPlayerVisibility(data.config);
        }
      }
    } catch {
      // ignore offline fallback
    }
  }, []);

  const updatePlayerVisibility = async (
    patch: Partial<Omit<PlayerVisibilityConfig, 'updatedAt' | 'updatedBy'>>
  ): Promise<boolean> => {
    if (!isOwner || !authToken) return false;
    try {
      const res = await fetch('/api/admin/player-visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        const data = (await res.json()) as { config?: PlayerVisibilityConfig };
        if (data.config) {
          setPlayerVisibility(data.config);
        }
        soundFx.playCoinChime();
        addNotification(
          'Visibilidad Actualizada',
          'Los cambios de visibilidad para jugadores ya se reflejan en el casino.',
          'security'
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshPlayerVisibility();
    }, 25000);
    return () => window.clearInterval(id);
  }, [refreshPlayerVisibility]);

  const refreshPayoutConfigFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/usdt-config');
      if (res.ok) {
        const serverCfg = (await res.json()) as Partial<PayoutDestinationConfig> & {
          gatewayAvailability?: GatewayPublicAvailability;
          economyConfig?: EconomyConfig;
          playerVisibility?: PlayerVisibilityConfig;
        };
        const {
          gatewayAvailability: gwAvail,
          economyConfig: econCfg,
          playerVisibility: visCfg,
          ...rest
        } = serverCfg;
        setPayoutConfig(prev => ({ ...prev, ...rest }));
        if (gwAvail) {
          setGatewayAvailability(gwAvail);
        }
        if (visCfg) {
          setPlayerVisibility(visCfg);
        }
        if (econCfg) {
          setVaultRetentionRate(econCfg.vaultRetentionPct);
          setRedemptionFeeRate(econCfg.redemptionFeePct);
          setTransferFeeRate(econCfg.transferFeePct);
          try {
            localStorage.setItem('aethervault_retention_rate_v1', String(econCfg.vaultRetentionPct));
            localStorage.setItem('aethervault_fee_rate_v1', String(econCfg.redemptionFeePct));
            localStorage.setItem('aethervault_transfer_fee_rate_v1', String(econCfg.transferFeePct));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore offline fallback
    }
  }, []);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firestoreSyncedBalance, setFirestoreSyncedBalance] = useState<number | null>(null);
  const lastSeenFirestoreInvoiceRef = React.useRef<string>('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
      if (!user) {
        setFirestoreSyncedBalance(null);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.email || !firebaseUser.emailVerified) return;

    void syncUserProfileToFirestore({
      user: firebaseUser,
      displayName: character.name,
      level: character.level,
      xp: character.experience
    }).catch(() => {
      // Structured diagnostics already logged via handleFirestoreError
    });
  }, [firebaseUser, character.name, character.level, character.experience]);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.email || !firebaseUser.emailVerified) return;
    const subscribedEmail = firebaseUser.email.toLowerCase();

    const unsubBal = subscribeToUserFirestoreBalance(subscribedEmail, data => {
      if (!data) {
        setFirestoreSyncedBalance(null);
        return;
      }
      setFirestoreSyncedBalance(data.coinsBalance);

      if (
        data.lastInvoiceId &&
        data.lastInvoiceId !== lastSeenFirestoreInvoiceRef.current &&
        userEmail.trim().toLowerCase() === subscribedEmail &&
        !isDemoAccount
      ) {
        lastSeenFirestoreInvoiceRef.current = data.lastInvoiceId;
        if (data.coinsBalance > coins) {
          setCoins(data.coinsBalance);
          setHasConfirmedRealDeposit(true);
        }
      }
    });

    return () => unsubBal();
  }, [firebaseUser, userEmail, isDemoAccount, coins]);

  useEffect(() => {
    installGlobalErrorTelemetry(() => userEmail);
  }, [userEmail]);

  useEffect(() => {
    refreshPayoutConfigFromServer();
  }, [refreshPayoutConfigFromServer]);

  // Admin Withdrawals
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADMIN_WITHDRAWALS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'wd_genesis_1',
        timestamp: Date.now() - 86400000,
        amountUSD: 500,
        destinationType: 'crypto_usdt',
        destinationAddress: 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether',
        status: 'PROCESSED',
        txHash: '0x3a992bc44e1f77d88921aae19028bf8137a89f9210c89a01874bca7821ef9a11'
      }
    ];
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);

  // Sync admin states
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAYOUT_CONFIG, JSON.stringify(payoutConfig));
    } catch {
      // ignore
    }
  }, [payoutConfig]);
  // Modals for Redemption and Level 100
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [isSupportPanelOpen, setIsSupportPanelOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_support_tickets_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'tkt_demo_101',
        userEmail: 'carlos_vip@gmail.com',
        userName: 'Carlos VIP',
        category: 'PAYMENT_ISSUE',
        priority: 'ALTA',
        subject: 'Depósito USDT TRC20 pendiente de acreditar',
        status: 'EN_REVISION',
        createdAt: Date.now() - 3600000 * 4,
        updatedAt: Date.now() - 3600000 * 2,
        paymentTxHash: '0x9fa882a170c299e44bcda10982eefca92841072948cbb192a83018274aef1203',
        paymentAmountCoins: 500,
        paymentGateway: 'USDT TRC-20',
        messages: [
          {
            id: 'msg_1',
            senderEmail: 'carlos_vip@gmail.com',
            senderName: 'Carlos VIP',
            isAdmin: false,
            message: 'Hola equipo, realicé una recarga de 500 monedas mediante USDT TRC-20 hace 40 minutos pero aún no las veo en mi balance.',
            timestamp: Date.now() - 3600000 * 4
          },
          {
            id: 'msg_2',
            senderEmail: OWNER_EMAIL,
            senderName: 'Soporte Bóveda AetherVault',
            isAdmin: true,
            message: 'Hola Carlos, estamos verificando el Hash en la red TRON. En cuanto confirme 12 bloques se acreditará de forma automática a tu cuenta.',
            timestamp: Date.now() - 3600000 * 2
          }
        ]
      },
      {
        id: 'tkt_demo_102',
        userEmail: 'gokudemo',
        userName: 'Goku Demo',
        category: 'GENERAL_SUPPORT',
        priority: 'MEDIA',
        subject: 'Prueba de soporte y resolución de pagos en cuenta demo',
        status: 'RESPONDIDO',
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now() - 900000,
        messages: [
          {
            id: 'msg_3',
            senderEmail: 'gokudemo',
            senderName: 'Goku Demo',
            isAdmin: false,
            message: 'Probando el canal de soporte para tickets, cambio de contraseñas y diagnóstico de pagos.',
            timestamp: Date.now() - 1800000
          },
          {
            id: 'msg_4',
            senderEmail: OWNER_EMAIL,
            senderName: 'Administrador (trabajofino52)',
            isAdmin: true,
            message: '¡Excelente! El panel de soporte está totalmente operativo. Puedes enviar tickets, modificar tu clave y diagnosticar pagos con Hash.',
            timestamp: Date.now() - 900000
          }
        ]
      },
      {
        id: 'tkt_demo_103',
        userEmail: 'laura_mendez@gmail.com',
        userName: 'Laura Méndez',
        category: 'PAYMENT_ISSUE',
        priority: 'URGENTE',
        subject: 'Cobro duplicado con Tarjeta de Crédito - Solicitud de Reembolso',
        status: 'ABIERTO',
        createdAt: Date.now() - 600000,
        updatedAt: Date.now() - 600000,
        paymentTxHash: 'CRD-8829104-DUP',
        paymentAmountCoins: 250,
        paymentGateway: 'Cryptomus / Tarjeta Visa',
        messages: [
          {
            id: 'msg_5',
            senderEmail: 'laura_mendez@gmail.com',
            senderName: 'Laura Méndez',
            isAdmin: false,
            message: 'Se realizó un cargo doble de $200 USD (250 monedas) por un error de conexión. Solicito revisión y reembolso del cargo duplicado.',
            timestamp: Date.now() - 600000
          }
        ]
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_support_tickets_v1', JSON.stringify(supportTickets));
    } catch {
      // ignore
    }
  }, [supportTickets]);

  const [gameMode, setGameMode] = useState<GamePlayMode>('MULTIPLAYER_LIVE');

  // Dynamic Margin Controls (Configurable by trabajofino52@gmail.com)
  const [vaultRetentionRate, setVaultRetentionRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aethervault_retention_rate_v1');
      return saved ? Number(saved) : 70;
    } catch {
      return 70;
    }
  });

  const [redemptionFeeRate, setRedemptionFeeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aethervault_fee_rate_v1');
      return saved ? Number(saved) : 20;
    } catch {
      return 20;
    }
  });

  const [transferFeeRate, setTransferFeeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aethervault_transfer_fee_rate_v1');
      return saved ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });

  const playerPrizeRate = Math.max(0, 100 - vaultRetentionRate);

  const updateVaultMargins = (newRetention: number, newFee: number, newTransferFee?: number) => {
    const clampedRetention = Math.min(95, Math.max(50, newRetention));
    const clampedFee = Math.min(50, Math.max(5, newFee));
    const clampedTransferFee = Math.min(
      25,
      Math.max(0, newTransferFee !== undefined ? newTransferFee : transferFeeRate)
    );
    setVaultRetentionRate(clampedRetention);
    setRedemptionFeeRate(clampedFee);
    setTransferFeeRate(clampedTransferFee);
    try {
      localStorage.setItem('aethervault_retention_rate_v1', String(clampedRetention));
      localStorage.setItem('aethervault_fee_rate_v1', String(clampedFee));
      localStorage.setItem('aethervault_transfer_fee_rate_v1', String(clampedTransferFee));
    } catch {
      // ignore
    }
    soundFx.playCoinChime();
    addNotification(
      'Parámetros Económicos Actualizados',
      `Casa: ${clampedRetention}%, Premios: ${100 - clampedRetention}%, Comisión Retiro: ${clampedFee}%, Transfer P2P: ${clampedTransferFee}%.`,
      'security'
    );
    if (isOwner && authToken) {
      void fetch('/api/admin/economy-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          vaultRetentionPct: clampedRetention,
          redemptionFeePct: clampedFee,
          transferFeePct: clampedTransferFee
        })
      }).catch(() => {});
    }
  };

  // Multi-Player P2P Transfers & Directory State
  const [directoryPlayers, setDirectoryPlayers] = useState<DirectoryPlayer[]>([]);
  const [transfersHistory, setTransfersHistory] = useState<CoinTransferRecord[]>([]);

  const refreshTransfersAndDirectory = useCallback(async () => {
    if (!authToken) return;
    try {
      const [dirRes, trfRes] = await Promise.all([
        fetch('/api/players/directory', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/transfers', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      if (dirRes.ok) {
        const dirData = (await dirRes.json()) as {
          players?: DirectoryPlayer[];
          economyConfig?: EconomyConfig;
        };
        if (Array.isArray(dirData.players)) setDirectoryPlayers(dirData.players);
        if (dirData.economyConfig) {
          setVaultRetentionRate(dirData.economyConfig.vaultRetentionPct);
          setRedemptionFeeRate(dirData.economyConfig.redemptionFeePct);
          setTransferFeeRate(dirData.economyConfig.transferFeePct);
        }
      }
      if (trfRes.ok) {
        const trfData = (await trfRes.json()) as { transfers?: CoinTransferRecord[] };
        if (Array.isArray(trfData.transfers)) setTransfersHistory(trfData.transfers);
      }
    } catch {
      // ignore offline
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      void refreshTransfersAndDirectory();
    }
  }, [authToken, refreshTransfersAndDirectory]);

  const transferCoinsToPlayer = async (params: {
    recipientEmail: string;
    amountCoins: number;
    note?: string;
  }): Promise<{ ok: boolean; message: string; transfer?: CoinTransferRecord }> => {
    if (isDemoAccount) {
      const msg = 'La cuenta demo gokudemo está aislada y no puede enviar ni recibir transferencias reales.';
      addNotification('Demo Aislada', msg, 'security');
      return { ok: false, message: msg };
    }
    if (!authToken) {
      const msg = 'Conecta una cuenta autenticada (ej. tester01 o tu cuenta real) para transferir monedas.';
      addNotification('Sesión Requerida', msg, 'security');
      return { ok: false, message: msg };
    }
    try {
      const res = await fetch('/api/transfers/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          recipientEmail: params.recipientEmail.trim().toLowerCase(),
          amountCoins: Math.floor(params.amountCoins),
          note: params.note?.trim()
        })
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        transfer?: CoinTransferRecord;
        senderBalanceCoins?: number;
      };
      if (!res.ok || !data.ok || !data.transfer) {
        const errMsg = data.error || 'No se pudo completar la transferencia.';
        addNotification('Transferencia Rechazada', errMsg, 'security');
        return { ok: false, message: errMsg };
      }

      if (typeof data.senderBalanceCoins === 'number') {
        setCoins(data.senderBalanceCoins);
        try {
          localStorage.setItem(STORAGE_KEY_COINS, String(data.senderBalanceCoins));
        } catch {
          // ignore
        }
      }

      const txRec: TransactionRecord = {
        id: 'tx_' + data.transfer.id,
        timestamp: data.transfer.createdAt,
        type: 'COIN_TRANSFER',
        title: `Transferencia P2P -> ${data.transfer.recipientName}`,
        description: `Enviaste ${data.transfer.grossCoins.toLocaleString()} mo (Comisión Casino ${data.transfer.feePct}%: ${data.transfer.feeCoins} mo | Neto: ${data.transfer.netCoins.toLocaleString()} mo).`,
        amountCoins: -data.transfer.grossCoins,
        amountUSD: -data.transfer.usdEquivalent,
        status: 'COMPLETED',
        txHash: data.transfer.txHash,
        biometricVerified: false
      };
      setTransactions(prev => [txRec, ...prev]);
      soundFx.playCoinChime();
      addNotification('Transferencia Enviada', data.message || 'Transferencia procesada.', 'success');
      void refreshTransfersAndDirectory();
      return { ok: true, message: data.message || 'Transferencia exitosa.', transfer: data.transfer };
    } catch {
      return { ok: false, message: 'Error de red enviando transferencia.' };
    }
  };

  // Daily Quests State
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>(() => {
    const defaultQuests: DailyQuest[] = [
      {
        id: 'quest_roulette',
        title: 'Gira la Ruleta 3 Veces',
        description: 'Realiza al menos 3 apuestas en la mesa de Ruleta Europea.',
        targetCount: 3,
        currentCount: 1,
        rewardCoins: 30,
        completed: false,
        claimed: false,
        gameType: 'Roulette'
      },
      {
        id: 'quest_blackjack',
        title: 'Mano Maestra en Blackjack',
        description: 'Juega 2 manos completas en la mesa de Blackjack 21.',
        targetCount: 2,
        currentCount: 0,
        rewardCoins: 25,
        completed: false,
        claimed: false,
        gameType: 'Blackjack'
      },
      {
        id: 'quest_arena',
        title: 'Combate en la Arena',
        description: 'Desafía a los campeones cibernéticos en la Arena de Batalla.',
        targetCount: 1,
        currentCount: 0,
        rewardCoins: 40,
        completed: false,
        claimed: false,
        gameType: 'Arena'
      },
      {
        id: 'quest_upgrade',
        title: 'Mejora a tu Héroe',
        description: 'Sube al menos 1 habilidad (Ataque, Defensa, Fortuna o Agilidad).',
        targetCount: 1,
        currentCount: 0,
        rewardCoins: 50,
        completed: false,
        claimed: false,
        gameType: 'Upgrade'
      },
      {
        id: 'quest_top50',
        title: 'Explora el Top 50 Casino',
        description: 'Juega en cualquiera de los 50 títulos legendarios de casino.',
        targetCount: 1,
        currentCount: 0,
        rewardCoins: 50,
        completed: false,
        claimed: false,
        gameType: 'Top50Casino'
      }
    ];

    try {
      const saved = localStorage.getItem('aethervault_quests_v1');
      if (saved) {
        const parsed: DailyQuest[] = JSON.parse(saved);
        // Ensure quest_top50 is present
        if (!parsed.some(q => q.id === 'quest_top50')) {
          const top50Quest = defaultQuests.find(q => q.id === 'quest_top50');
          if (top50Quest) parsed.push(top50Quest);
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return defaultQuests;
  });

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_quests_v1', JSON.stringify(dailyQuests));
    } catch {
      // ignore
    }
  }, [dailyQuests]);

  // Last Daily Spin Time
  const [lastDailySpinTime, setLastDailySpinTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aethervault_last_spin_v1');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const claimDailySpinReward = (coinsWon: number, prizeName: string) => {
    setCoins(prev => prev + coinsWon);
    setLastDailySpinTime(Date.now());
    try {
      localStorage.setItem('aethervault_last_spin_v1', String(Date.now()));
    } catch {
      // ignore
    }

    const tx: TransactionRecord = {
      id: 'tx_spin_' + Date.now(),
      timestamp: Date.now(),
      type: 'ARENA_REWARD',
      title: `Rueda de la Fortuna: ${prizeName}`,
      description: `Bono diario de ${coinsWon} monedas Aether acreditado.`,
      amountCoins: coinsWon,
      status: 'COMPLETED',
      txHash: generateTxHash({ spin: true, coinsWon, time: Date.now() }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);
    soundFx.playWinFanfare();
    confetti({ particleCount: 90, spread: 80 });
    addNotification('¡Premio de la Rueda Reclamado!', `Has ganado ${coinsWon} monedas (${prizeName}) en el giro diario.`, 'reward', coinsWon);
  };

  const claimQuestReward = (questId: string) => {
    const q = dailyQuests.find(item => item.id === questId);
    if (!q || !q.completed || q.claimed) return;

    setDailyQuests(prev =>
      prev.map(item => (item.id === questId ? { ...item, claimed: true } : item))
    );
    setCoins(prev => prev + q.rewardCoins);

    const tx: TransactionRecord = {
      id: 'tx_qst_' + Date.now(),
      timestamp: Date.now(),
      type: 'ARENA_REWARD',
      title: `Misión Diaria Cumplida: ${q.title}`,
      description: `Recompensa de misión diaria reclamada: +${q.rewardCoins} monedas.`,
      amountCoins: q.rewardCoins,
      status: 'COMPLETED',
      txHash: generateTxHash({ questId, reward: q.rewardCoins, time: Date.now() }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);
    soundFx.playCoinChime();
    confetti({ particleCount: 50, spread: 60 });
    addNotification('¡Misión Reclamada!', `+${q.rewardCoins} monedas añadidas a tu cartera.`, 'reward', q.rewardCoins);
  };

  // Promo Code Redemption
  const [usedPromoCodes, setUsedPromoCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_promos_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const redeemPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (usedPromoCodes.includes(cleanCode)) {
      return { success: false, message: 'Este código promocional ya fue canjeado en tu cuenta.' };
    }

    const PROMO_CODES: Record<string, { coins: number; label: string }> = {
      'AETHER2026': { coins: 100, label: 'Bono Bienvenida VIP 2026' },
      'DUENO70': { coins: 200, label: 'Cortesía de la Bóveda del Dueño' },
      'VIPLUCKY': { coins: 50, label: 'Fortuna de Casino' },
      'DEBIAN13': { coins: 150, label: 'Bono Especial Servidor Debian' }
    };

    const match = PROMO_CODES[cleanCode];
    if (!match) {
      return { success: false, message: 'Código promocional inválido o expirado. Prueba: AETHER2026, DUENO70 o VIPLUCKY' };
    }

    setCoins(prev => prev + match.coins);
    const updatedUsed = [...usedPromoCodes, cleanCode];
    setUsedPromoCodes(updatedUsed);
    try {
      localStorage.setItem('aethervault_promos_v1', JSON.stringify(updatedUsed));
    } catch {
      // ignore
    }

    const tx: TransactionRecord = {
      id: 'tx_prm_' + Date.now(),
      timestamp: Date.now(),
      type: 'ARENA_REWARD',
      title: `Código Promocional: ${cleanCode}`,
      description: `${match.label}: +${match.coins} monedas Aether acreditadas.`,
      amountCoins: match.coins,
      status: 'COMPLETED',
      txHash: generateTxHash({ promo: cleanCode, coins: match.coins, time: Date.now() }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);
    soundFx.playWinFanfare();
    confetti({ particleCount: 75, spread: 60 });
    addNotification('¡Código Canjeado!', `¡Felicidades! Has recibido +${match.coins} monedas (${match.label}).`, 'reward', match.coins);
    return { success: true, message: `¡Código válido! Recibiste +${match.coins} monedas.`, coins: match.coins };
  };

  // Multiplayer Live Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg_1',
      sender: 'Carlos VIP',
      level: 42,
      text: '¡Buena racha a todos en la mesa! La ruleta está pagando excelente.',
      timestamp: Date.now() - 180000,
      badge: 'VIP Diamond'
    },
    {
      id: 'msg_2',
      sender: 'Sofia Crypto',
      level: 28,
      text: 'Retiro de 240 USDT aprobado por la bóveda con el 20% de comisión exacto.',
      timestamp: Date.now() - 120000,
      badge: 'Pro Trader'
    },
    {
      id: 'msg_3',
      sender: 'Marco HighRoller',
      level: 75,
      text: '🚀 All-in en Blackjack, a por el x2.5!',
      timestamp: Date.now() - 60000,
      badge: 'Whale 🐋'
    },
    {
      id: 'msg_4',
      sender: 'Sistema AetherVault',
      level: 100,
      text: '🔒 Sala E2EE activa con verificación Provably-Fair SHA-256. 70% Bóveda / 30% Fondo de Premios.',
      timestamp: Date.now() - 30000,
      isSystem: true
    }
  ]);

  const sendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: `${character.name} (Tú)`,
      level: character.level,
      text: text.trim(),
      timestamp: Date.now(),
      isUser: true,
      badge: character.level >= 50 ? 'Comandante' : 'Jugador'
    };
    setChatMessages(prev => [...prev.slice(-25), newMsg]);
    soundFx.playClick();
  };

  // Automated live chat simulation when in MULTIPLAYER_LIVE mode
  useEffect(() => {
    if (gameMode !== 'MULTIPLAYER_LIVE') return;
    const interval = setInterval(() => {
      const bots = [
        { name: 'Carlos VIP', lvl: 42, badge: 'VIP Diamond', quotes: ['¡Qué tirada!', 'Doblando apuesta en el tapete', '🍀 La suerte está del lado del jugador hoy', 'Buen juego'] },
        { name: 'Sofia Crypto', lvl: 28, badge: 'Pro Trader', quotes: ['Retiro procesado en TRC20, impecable', 'Buena mano', 'Apuesta de 50 colocada'] },
        { name: 'Marco HighRoller', lvl: 75, badge: 'Whale 🐋', quotes: ['¡Blackjack en mesa!', 'Vamos por otra ronda fuerte 🔥', 'Gran bote acumulado en premios'] },
        { name: 'Elena Pro', lvl: 19, badge: 'Élite', quotes: ['Subí a nivel 20 en la arena!', 'Saludos a la mesa', '🎉 Gané con pleno'] }
      ];
      const bot = bots[Math.floor(Math.random() * bots.length)];
      const quote = bot.quotes[Math.floor(Math.random() * bot.quotes.length)];
      const botMsg: ChatMessage = {
        id: 'msg_bot_' + Date.now(),
        sender: bot.name,
        level: bot.lvl,
        text: quote,
        timestamp: Date.now(),
        badge: bot.badge
      };
      setChatMessages(prev => [...prev.slice(-25), botMsg]);
    }, 14000);
    return () => clearInterval(interval);
  }, [gameMode]);

  // Redemptions (Cashouts with strict 30% balance limit, 20% commission to Owner's Vault, and mandatory Espera de Autorización)
  const [redemptionRequests, setRedemptionRequests] = useState<PlayerRedemptionRequest[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_redemptions_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Partial<PlayerRedemptionRequest>>;
        return parsed.map(r => ({
          ...(r as PlayerRedemptionRequest),
          awaitingAuthorization: r.awaitingAuthorization ?? r.status === 'PENDING_APPROVAL'
        }));
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [redeemableUsers, setRedeemableUsers] = useState<Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
    coinsBalance: number;
    maxAllowed30PctCoins: number;
  }>>([]);

  const refreshRedemptionsFromServer = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/redemptions', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        requests?: PlayerRedemptionRequest[];
        users?: Array<{
          id: string;
          email: string;
          displayName: string;
          role: string;
          isActive: boolean;
          coinsBalance: number;
          maxAllowed30PctCoins: number;
        }>;
      };
      if (data?.requests) {
        setRedemptionRequests(prev => {
          const syncedMap = new Map(prev.map(p => [p.id, Boolean(p.firestoreSynced)]));
          const merged = data.requests!.map(r => ({
            ...r,
            awaitingAuthorization: r.awaitingAuthorization ?? r.status === 'PENDING_APPROVAL',
            firestoreSynced: syncedMap.get(r.id) ?? r.firestoreSynced ?? false
          }));
          return merged;
        });
      }
      if (Array.isArray(data?.users)) {
        setRedeemableUsers(data.users);
      }
    } catch {
      // Keep local fallback
    }
  }, [authToken]);

  useEffect(() => {
    void refreshRedemptionsFromServer();
  }, [refreshRedemptionsFromServer]);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.email || !firebaseUser.emailVerified) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeToFirestoreRedemptionRequests(fsRequests => {
        setRedemptionRequests(prev => {
          const byId = new Map<string, PlayerRedemptionRequest>();
          for (const item of prev) {
            byId.set(item.id, item);
          }
          for (const fsItem of fsRequests) {
            const existing = byId.get(fsItem.id);
            if (!existing) {
              byId.set(fsItem.id, { ...fsItem, firestoreSynced: true });
            } else {
              // Merge Firestore authoritative flags without dropping SQLite metadata
              const fsResolved = fsItem.status !== 'PENDING_APPROVAL' && !fsItem.awaitingAuthorization;
              const existingResolved = existing.status !== 'PENDING_APPROVAL' && !existing.awaitingAuthorization;
              byId.set(fsItem.id, {
                ...existing,
                ...(fsResolved && !existingResolved ? fsItem : {}),
                firestoreSynced: true
              });
            }
          }
          return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      });
    } catch {
      // ignore subscription initialization error
    }
    return () => {
      if (unsub) unsub();
    };
  }, [firebaseUser]);

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_redemptions_v1', JSON.stringify(redemptionRequests));
    } catch {
      // ignore
    }
  }, [redemptionRequests]);

  // Server Resource Metrics (Cloud Node System Monitor)
  const [serverMetrics, setServerMetrics] = useState<ServerResourceMetrics>({
    cpuPercent: 18.4,
    cpuCores: 4,
    cpuModel: 'Intel Xeon / AMD EPYC (Cloud Node High-Availability)',
    ramUsedGB: 1.45,
    ramTotalGB: 4.0,
    diskUsedGB: 18.2,
    diskTotalGB: 120.0,
    pingMs: 24,
    uptimeHours: 168,
    nginxStatus: 'ACTIVE_RUNNING',
    pm2Status: 'ONLINE'
  });

  // Simulated live player sessions
  const [playerSessions] = useState<PlayerSessionRecord[]>([
    {
      id: 'usr_1',
      name: 'Valkyrie Cypher (Tú)',
      email: userEmail,
      level: character.level,
      coins,
      status: 'ONLINE',
      lastActive: Date.now(),
      country: 'Global',
      device: 'Chrome / Linux'
    },
    {
      id: 'usr_2',
      name: 'Carlos VIP',
      email: 'carlos_trader@crypto.io',
      level: 42,
      coins: 3820,
      status: 'ONLINE',
      lastActive: Date.now() - 30000,
      country: 'España',
      device: 'Firefox / Mac'
    },
    {
      id: 'usr_3',
      name: 'Sofia Crypto',
      email: 'sofia_crypto@web3.io',
      level: 28,
      coins: 1450,
      status: 'ONLINE',
      lastActive: Date.now() - 60000,
      country: 'México',
      device: 'Safari / iOS'
    },
    {
      id: 'usr_4',
      name: 'Marco High Roller',
      email: 'marco_vault@bet.io',
      level: 75,
      coins: 18900,
      status: 'ONLINE',
      lastActive: Date.now() - 120000,
      country: 'Colombia',
      device: 'Edge / Windows'
    },
    {
      id: 'usr_5',
      name: 'Elena Pro',
      email: 'elena_gamer@vip.io',
      level: 19,
      coins: 820,
      status: 'OFFLINE',
      lastActive: Date.now() - 3600000,
      country: 'Argentina',
      device: 'Chrome / Android'
    },
    {
      id: 'usr_6',
      name: 'David CyberKnight',
      email: 'david_k@arcane.io',
      level: 33,
      coins: 2400,
      status: 'OFFLINE',
      lastActive: Date.now() - 7200000,
      country: 'Chile',
      device: 'Chrome / Windows'
    }
  ]);

  const totalPlayersCount = 1420;
  const onlinePlayersCount = 84;
  const offlinePlayersCount = totalPlayersCount - onlinePlayersCount;

  // Admin Configuration and Withdrawal Handlers
  const updatePayoutConfig = (newConfig: Partial<PayoutDestinationConfig>) => {
    setPayoutConfig(prev => ({ ...prev, ...newConfig }));
    if (authToken && isOwner) {
      fetch('/api/admin/payout-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(newConfig)
      }).catch(() => {
        // local state retained
      });
    }
  };

  const executeAdminWithdrawal = async (
    amountUSD: number,
    destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'bank_wire' | 'paypal',
    destinationAddress: string
  ): Promise<boolean> => {
    if (!isOwner) return false;
    const newWd: AdminWithdrawalRecord = {
      id: 'wd_' + Date.now(),
      timestamp: Date.now(),
      amountUSD,
      destinationType,
      destinationAddress,
      status: 'PROCESSED',
      txHash: generateTxHash({ wd: true, amountUSD, destinationType, destinationAddress, time: Date.now() })
    };
    setAdminWithdrawals(prev => [newWd, ...prev]);
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_WITHDRAWALS, JSON.stringify([newWd, ...adminWithdrawals]));
    } catch {
      // ignore
    }
    if (authToken) {
      void fetch('/api/admin/audit-trail/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'ADMIN_WITHDRAWAL_EXECUTED',
          severity: 'CRITICAL',
          details: `Retiro dueño $${amountUSD.toFixed(2)} USD vía ${destinationType} hacia ${destinationAddress.slice(0, 64)} (TX ${newWd.txHash.slice(0, 14)}...)`
        })
      }).catch(() => {});
    }
    return true;
  };

  // ==========================================
  // Coin Administration & Airdrops / Gifts
  // ==========================================
  const [coinGifts, setCoinGifts] = useState<CoinGiftRecord[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_coin_gifts_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'gift_init_1',
        timestamp: Date.now() - 3600000 * 4,
        targetType: 'GAME_ROULETTE',
        targetLabel: 'Jugadores de Ruleta Europea',
        amountCoins: 150,
        reason: 'Bono de Fidelidad Mesa Europea',
        recipientsCount: 385,
        totalCoinsDistributed: 57750,
        txHash: '0x8f2a91b4c3e80d21a97e4c25f77890bc12984920'
      },
      {
        id: 'gift_init_2',
        timestamp: Date.now() - 3600000 * 22,
        targetType: 'ALL_PLAYERS',
        targetLabel: 'Comunidad Global (Todos los Jugadores)',
        amountCoins: 100,
        reason: 'Airdrop Inauguración de Bóveda & Casino',
        recipientsCount: 1420,
        totalCoinsDistributed: 142000,
        txHash: '0x17c09e53b490f230da1f798e209bcfa194829103'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_coin_gifts_v1', JSON.stringify(coinGifts));
    } catch {
      // ignore
    }
  }, [coinGifts]);

  const sendCoinsGift = async (
    targetType: CoinGiftRecord['targetType'],
    targetLabel: string,
    amountCoins: number,
    reason: string,
    specificEmail?: string
  ): Promise<{ success: boolean; recipientsCount: number; totalCoins: number }> => {
    let count = 1;
    switch (targetType) {
      case 'ALL_PLAYERS':
        count = totalPlayersCount;
        break;
      case 'ONLINE_ONLY':
        count = onlinePlayersCount;
        break;
      case 'GAME_ROULETTE':
        count = 385;
        break;
      case 'GAME_BLACKJACK':
        count = 452;
        break;
      case 'GAME_POKER':
        count = 312;
        break;
      case 'GAME_ARENA':
        count = 295;
        break;
      case 'VIP_TIER':
        count = 126;
        break;
      case 'SPECIFIC_USER':
        count = 1;
        break;
    }

    const totalDistributed = count * amountCoins;
    const txHash = '0x' + await sha256(`gift:${Date.now()}:${targetType}:${amountCoins}:${reason}`);

    const newGift: CoinGiftRecord = {
      id: 'gift_' + Date.now(),
      timestamp: Date.now(),
      targetType,
      targetLabel,
      amountCoins,
      reason,
      recipientsCount: count,
      totalCoinsDistributed: totalDistributed,
      txHash
    };

    setCoinGifts(prev => [newGift, ...prev]);

    // Check if current user qualifies to receive the gift
    const isCurrentUserRecipient =
      targetType === 'ALL_PLAYERS' ||
      targetType === 'ONLINE_ONLY' ||
      targetType === 'GAME_ROULETTE' ||
      targetType === 'GAME_BLACKJACK' ||
      targetType === 'GAME_POKER' ||
      targetType === 'GAME_ARENA' ||
      (targetType === 'VIP_TIER' && character.level >= 10) ||
      (targetType === 'SPECIFIC_USER' && (!specificEmail || specificEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()));

    if (isCurrentUserRecipient) {
      setCoins(prev => prev + amountCoins);
      const tx: TransactionRecord = {
        id: 'tx_gift_' + Date.now(),
        timestamp: Date.now(),
        type: 'ARENA_REWARD',
        title: `Regalo Oficial: ${reason}`,
        description: `Airdrop de la administración asignado a ${targetLabel}: +${amountCoins} monedas Aether.`,
        amountCoins: amountCoins,
        status: 'COMPLETED',
        txHash,
        biometricVerified: false
      };
      setTransactions(prev => [tx, ...prev]);
      addNotification(
        '🎁 ¡Regalo Recibido del Administrador!',
        `Has recibido +${amountCoins} monedas (${reason}) asignadas a ${targetLabel}.`,
        'reward',
        amountCoins
      );
    }

    // Broadcast announcement in live chat
    const broadcastMsg: ChatMessage = {
      id: 'msg_sys_airdrop_' + Date.now(),
      sender: 'SISTEMA BÓVEDA',
      level: 100,
      text: `🎁 [AIRDROP OFICIAL]: La administración envió un regalo de ${amountCoins} monedas a ${targetLabel} (Motivo: "${reason}"). ¡Total distribuido: ${totalDistributed.toLocaleString()} monedas!`,
      timestamp: Date.now(),
      isSystem: true,
      badge: '👑 Admin Vault'
    };
    setChatMessages(prev => [broadcastMsg, ...prev]);

    soundFx.playWinFanfare();
    confetti({ particleCount: 110, spread: 80 });

    if (isOwner && authToken) {
      void fetch('/api/admin/audit-trail/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'ADMIN_COINS_AIRDROP',
          severity: 'WARN',
          details: `Airdrop +${amountCoins} monedas/usuario a ${targetLabel} (${count} usuarios, total ${totalDistributed}). Motivo: ${reason}`
        })
      }).catch(() => {});
    }

    return {
      success: true,
      recipientsCount: count,
      totalCoins: totalDistributed
    };
  };

  const adminAdjustUserCoins = (amountDelta: number, reason: string) => {
    setCoins(prev => Math.max(0, prev + amountDelta));
    const tx: TransactionRecord = {
      id: 'tx_adj_' + Date.now(),
      timestamp: Date.now(),
      type: 'ARENA_REWARD',
      title: `Ajuste Administrativo: ${amountDelta >= 0 ? '+' : ''}${amountDelta} monedas`,
      description: `${reason}. Saldo actualizado por el propietario de la bóveda.`,
      amountCoins: amountDelta,
      status: 'COMPLETED',
      txHash: generateTxHash({ delta: amountDelta, reason, time: Date.now() }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);
    if (amountDelta > 0) {
      soundFx.playCoinChime();
      addNotification('Ajuste de Monedas Aprobado', `Se han añadido +${amountDelta} monedas a la cuenta (${reason}).`, 'reward', amountDelta);
    } else {
      soundFx.playClick();
      addNotification('Deducción de Monedas', `Se han deducido ${Math.abs(amountDelta)} monedas (${reason}).`, 'info');
    }
    if (isOwner && authToken) {
      void fetch('/api/admin/audit-trail/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'ADMIN_COINS_ADJUSTED',
          severity: 'WARN',
          details: `Ajuste manual ${amountDelta >= 0 ? '+' : ''}${amountDelta} monedas (${reason})`
        })
      }).catch(() => {});
    }
  };

  // ==========================================
  // Happy Hour & Multipliers Management
  // ==========================================
  const [happyHourCampaign, setHappyHourCampaign] = useState<HappyHourCampaign>(() => {
    try {
      const saved = localStorage.getItem('aethervault_happy_hour_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const now = Date.now();
    return {
      id: 'hh_master_1',
      title: '🔥 Hora Loca de Casino: Multiplicador 2.0x',
      multiplier: 2.0,
      gameSection: 'ALL_GAMES',
      targetGroup: 'ALL_PLAYERS',
      isActive: true,
      startTime: now,
      durationMinutes: 120,
      expiresAt: now + 120 * 60 * 1000,
      bannerColor: 'amber'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_happy_hour_v1', JSON.stringify(happyHourCampaign));
    } catch {
      // ignore
    }
  }, [happyHourCampaign]);

  const updateHappyHourCampaign = (patch: Partial<HappyHourCampaign>) => {
    setHappyHourCampaign(prev => {
      const updated = { ...prev, ...patch };
      if (patch.durationMinutes !== undefined && patch.durationMinutes > 0) {
        updated.expiresAt = Date.now() + patch.durationMinutes * 60 * 1000;
      }
      return updated;
    });
  };

  const toggleHappyHour = (active?: boolean) => {
    setHappyHourCampaign(prev => {
      const nextActive = active !== undefined ? active : !prev.isActive;
      const now = Date.now();
      const duration = prev.durationMinutes > 0 ? prev.durationMinutes : 120;
      const updated: HappyHourCampaign = {
        ...prev,
        isActive: nextActive,
        startTime: nextActive ? now : prev.startTime,
        expiresAt: nextActive ? now + duration * 60 * 1000 : prev.expiresAt
      };

      if (nextActive) {
        const broadcast: ChatMessage = {
          id: 'msg_hh_toggle_' + Date.now(),
          sender: 'SISTEMA BÓVEDA',
          level: 100,
          text: `🔥 [HORA LOCA ACTIVADA]: ¡Multiplicador de ${updated.multiplier}x en ganancias activo para ${updated.gameSection === 'ALL_GAMES' ? 'todos los juegos' : updated.gameSection}!`,
          timestamp: Date.now(),
          isSystem: true,
          badge: '⚡ Happy Hour'
        };
        setChatMessages(c => [broadcast, ...c]);
        soundFx.playWinFanfare();
        confetti({ particleCount: 90, spread: 70 });
        addNotification(
          '¡Hora Loca Activada!',
          `Multiplicador de ganancias ${updated.multiplier}x activo para ${updated.gameSection === 'ALL_GAMES' ? 'todos los juegos' : updated.gameSection}.`,
          'reward'
        );
      } else {
        soundFx.playClick();
        addNotification('Hora Loca Desactivada', 'La campaña especial de multiplicadores ha sido pausada.', 'info');
      }
      return updated;
    });
  };

  const isHappyHourActiveForGame = useCallback((game: 'Roulette' | 'Blackjack' | 'Poker' | 'Greyhounds' | 'Horses' | 'Arena' | 'Top50Casino') => {
    if (!happyHourCampaign.isActive) {
      return { active: false, multiplier: 1.0, title: '', remainingSeconds: 0, targetGroup: '', gameSection: '' };
    }

    const now = Date.now();
    if (happyHourCampaign.durationMinutes > 0 && now > happyHourCampaign.expiresAt) {
      return { active: false, multiplier: 1.0, title: '', remainingSeconds: 0, targetGroup: '', gameSection: '' };
    }

    // Game section match
    const sectionMatch =
      happyHourCampaign.gameSection === 'ALL_GAMES' ||
      (happyHourCampaign.gameSection === 'ROULETTE' && game === 'Roulette') ||
      (happyHourCampaign.gameSection === 'BLACKJACK' && game === 'Blackjack') ||
      (happyHourCampaign.gameSection === 'POKER' && game === 'Poker') ||
      (happyHourCampaign.gameSection === 'GREYHOUNDS' && game === 'Greyhounds') ||
      (happyHourCampaign.gameSection === 'HORSES' && game === 'Horses') ||
      (happyHourCampaign.gameSection === 'ARENA' && game === 'Arena') ||
      (happyHourCampaign.gameSection === 'TOP_50_CASINO' && game === 'Top50Casino');

    if (!sectionMatch) {
      return { active: false, multiplier: 1.0, title: '', remainingSeconds: 0, targetGroup: '', gameSection: '' };
    }

    // Target group match
    let groupMatch = true;
    if (happyHourCampaign.targetGroup === 'VIP_PLAYERS' && character.level < 10) {
      groupMatch = false;
    } else if (happyHourCampaign.targetGroup === 'NEW_PLAYERS' && character.level > 5) {
      groupMatch = false;
    }

    if (!groupMatch) {
      return { active: false, multiplier: 1.0, title: '', remainingSeconds: 0, targetGroup: '', gameSection: '' };
    }

    const remainingSeconds = happyHourCampaign.durationMinutes > 0
      ? Math.max(0, Math.floor((happyHourCampaign.expiresAt - now) / 1000))
      : 999999;

    return {
      active: true,
      multiplier: happyHourCampaign.multiplier,
      title: happyHourCampaign.title,
      remainingSeconds,
      targetGroup: happyHourCampaign.targetGroup,
      gameSection: happyHourCampaign.gameSection
    };
  }, [happyHourCampaign, character.level]);

  // Financial Aggregations
  const grossRevenueUSD = transactions
    .filter(t => t.type === 'RECHARGE' && t.amountUSD)
    .reduce((acc, t) => acc + (t.amountUSD || 0), 1850);

  const withdrawnUSD = adminWithdrawals.reduce((acc, w) => acc + w.amountUSD, 0);

  const availableBalanceUSD = Math.max(0, grossRevenueUSD - withdrawnUSD);

  const totalCoinsSold = transactions
    .filter(t => t.type === 'RECHARGE')
    .reduce((acc, t) => acc + t.amountCoins, 2300);

  // 70% House Vault / 30% Player Prize Pool / 20% Withdrawal Fee
  const totalWageredVolume = transactions
    .filter(t => t.type === 'CASINO_BET' || t.type === 'CASINO_WIN')
    .reduce((acc, t) => acc + Math.abs(t.amountCoins), 16400);

  const houseVaultShare = Math.round(totalWageredVolume * (vaultRetentionRate / 100)); // Dynamic house retention
  const playerPrizeReserve = Math.round(totalWageredVolume * (playerPrizeRate / 100)); // Dynamic player prize reserve

  const withdrawalFeesCollected = redemptionRequests
    .filter(r => r.status === 'APPROVED')
    .reduce((acc, r) => acc + r.feeUSD, 180); // 20% fee auto-collected

  const vaultEconomics: VaultSplitEconomics = {
    totalWagered: totalWageredVolume,
    houseVaultShare,
    playerPrizeReserve,
    withdrawalFeesCollected,
    netOwnerProfitUSD: Math.round(availableBalanceUSD + withdrawalFeesCollected + (houseVaultShare * 0.8))
  };

  // Actions for redemptions
  const syncRedemptionToFirestore = async (req: PlayerRedemptionRequest): Promise<boolean> => {
    if (!firebaseUser || !firebaseUser.email || !firebaseUser.emailVerified) {
      addNotification(
        'Sesión Google Requerida',
        `Conecta tu cuenta Google (${OWNER_EMAIL}) en la Bóveda para sincronizar en Firestore.`,
        'security'
      );
      return false;
    }
    try {
      const synced = await upsertRedemptionRequestToFirestore({ req, actorUser: firebaseUser });
      if (synced) {
        setRedemptionRequests(prev =>
          prev.map(item => (item.id === req.id ? { ...item, firestoreSynced: true } : item))
        );
        addNotification(
          'Sincronizado en Firestore',
          `La solicitud #${req.id.slice(-8)} quedó registrada en Firestore con awaitingAuthorization=${req.awaitingAuthorization}.`,
          'success'
        );
      }
      return synced;
    } catch (err) {
      addNotification(
        'Error al Sincronizar Firestore',
        err instanceof Error ? err.message : 'No se pudo guardar la solicitud en Firestore.',
        'security'
      );
      return false;
    }
  };

  const validateAndCreateAdminRedemption = async (params: {
    playerEmail: string;
    playerName?: string;
    requestedCoins: number;
    destinationType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire';
    destinationAddress: string;
  }): Promise<{ ok: boolean; message: string; request?: PlayerRedemptionRequest }> => {
    if (!isOwner || userEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase() || !authToken) {
      const msg = `Solo ${OWNER_EMAIL} autenticado con token HMAC puede ejecutar el validador de retiros.`;
      addNotification('Acceso Restringido', msg, 'security');
      return { ok: false, message: msg };
    }

    try {
      const res = await fetch('/api/admin/redemptions/validate-and-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          playerEmail: params.playerEmail.trim().toLowerCase(),
          playerName: params.playerName?.trim(),
          requestedCoins: Math.floor(params.requestedCoins),
          destinationType: params.destinationType,
          destinationAddress: params.destinationAddress.trim(),
          feeRatePct: redemptionFeeRate
        })
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        request?: PlayerRedemptionRequest;
      };

      if (!res.ok || !data.ok || !data.request) {
        const msg = data.error || 'No se pudo validar y registrar la solicitud de retiro.';
        addNotification('Validación Rechazada', msg, 'security');
        return { ok: false, message: msg };
      }

      let finalReq: PlayerRedemptionRequest = {
        ...data.request,
        awaitingAuthorization: true,
        firestoreSynced: false
      };

      if (firebaseUser && firebaseUser.email && firebaseUser.emailVerified) {
        try {
          const synced = await upsertRedemptionRequestToFirestore({
            req: finalReq,
            actorUser: firebaseUser
          });
          if (synced) {
            finalReq = { ...finalReq, firestoreSynced: true };
          }
        } catch {
          // SQLite record persists authoritatively; Firestore can be synced manually if offline
        }
      }

      setRedemptionRequests(prev => [finalReq, ...prev.filter(r => r.id !== finalReq.id)]);
      await refreshRedemptionsFromServer();
      soundFx.playCoinChime();

      addNotification(
        finalReq.cappedAutomatically
          ? 'Solicitud Limitada Automáticamente al 30%'
          : 'Solicitud Validada en Espera de Autorización',
        data.message || `Solicitud creada con Espera de Autorización activa para ${OWNER_EMAIL}.`,
        finalReq.cappedAutomatically ? 'info' : 'success'
      );

      return { ok: true, message: data.message || 'Solicitud creada.', request: finalReq };
    } catch {
      const msg = 'Error de conexión con /api/admin/redemptions/validate-and-create.';
      addNotification('Error de Red', msg, 'security');
      return { ok: false, message: msg };
    }
  };

  const requestPlayerRedemption = async (
    coinsToRedeem: number,
    destType: 'crypto_usdt' | 'crypto_monero' | 'crypto_btc' | 'paypal' | 'bank_wire',
    destAddress: string
  ): Promise<boolean> => {
    if (isDemoAccount) {
      addNotification(
        'Modo Demo Aislado ($5,000 USD)',
        'La cuenta demo gokudemo opera con saldo virtual aislado y no permite retiros de dinero real. Cambia a una cuenta real para operar.',
        'security'
      );
      return false;
    }

    if (!isRealAccountActive) {
      addNotification(
        'Cuenta Real Pendiente de Activación',
        'Las cuentas reales se activan únicamente tras confirmar el primer depósito en la Bóveda.',
        'security'
      );
      return false;
    }

    if (coinsToRedeem <= 0 || coinsToRedeem > coins) return false;

    const maxAllowed30Pct = Math.floor(coins * 0.30);
    if (coinsToRedeem > maxAllowed30Pct) {
      addNotification(
        'Límite Máximo de Retiro: 30%',
        `Por política de liquidez, solo puedes retirar hasta el 30% de tu saldo (${maxAllowed30Pct.toLocaleString()} monedas) y requiere autorización de ${OWNER_EMAIL}.`,
        'security'
      );
      return false;
    }

    if (authToken) {
      try {
        const res = await fetch('/api/redemptions/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            amountCoins: coinsToRedeem,
            playerName: character.name,
            destinationType: destType,
            destinationAddress: destAddress,
            feeRatePct: redemptionFeeRate
          })
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          request?: PlayerRedemptionRequest;
          updatedCoinsBalance?: number;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.request) {
          addNotification('Retiro No Permitido', data.error || 'No se pudo procesar la solicitud de retiro.', 'security');
          return false;
        }
        if (typeof data.updatedCoinsBalance === 'number') {
          setCoins(data.updatedCoinsBalance);
        } else {
          setCoins(prev => prev - coinsToRedeem);
        }

        let createdReq: PlayerRedemptionRequest = {
          ...data.request,
          awaitingAuthorization: data.request.awaitingAuthorization ?? true
        };

        if (firebaseUser && firebaseUser.email && firebaseUser.emailVerified) {
          try {
            const synced = await upsertRedemptionRequestToFirestore({
              req: createdReq,
              actorUser: firebaseUser
            });
            if (synced) createdReq = { ...createdReq, firestoreSynced: true };
          } catch {
            // Keep SQLite record
          }
        }

        setRedemptionRequests(prev => [createdReq, ...prev.filter(r => r.id !== createdReq.id)]);
        const tx: TransactionRecord = {
          id: 'tx_red_' + Date.now(),
          timestamp: Date.now(),
          type: 'REDEMPTION_REQUEST',
          title: `Solicitud de Canje (Máx 30%): ${coinsToRedeem} Monedas ($${createdReq.netUSD.toFixed(2)} USD Netos)`,
          description: `Retiro verificado en BD dentro del límite 30% con ${redemptionFeeRate}% de comisión ($${createdReq.feeUSD.toFixed(2)} USD). En Espera de Autorización de ${OWNER_EMAIL}.`,
          amountCoins: -coinsToRedeem,
          amountUSD: createdReq.netUSD,
          status: 'PENDING',
          txHash: createdReq.txHash,
          biometricVerified: true
        };
        setTransactions(prev => [tx, ...prev]);
        addNotification(
          'Solicitud de Retiro Enviada (Tope 30%)',
          `Se reservaron ${coinsToRedeem} monedas ($${createdReq.netUSD.toFixed(2)} USD netos). En Espera de Autorización manual de ${OWNER_EMAIL}.`,
          'info'
        );
        return true;
      } catch {
        // Fallback if local API unreachable
      }
    }

    const grossUSD = coinsToRedeem * 0.8;
    const feeRateFraction = redemptionFeeRate / 100;
    const feeUSD = Math.round(grossUSD * feeRateFraction * 100) / 100; // Dynamic commission to Owner's Vault
    const netUSD = Math.round(grossUSD * (1 - feeRateFraction) * 100) / 100; // Net payout to player

    const txHash = generateTxHash({
      redemption: true,
      coinsToRedeem,
      grossUSD,
      feeUSD,
      netUSD,
      playerEmail: userEmail,
      timestamp: Date.now()
    });

    let newReq: PlayerRedemptionRequest = {
      id: 'red_' + Date.now(),
      playerEmail: userEmail,
      playerName: character.name,
      balanceBeforeCoins: coins,
      maxAllowed30PctCoins: maxAllowed30Pct,
      requestedOriginalCoins: coinsToRedeem,
      cappedAutomatically: false,
      amountCoins: coinsToRedeem,
      grossUSD,
      feeUSD,
      netUSD,
      destinationType: destType,
      destinationAddress: destAddress,
      status: 'PENDING_APPROVAL',
      awaitingAuthorization: true,
      timestamp: Date.now(),
      txHash,
      firestoreSynced: false
    };

    if (firebaseUser && firebaseUser.email && firebaseUser.emailVerified) {
      try {
        const synced = await upsertRedemptionRequestToFirestore({ req: newReq, actorUser: firebaseUser });
        if (synced) newReq = { ...newReq, firestoreSynced: true };
      } catch {
        // keep local state
      }
    }

    setCoins(prev => prev - coinsToRedeem);
    setRedemptionRequests(prev => [newReq, ...prev]);

    const tx: TransactionRecord = {
      id: 'tx_red_' + Date.now(),
      timestamp: Date.now(),
      type: 'REDEMPTION_REQUEST',
      title: `Solicitud de Canje (Máx 30%): ${coinsToRedeem} Monedas ($${netUSD.toFixed(2)} USD Netos)`,
      description: `Retiro con ${redemptionFeeRate}% de comisión ($${feeUSD.toFixed(2)} USD) retenida para la Bóveda. En Espera de Autorización de ${OWNER_EMAIL}`,
      amountCoins: -coinsToRedeem,
      amountUSD: netUSD,
      status: 'PENDING',
      txHash,
      biometricVerified: true
    };
    setTransactions(prev => [tx, ...prev]);

    addNotification(
      'Solicitud de Canje Enviada',
      `Se descontaron ${coinsToRedeem} monedas. En Espera de Autorización manual por ${OWNER_EMAIL}. Monto neto: $${netUSD.toFixed(2)} USD.`,
      'info'
    );
    return true;
  };

  const approveRedemptionRequest = async (requestId: string): Promise<boolean> => {
    if (!isOwner || userEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      addNotification('Acceso Restringido', `Solo el Administrador (${OWNER_EMAIL}) puede autorizar canjes.`, 'security');
      return false;
    }

    const targetReq = redemptionRequests.find(r => r.id === requestId);
    if (!targetReq || targetReq.status !== 'PENDING_APPROVAL' || !targetReq.awaitingAuthorization) return false;

    if (typeof targetReq.balanceBeforeCoins === 'number' && targetReq.balanceBeforeCoins > 0) {
      const cap30 = Math.floor(targetReq.balanceBeforeCoins * 0.30);
      if (targetReq.amountCoins > cap30) {
        addNotification(
          'Bloqueo de Validación 30%',
          `La solicitud #${requestId.slice(-8)} (${targetReq.amountCoins} mo) excede el 30% (${cap30} mo). Recházala para reembolsar.`,
          'security'
        );
        return false;
      }
    }

    if (authToken) {
      try {
        const res = await fetch(`/api/redemptions/${encodeURIComponent(requestId)}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ decision: 'APPROVED' })
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          addNotification('Error de Autorización', err.error || 'No se pudo autorizar el retiro en el servidor.', 'security');
          return false;
        }
      } catch {
        // fallback local update
      }
    }

    if (firebaseUser && firebaseUser.emailVerified && firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      try {
        await reviewRedemptionRequestInFirestore({
          requestId,
          decision: 'APPROVED',
          ownerUser: firebaseUser
        });
      } catch {
        // Keep SQLite authoritative even if doc wasn't synced yet
      }
    }

    setRedemptionRequests(prev =>
      prev.map(r =>
        r.id === requestId
          ? {
              ...r,
              status: 'APPROVED',
              awaitingAuthorization: false,
              authorizedByEmail: OWNER_EMAIL,
              reviewedAt: Date.now()
            }
          : r
      )
    );

    await refreshRedemptionsFromServer();
    soundFx.playCoinChime();
    confetti({ particleCount: 75, spread: 60 });

    addNotification(
      'Canje Autorizado Manualmente',
      `Se resolvió Espera de Autorización y se liberó $${targetReq.netUSD.toFixed(2)} USD para ${targetReq.playerName}. La comisión del 20% ($${targetReq.feeUSD.toFixed(2)} USD) ingresó a tu Bóveda.`,
      'success'
    );
    return true;
  };

  const rejectRedemptionRequest = async (requestId: string, reason?: string): Promise<boolean> => {
    if (!isOwner || userEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) return false;
    const targetReq = redemptionRequests.find(r => r.id === requestId);
    if (!targetReq || targetReq.status !== 'PENDING_APPROVAL' || !targetReq.awaitingAuthorization) return false;

    if (authToken) {
      try {
        const res = await fetch(`/api/redemptions/${encodeURIComponent(requestId)}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ decision: 'REJECTED', rejectionReason: reason })
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          addNotification('Error al Rechazar Retiro', err.error || 'No se pudo rechazar el retiro.', 'security');
          return false;
        }
      } catch {
        // fallback local update
      }
    }

    if (firebaseUser && firebaseUser.emailVerified && firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      try {
        await reviewRedemptionRequestInFirestore({
          requestId,
          decision: 'REJECTED',
          ownerUser: firebaseUser,
          rejectionReason: reason
        });
      } catch {
        // Keep SQLite authoritative
      }
    }

    // Refund coins to user if current
    if (targetReq.playerEmail === userEmail) {
      setCoins(prev => prev + targetReq.amountCoins);
    }

    setRedemptionRequests(prev =>
      prev.map(r =>
        r.id === requestId
          ? {
              ...r,
              status: 'REJECTED',
              awaitingAuthorization: false,
              authorizedByEmail: OWNER_EMAIL,
              reviewedAt: Date.now(),
              rejectionReason: reason || 'Rechazado por verificación de seguridad'
            }
          : r
      )
    );

    await refreshRedemptionsFromServer();
    soundFx.playClick();
    addNotification('Solicitud de Canje Rechazada', `La solicitud de ${targetReq.playerName} salió de Espera de Autorización y las monedas fueron reembolsadas.`, 'info');
    return true;
  };

  // Support Tickets, User Password & Payment Resolution
  const createSupportTicket = (ticketData: {
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    initialMessage: string;
    paymentTxHash?: string;
    paymentAmountCoins?: number;
    paymentGateway?: string;
  }): SupportTicket => {
    const now = Date.now();
    const newTicket: SupportTicket = {
      id: 'tkt_' + now,
      userEmail,
      userName: character.name || userEmail.split('@')[0],
      category: ticketData.category,
      priority: ticketData.priority,
      subject: ticketData.subject,
      status: 'ABIERTO',
      createdAt: now,
      updatedAt: now,
      paymentTxHash: ticketData.paymentTxHash,
      paymentAmountCoins: ticketData.paymentAmountCoins,
      paymentGateway: ticketData.paymentGateway,
      messages: [
        {
          id: 'msg_' + now,
          senderEmail: userEmail,
          senderName: character.name || userEmail.split('@')[0],
          isAdmin: isOwner,
          message: ticketData.initialMessage,
          timestamp: now
        }
      ]
    };

    setSupportTickets(prev => [newTicket, ...prev]);

    if (authToken) {
      fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          id: newTicket.id,
          userName: newTicket.userName,
          category: ticketData.category,
          priority: ticketData.priority,
          subject: ticketData.subject,
          initialMessage: ticketData.initialMessage,
          paymentTxHash: ticketData.paymentTxHash,
          paymentAmountCoins: ticketData.paymentAmountCoins,
          paymentGateway: ticketData.paymentGateway
        })
      }).catch(() => {
        // local state fallback active
      });
    }

    soundFx.playClick();
    addNotification(
      'Ticket de Soporte Creado',
      `Tu ticket #${newTicket.id.slice(-6)} "${ticketData.subject}" ha sido recibido por el equipo técnico.`,
      'info'
    );
    return newTicket;
  };

  const replyToTicket = (ticketId: string, text: string, asAdmin: boolean = false): boolean => {
    if (!text.trim()) return false;
    const now = Date.now();
    const newMsg: TicketMessage = {
      id: 'msg_' + now,
      senderEmail: asAdmin ? OWNER_EMAIL : userEmail,
      senderName: asAdmin ? 'Administrador Bóveda' : (character.name || userEmail.split('@')[0]),
      isAdmin: asAdmin,
      message: text.trim(),
      timestamp: now
    };

    setSupportTickets(prev =>
      prev.map(tkt => {
        if (tkt.id === ticketId) {
          const nextStatus: TicketStatus = asAdmin ? 'RESPONDIDO' : 'EN_REVISION';
          return {
            ...tkt,
            status: nextStatus,
            updatedAt: now,
            messages: [...tkt.messages, newMsg]
          };
        }
        return tkt;
      })
    );

    if (authToken) {
      fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: text.trim() })
      }).catch(() => {
        // ignore fallback
      });
    }

    soundFx.playClick();
    addNotification(
      asAdmin ? 'Respuesta de Soporte Enviada' : 'Mensaje Enviado al Ticket',
      asAdmin ? `Has respondido al ticket #${ticketId.slice(-6)}.` : `Tu mensaje se agregó al ticket #${ticketId.slice(-6)}.`,
      'info'
    );
    return true;
  };

  const resolveSupportTicket = (ticketId: string, creditCoinsAmount?: number, resolutionNotes?: string): boolean => {
    const tkt = supportTickets.find(t => t.id === ticketId);
    if (!tkt) return false;

    if (creditCoinsAmount && creditCoinsAmount > 0) {
      setCoins(prev => prev + creditCoinsAmount);
      const tx: TransactionRecord = {
        id: 'tx_supp_cred_' + Date.now(),
        timestamp: Date.now(),
        type: 'RECHARGE',
        title: `Acreditación por Soporte (#${ticketId.slice(-6)})`,
        description: `Resolución de reclamo/pago: +${creditCoinsAmount} monedas acreditadas por el Administrador. ${resolutionNotes || ''}`,
        amountCoins: creditCoinsAmount,
        status: 'SECURED',
        txHash: generateTxHash({ ticketId, creditCoinsAmount, time: Date.now() }),
        biometricVerified: true
      };
      setTransactions(prev => [tx, ...prev]);
      setHasConfirmedRealDeposit(true);
      soundFx.playWinFanfare();
      confetti({ particleCount: 70, spread: 60 });
      addNotification(
        '¡Pago / Reclamo Acreditado!',
        `Se han acreditado +${creditCoinsAmount.toLocaleString()} monedas a favor de ${tkt.userEmail}.`,
        'reward',
        creditCoinsAmount
      );
    }

    const now = Date.now();
    setSupportTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          const closingMsg: TicketMessage = {
            id: 'msg_close_' + now,
            senderEmail: OWNER_EMAIL,
            senderName: 'Administrador (Resolución)',
            isAdmin: true,
            message: `[Ticket Resuelto]: ${resolutionNotes || (creditCoinsAmount ? `Acreditación de ${creditCoinsAmount} monedas completada con éxito.` : 'El caso ha sido solucionado satisfactoriamente.')}`,
            timestamp: now
          };
          return {
            ...t,
            status: 'RESUELTO',
            updatedAt: now,
            messages: [...t.messages, closingMsg]
          };
        }
        return t;
      })
    );

    return true;
  };

  const updateSupportTicketStatus = (
    ticketId: string,
    newStatus: TicketStatus,
    notes?: string,
    refundCoinsAmount?: number
  ): boolean => {
    const tkt = supportTickets.find(t => t.id === ticketId);
    if (!tkt) return false;

    const now = Date.now();
    const statusLabels: Record<TicketStatus, string> = {
      ABIERTO: 'Abierto',
      EN_REVISION: 'En Revisión',
      RESPONDIDO: 'Respondido',
      RESUELTO: 'Resuelto',
      REEMBOLSO_PROCESADO: 'Reembolso Procesado'
    };

    if (newStatus === 'REEMBOLSO_PROCESADO' && refundCoinsAmount && refundCoinsAmount > 0) {
      setCoins(prev => prev + refundCoinsAmount);
      const tx: TransactionRecord = {
        id: 'tx_refund_' + now,
        timestamp: now,
        type: 'RECHARGE',
        title: `Reembolso Procesado (#${ticketId.slice(-6)})`,
        description: `Reembolso autorizado por ${OWNER_EMAIL} a ${tkt.userEmail}: +${refundCoinsAmount} monedas (${(refundCoinsAmount * 0.8).toFixed(2)} USD). ${notes || ''}`,
        amountCoins: refundCoinsAmount,
        amountUSD: Math.round(refundCoinsAmount * 0.8 * 100) / 100,
        status: 'COMPLETED',
        txHash: generateTxHash({ ticketId, refundCoinsAmount, status: 'REEMBOLSO_PROCESADO', time: now }),
        biometricVerified: true
      };
      setTransactions(prev => [tx, ...prev]);
      soundFx.playWinFanfare();
      confetti({ particleCount: 70, spread: 60 });
    } else {
      soundFx.playClick();
    }

    const statusNotesMap: Record<TicketStatus, string> = {
      ABIERTO: 'El ticket ha sido reabierto para seguimiento.',
      EN_REVISION: 'Tu solicitud se encuentra actualmente En Revisión por el departamento técnico y financiero.',
      RESPONDIDO: 'El equipo de soporte ha respondido a tu consulta.',
      RESUELTO: 'El caso ha sido marcado como Resuelto satisfactoriamente.',
      REEMBOLSO_PROCESADO: refundCoinsAmount && refundCoinsAmount > 0
        ? `Reembolso Procesado por +${refundCoinsAmount.toLocaleString()} monedas ($${(refundCoinsAmount * 0.8).toFixed(2)} USD).`
        : 'El Reembolso ha sido Procesado y liquidado según el método de pago original.'
    };

    const auditMsg: TicketMessage = {
      id: 'msg_status_' + now,
      senderEmail: OWNER_EMAIL,
      senderName: 'Administrador (Control de Tickets)',
      isAdmin: true,
      message: `[Estado actualizado a: ${statusLabels[newStatus]}] ${notes?.trim() ? notes.trim() : statusNotesMap[newStatus]}`,
      timestamp: now
    };

    setSupportTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status: newStatus,
              updatedAt: now,
              messages: [...t.messages, auditMsg]
            }
          : t
      )
    );

    if (authToken) {
      fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: newStatus,
          note: notes?.trim() || undefined
        })
      }).catch(() => {
        // ignore fallback
      });
    }

    addNotification(
      `Ticket #${ticketId.slice(-6)} → ${statusLabels[newStatus]}`,
      `El estado del ticket de ${tkt.userEmail} se actualizó a "${statusLabels[newStatus]}".`,
      newStatus === 'REEMBOLSO_PROCESADO' || newStatus === 'RESUELTO' ? 'success' : 'info',
      refundCoinsAmount
    );

    return true;
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    if (authToken) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            currentPassword: currentPassword.trim(),
            newPassword
          })
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
        if (res.ok && data.ok) {
          soundFx.playBiometricSuccess();
          addNotification(
            'Contraseña Actualizada (scrypt BD)',
            data.message || 'Tu nueva contraseña ha sido cifrada con scrypt en la base de datos.',
            'security'
          );
          return { success: true, message: data.message || 'Contraseña actualizada y protegida con scrypt.' };
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          return { success: false, message: data.error || 'No fue posible verificar tu contraseña actual.' };
        }
      } catch {
        // Fallback to local verification
      }
    }

    if (isOwner) {
      return {
        success: false,
        message: 'Conecta tu sesión de Propietario con tu token HMAC-SHA256 para cambiar la clave en la base de datos SQL.'
      };
    }

    if (isDemoAccount) {
      if (currentPassword.trim() !== DEMO_PASSWORD) {
        return { success: false, message: 'La contraseña actual de la cuenta demo no es correcta (clave requerida: goku30309982).' };
      }
      soundFx.playBiometricSuccess();
      addNotification(
        'Contraseña Demo Actualizada',
        `Has actualizado la clave de la cuenta ${DEMO_USERNAME} a: ${newPassword}`,
        'success'
      );
      return { success: true, message: 'Contraseña demo actualizada correctamente para esta sesión.' };
    }

    // Standard player
    try {
      localStorage.setItem(`aethervault_pwd_${userEmail}`, newPassword);
    } catch {
      // ignore
    }
    soundFx.playBiometricSuccess();
    addNotification('Contraseña Actualizada', 'Tu nueva contraseña ha sido guardada con éxito.', 'success');
    return { success: true, message: 'Contraseña actualizada con éxito.' };
  };

  const resolvePaymentByTxHash = (
    txHashOrRef: string,
    gateway: string,
    expectedCoins: number
  ): { success: boolean; credited: boolean; message: string; coinsAdded?: number } => {
    const cleanHash = txHashOrRef.trim();
    if (!cleanHash || cleanHash.length < 8) {
      return {
        success: false,
        credited: false,
        message: 'Por favor ingresa un Hash (TXID) de transacción válido de al menos 8 caracteres.'
      };
    }

    const coinsToCredit = expectedCoins > 0 ? expectedCoins : 250;
    setCoins(prev => prev + coinsToCredit);
    setHasConfirmedRealDeposit(true);

    const tx: TransactionRecord = {
      id: 'tx_diag_res_' + Date.now(),
      timestamp: Date.now(),
      type: 'RECHARGE',
      title: `Depósito Acreditado por Diagnóstico (${gateway || 'Blockchain / Pasarela'})`,
      description: `Hash Verificado: ${cleanHash.slice(0, 16)}... Saldo acreditado automáticamente tras comprobación en nodo.`,
      amountCoins: coinsToCredit,
      status: 'SECURED',
      txHash: cleanHash.startsWith('0x') ? cleanHash : '0x' + cleanHash,
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);

    soundFx.playWinFanfare();
    confetti({ particleCount: 80, spread: 65 });
    addNotification(
      '¡Pago Verificado y Acreditado!',
      `Tu depósito de ${coinsToCredit.toLocaleString()} monedas ha sido verificado con éxito en la red ${gateway}.`,
      'reward',
      coinsToCredit
    );

    return {
      success: true,
      credited: true,
      message: `¡Transacción confirmada en la pasarela ${gateway}! Se han acreditado +${coinsToCredit.toLocaleString()} monedas a tu cuenta.`,
      coinsAdded: coinsToCredit
    };
  };

  // Unlock levels up to 100 ($50 USD for Lv 11-50, $100 USD for Lv 51-100)
  const unlockNextHeroLevel = async (costCoins: number, costUSD: number): Promise<boolean> => {
    if (coins < costCoins || character.level >= 100) {
      addNotification('Fondos Insuficientes', `Necesitas ${costCoins} monedas para ascender al siguiente nivel.`, 'info');
      return false;
    }

    const nextLvl = character.level + 1;
    setCoins(prev => prev - costCoins);

    let title = character.title;
    if (nextLvl >= 100) title = 'Emperador Cósmico Supremo (Nv. 100)';
    else if (nextLvl >= 80) title = 'Soberano Arcano Legendario';
    else if (nextLvl >= 50) title = 'Gran Comandante Titánico';
    else if (nextLvl >= 30) title = 'Maestro Ciber-Guardián';
    else if (nextLvl >= 11) title = 'Veterano Élite Ascendido';

    setCharacter(prev => ({
      ...prev,
      level: nextLvl,
      title,
      skills: {
        attack: prev.skills.attack + 1,
        defense: prev.skills.defense + 1,
        luck: prev.skills.luck + 1,
        agility: prev.skills.agility + 1,
        energy: prev.skills.energy + 1
      }
    }));

    const tx: TransactionRecord = {
      id: 'tx_lvl_' + Date.now(),
      timestamp: Date.now(),
      type: 'LEVEL_UNLOCK',
      title: `Ascensión de Nivel: Nivel ${nextLvl} Desbloqueado ($${costUSD} USD)`,
      description: `Ascenso pagado con ganancias. Multiplicadores y límites VIP ampliados.`,
      amountCoins: -costCoins,
      amountUSD: costUSD,
      status: 'COMPLETED',
      txHash: generateTxHash({ nextLvl, costCoins, costUSD }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);

    soundFx.playWinFanfare();
    confetti({ particleCount: 90, spread: 70 });
    addNotification('¡Nivel Desbloqueado!', `Has alcanzado el Nivel ${nextLvl} de 100. Título otorgado: ${title}`, 'reward');
    return true;
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHARACTER, JSON.stringify(character));
    } catch {
      // ignore
    }
  }, [character]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BIOMETRICS, JSON.stringify(biometrics));
    } catch {
      // ignore
    }
  }, [biometrics]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROUNDS, JSON.stringify(provablyFairHistory));
    } catch {
      // ignore
    }
  }, [provablyFairHistory]);

  useEffect(() => {
    soundFx.initMuteFromStorage();
  }, []);

  // Push notification dispatcher
  const addNotification = useCallback((title: string, message: string, type: 'success' | 'security' | 'reward' | 'info', amount?: number) => {
    const newNotif: PushNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      timestamp: Date.now(),
      type,
      read: false,
      amount
    };

    setNotifications(prev => [newNotif, ...prev]);
    setActiveToast(newNotif);
    soundFx.playPushNotification();

    // Auto dismiss toast after 5.5s
    setTimeout(() => {
      setActiveToast(current => (current?.id === newNotif.id ? null : current));
    }, 5500);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Compute character rank title from level
  const computeTitle = (totalLevels: number): string => {
    if (totalLevels < 10) return 'Iniciado Cibernético';
    if (totalLevels < 25) return 'Guardián de Bóveda';
    if (totalLevels < 50) return 'Comandante Aether';
    if (totalLevels < 85) return 'Gran Maestro Cripto';
    return 'Soberano Arcano Legendario';
  };

  // Skill cost calculation: increases with current level
  const getSkillUpgradeCost = (skill: keyof CharacterSkills): number => {
    const currentVal = character.skills[skill] || 1;
    return Math.floor(currentVal * 12 + 5);
  };

  // Skill upgrade handler
  const upgradeSkill = (skill: keyof CharacterSkills): boolean => {
    const cost = getSkillUpgradeCost(skill);
    if (coins < cost) {
      addNotification('Fondos Insuficientes', `Necesitas ${cost} monedas para mejorar ${skill.toUpperCase()}. Adquiere un paquete en la tienda.`, 'info');
      soundFx.playClick();
      return false;
    }

    const newCoins = coins - cost;
    const newSkillLevel = character.skills[skill] + 1;
    const updatedSkills = {
      ...character.skills,
      [skill]: newSkillLevel
    };
    const totalSkillSum = Object.values(updatedSkills).reduce((a, b) => a + b, 0);
    const newOverallLevel = Math.floor(totalSkillSum / 3) + 1;
    const newTitle = computeTitle(totalSkillSum);

    setCoins(newCoins);
    setCharacter(prev => ({
      ...prev,
      level: newOverallLevel,
      title: newTitle,
      skills: updatedSkills,
      experience: prev.experience + 50,
      maxExperience: Math.floor(prev.maxExperience * 1.08)
    }));

    // Record transaction
    const tx: TransactionRecord = {
      id: 'tx_upg_' + Date.now(),
      timestamp: Date.now(),
      type: 'SKILL_UPGRADE',
      title: `Mejora de Habilidad: ${skill.toUpperCase()} Lv.${newSkillLevel}`,
      description: `Optimización del núcleo de personaje por ${cost} Monedas Aether`,
      amountCoins: -cost,
      status: 'COMPLETED',
      txHash: generateTxHash({ skill, level: newSkillLevel, cost }),
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);

    soundFx.playCoinChime();
    addNotification('Habilidad Mejorada', `¡${skill.toUpperCase()} ascendió al Nivel ${newSkillLevel}! Estatus: ${newTitle}`, 'reward');

    // Advance daily quest
    setDailyQuests(prev =>
      prev.map(q => {
        if (q.gameType === 'Upgrade' && !q.completed) {
          const nextCount = q.currentCount + 1;
          const completed = nextCount >= q.targetCount;
          if (completed && !q.completed) {
            addNotification('¡Misión Diaria Completada!', `Has completado "${q.title}". ¡Reclama tus monedas en la Rueda Diaria!`, 'reward');
          }
          return { ...q, currentCount: nextCount, completed };
        }
        return q;
      })
    );

    return true;
  };

  // Secure Recharge process
  const rechargeCoins = async (
    tier: CoinPackageTier,
    paymentMethod: PaymentMethodType,
    biometricVerified: boolean
  ): Promise<TransactionRecord> => {
    // Generate secure cryptographic hash
    const rawTxPayload = {
      tierLevel: tier.level,
      coins: tier.coins,
      priceUSD: tier.priceUSD,
      paymentMethod,
      timestamp: Date.now(),
      biometric: biometricVerified
    };
    const txHash = generateTxHash(rawTxPayload);

    const newRecord: TransactionRecord = {
      id: 'tx_rec_' + Date.now(),
      timestamp: Date.now(),
      type: 'RECHARGE',
      title: `Recarga Nivel ${tier.level} - ${tier.name}`,
      description: `Acreditación de ${tier.coins} Monedas Aether ($${tier.priceUSD} USD vía ${paymentMethod})`,
      amountCoins: tier.coins,
      amountUSD: tier.priceUSD,
      paymentMethod,
      status: 'COMPLETED',
      txHash,
      biometricVerified
    };

    // Instant balance update (no upper limit on coins)
    setCoins(prev => prev + tier.coins);
    if (!isDemoAccount) {
      setHasConfirmedRealDeposit(true);
    }
    setTransactions(prev => [newRecord, ...prev]);

    // Audio & celebratory confetti
    soundFx.playCoinChime();
    confetti({
      particleCount: tier.coins >= 200 ? 120 : 60,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Real push notification dispatched immediately!
    addNotification(
      '¡Recarga Exitosa Confirmada!',
      `Se han reflejado instantáneamente +${tier.coins} monedas en tu perfil con verificación E2EE (Hash: ${txHash.slice(0, 10)}...).`,
      'success',
      tier.coins
    );

    return newRecord;
  };

  const createLiveGatewayInvoice = async (params: {
    tier: CoinPackageTier;
    paymentMethod: PaymentMethodType;
    usdtNetwork: UsdtNetwork;
    gatewayProvider: string;
  }): Promise<{
    ok: boolean;
    order?: CoinPurchaseOrder;
    checkoutUrl?: string | null;
    isLiveApi?: boolean;
    gatewayNotice?: string;
    error?: string;
  }> => {
    const { tier, paymentMethod, usdtNetwork, gatewayProvider } = params;
    if (!authToken) {
      return {
        ok: false,
        error: 'Conecta tu cuenta (ej. tester01 o tu usuario real) en "Seguridad / Sesión" para generar la factura en el servidor.'
      };
    }

    try {
      const res = await fetch('/api/payments/create-gateway-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          tierLevel: tier.level,
          tierName: tier.name,
          coinsAmount: tier.coins,
          priceUSD: tier.priceUSD,
          paymentMethod,
          usdtNetwork,
          gatewayProvider
        })
      });
      const data = (await res.json().catch(() => ({}))) as {
        order?: CoinPurchaseOrder;
        checkoutUrl?: string | null;
        isLiveApi?: boolean;
        gatewayNotice?: string;
        error?: string;
      };
      if (!res.ok || !data.order) {
        return { ok: false, error: data.error || 'No se pudo generar la orden de pasarela.' };
      }

      logVmExperience({
        userEmail,
        category: 'PAYMENT_FLOW',
        gameName: gatewayProvider,
        severity: 'INFO',
        summary: `Factura creada #${data.order.id.slice(-6)} ($${tier.priceUSD} USD -> ${tier.coins} mo) vía ${gatewayProvider} [LiveAPI=${data.isLiveApi ? 'SI' : 'SANDBOX'}]`,
        details: { invoiceId: data.order.gatewayInvoiceId, wallet: data.order.destinationUsdtWallet }
      });

      return {
        ok: true,
        order: data.order,
        checkoutUrl: data.checkoutUrl || null,
        isLiveApi: data.isLiveApi,
        gatewayNotice: data.gatewayNotice
      };
    } catch {
      return { ok: false, error: 'Error de red contactando /api/payments/create-gateway-invoice.' };
    }
  };

  const capturePayPalOrder = useCallback(
    async (
      paypalOrderId: string,
      localOrderId?: string
    ): Promise<{ ok: boolean; message: string; updatedCoinsBalance?: number }> => {
      if (!authToken) {
        return { ok: false, message: 'Inicia sesión para acreditar la orden PayPal.' };
      }
      try {
        const res = await fetch('/api/payments/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ paypalOrderId, localOrderId })
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          error?: string;
          updatedCoinsBalance?: number;
          order?: CoinPurchaseOrder;
        };
        if (!res.ok || !data.ok) {
          const errMsg = data.error || 'No se pudo capturar la orden PayPal.';
          addNotification('PayPal Checkout', errMsg, 'security');
          return { ok: false, message: errMsg };
        }
        if (typeof data.updatedCoinsBalance === 'number') {
          setCoins(data.updatedCoinsBalance);
          try {
            localStorage.setItem(STORAGE_KEY_COINS, String(data.updatedCoinsBalance));
          } catch {
            // ignore
          }
        }
        setHasConfirmedRealDeposit(true);
        try {
          localStorage.setItem('aethervault_real_deposit_v1', 'true');
        } catch {
          // ignore
        }
        if (data.order) {
          const rec: TransactionRecord = {
            id: 'tx_pp_' + Date.now(),
            timestamp: Date.now(),
            type: 'RECHARGE',
            title: `Recarga PayPal: ${data.order.tierName} (+${data.order.coinsAmount} mo)`,
            description: `Orden PayPal capturada (${data.order.txHash || paypalOrderId}).`,
            amountCoins: data.order.coinsAmount,
            amountUSD: data.order.priceUSD,
            paymentMethod: 'paypal',
            status: 'COMPLETED',
            txHash: data.order.txHash || paypalOrderId,
            biometricVerified: true
          };
          setTransactions(prev => [rec, ...prev]);
        }
        soundFx.playWinFanfare();
        confetti({ particleCount: 90, spread: 75 });
        addNotification('Pago PayPal Acreditado', data.message || 'Monedas acreditadas.', 'reward', data.order?.coinsAmount);
        return { ok: true, message: data.message || 'Pago acreditado.', updatedCoinsBalance: data.updatedCoinsBalance };
      } catch {
        return { ok: false, message: 'Error de red capturando orden PayPal.' };
      }
    },
    [authToken, addNotification]
  );

  // Auto-detect PayPal redirect (?paypal_capture=1&token=<PAYPAL_ORDER_ID>) when returning from PayPal Checkout
  useEffect(() => {
    if (!authToken) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const isCapture = params.get('paypal_capture') === '1';
      const token = params.get('token');
      if (isCapture && token) {
        window.history.replaceState({}, document.title, window.location.pathname);
        void capturePayPalOrder(token);
      } else if (params.get('paypal_cancel') === '1') {
        window.history.replaceState({}, document.title, window.location.pathname);
        addNotification('PayPal Cancelado', 'El pago en PayPal fue cancelado por el usuario.', 'info');
      }
    } catch {
      // ignore
    }
  }, [authToken, capturePayPalOrder, addNotification]);

  // Direct USDT / Gateway Purchase Order Creation & Anti-Replay Verification
  const settleCoinPurchaseWithUsdt = async (params: {
    tier: CoinPackageTier;
    paymentMethod: PaymentMethodType;
    usdtNetwork: UsdtNetwork;
    txHash: string;
    biometricVerified: boolean;
    existingOrderId?: string;
    gatewayProvider?: string;
  }): Promise<{ ok: boolean; error?: string; record?: TransactionRecord; destinationWallet?: string }> => {
    const { tier, paymentMethod, usdtNetwork, txHash, biometricVerified, existingOrderId, gatewayProvider } = params;
    const cleanTx = txHash.trim();

    const destWallet =
      usdtNetwork === 'ERC20'
        ? payoutConfig.usdtErc20Address
        : usdtNetwork === 'BEP20'
        ? payoutConfig.usdtBep20Address || payoutConfig.usdtErc20Address
        : payoutConfig.usdtTrc20Address;

    if (authToken) {
      try {
        let targetOrderId = existingOrderId;
        let resolvedWallet = destWallet;

        if (!targetOrderId) {
          const createRes = await fetch('/api/payments/create-gateway-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({
              tierLevel: tier.level,
              tierName: tier.name,
              coinsAmount: tier.coins,
              priceUSD: tier.priceUSD,
              paymentMethod,
              usdtNetwork,
              gatewayProvider: gatewayProvider || (paymentMethod === 'crypto_usdt' ? 'DIRECT_USDT' : 'ONRAMP_CARD')
            })
          });
          const createData = (await createRes.json().catch(() => ({}))) as {
            order?: { id: string; destinationUsdtWallet: string };
            error?: string;
          };
          if (!createRes.ok || !createData.order) {
            return { ok: false, error: createData.error || 'No se pudo generar la orden en la bóveda USDT.' };
          }
          targetOrderId = createData.order.id;
          resolvedWallet = createData.order.destinationUsdtWallet;
        }

        const effectiveTx =
          cleanTx ||
          (paymentMethod !== 'crypto_usdt'
            ? `VM-TEST-${Date.now()}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
            : '');

        if (!effectiveTx) {
          return { ok: false, error: 'Ingresa el TXID / Hash de tu transferencia USDT.' };
        }

        const verifyRes = await fetch('/api/payments/verify-usdt-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            orderId: targetOrderId,
            txHash: effectiveTx
          })
        });
        const verifyData = (await verifyRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          updatedCoinsBalance?: number;
          order?: { destinationUsdtWallet: string; gatewayProvider?: string };
        };

        if (!verifyRes.ok || !verifyData.ok) {
          return {
            ok: false,
            error: verifyData.error || 'El servidor rechazó la verificación del pago.'
          };
        }

        const settledWallet = verifyData.order?.destinationUsdtWallet || resolvedWallet;
        const usedGateway = verifyData.order?.gatewayProvider || gatewayProvider || paymentMethod;
        const newRecord: TransactionRecord = {
          id: 'tx_usdt_' + Date.now(),
          timestamp: Date.now(),
          type: 'RECHARGE',
          title: `Compra (${usedGateway} / ${usdtNetwork}) - ${tier.name}`,
          description: `Liquidado a bóveda USDT (${settledWallet.slice(0, 12)}...): +${tier.coins} monedas ($${tier.priceUSD} USD vía ${usedGateway})`,
          amountCoins: tier.coins,
          amountUSD: tier.priceUSD,
          paymentMethod,
          status: 'SECURED',
          txHash: effectiveTx,
          biometricVerified
        };

        if (typeof verifyData.updatedCoinsBalance === 'number' && !isOwner && !isDemoAccount) {
          setCoins(verifyData.updatedCoinsBalance);
        } else {
          setCoins(prev => prev + tier.coins);
        }
        if (!isDemoAccount) {
          setHasConfirmedRealDeposit(true);
          try {
            localStorage.setItem('aethervault_real_deposit_v1', 'true');
          } catch {
            // ignore
          }
        }
        setTransactions(prev => [newRecord, ...prev]);

        soundFx.playCoinChime();
        confetti({
          particleCount: tier.coins >= 200 ? 120 : 60,
          spread: 70,
          origin: { y: 0.6 }
        });

        addNotification(
          `¡Depósito Liquidado (${usedGateway} → USDT ${usdtNetwork})!`,
          `+$${tier.priceUSD} USD liquidados hacia ${settledWallet.slice(0, 10)}... y +${tier.coins} monedas acreditadas.`,
          'success',
          tier.coins
        );

        logVmExperience({
          userEmail,
          category: 'PAYMENT_FLOW',
          gameName: 'STORE_USDT',
          severity: 'INFO',
          summary: `Compra real liquidada ($${tier.priceUSD} USD -> +${tier.coins} mo) vía ${usedGateway} hacia USDT ${usdtNetwork}`,
          details: { txHash: effectiveTx, wallet: settledWallet, orderId: targetOrderId }
        });

        return { ok: true, record: newRecord, destinationWallet: settledWallet };
      } catch {
        // Fallback below if offline
      }
    }

    // Fallback when running without backend token
    const record = await rechargeCoins(tier, paymentMethod, biometricVerified);
    return { ok: true, record, destinationWallet: destWallet };
  };

  // Execute a Provably Fair Casino Bet or Arena outcome
  const executeBet = async (
    game: 'Roulette' | 'Blackjack' | 'Poker' | 'Greyhounds' | 'Horses' | 'Arena' | 'Top50Casino',
    betAmount: number,
    winAmount: number,
    details: string
  ): Promise<{ won: boolean; net: number; round: ProvablyFairRound }> => {
    const net = winAmount - betAmount;
    const won = winAmount > 0;

    // Apply Luck stat modifier: If character has high luck, slight extra token bonus or chance
    let finalWin = winAmount;
    if (won && character.skills.luck > 1) {
      const luckBonusPercent = Math.min(character.skills.luck * 0.015, 0.25); // up to +25%
      const bonusCoins = Math.floor(winAmount * luckBonusPercent);
      if (bonusCoins > 0) {
        finalWin += bonusCoins;
      }
    }

    // Apply Happy Hour Payout Multiplier if active for this game and user
    const hh = isHappyHourActiveForGame(game);
    let happyHourBonus = 0;
    if (won && hh.active && hh.multiplier > 1.0) {
      happyHourBonus = Math.round(finalWin * (hh.multiplier - 1.0));
      finalWin += happyHourBonus;
    }

    const netChange = finalWin - betAmount;
    const projectedNextCoins = Math.max(0, coins + netChange);
    setCoins(prev => Math.max(0, prev + netChange));

    // Persist gameplay winnings/losses authoritatively to SQLite for real & tester accounts (never isolated DEMO)
    if (authToken && !isDemoAccount) {
      void fetch('/api/player/balance-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          coinsBalance: projectedNextCoins,
          reason: `${game}:${won ? 'WIN' : 'BET'}`
        })
      }).catch(() => {});
    }

    // Cryptographic round proof
    const serverSeed = generateRandomHex(32);
    const clientSeed = generateRandomHex(16);
    const nonce = provablyFairHistory.length + 1;
    const serverSeedHash = await sha256(serverSeed);
    const digest = await sha256(`${serverSeed}:${clientSeed}:${nonce}`);

    const roundProof: ProvablyFairRound = {
      id: 'round_' + Date.now(),
      game,
      timestamp: Date.now(),
      serverSeedHash,
      clientSeed,
      nonce,
      outcome: details + (won ? ` (Ganó ${finalWin} monedas${happyHourBonus > 0 ? ` [🔥 Hora Loca ${hh.multiplier}x: +${happyHourBonus} mo]` : ''})` : ' (No premiado)'),
      revealedServerSeed: serverSeed,
      verified: true
    };

    setProvablyFairHistory(prev => [roundProof, ...prev.slice(0, 49)]);

    // Update stats
    setCharacter(prev => ({
      ...prev,
      totalBets: prev.totalBets + 1,
      totalWon: won ? prev.totalWon + finalWin : prev.totalWon,
      victories: won ? prev.victories + 1 : prev.victories
    }));

    // Record transaction
    const tx: TransactionRecord = {
      id: 'tx_game_' + Date.now(),
      timestamp: Date.now(),
      type: won ? 'CASINO_WIN' : 'CASINO_BET',
      title: `${game}: ${won ? 'Ganancia' : 'Apuesta'}`,
      description: `${details}. Saldo neto: ${netChange >= 0 ? '+' : ''}${netChange} monedas`,
      amountCoins: netChange,
      status: 'SECURED',
      txHash: '0x' + digest,
      biometricVerified: false
    };
    setTransactions(prev => [tx, ...prev]);

    if (won) {
      if (happyHourBonus > 0) {
        addNotification(
          '🔥 ¡Multiplicador de Hora Loca!',
          `¡Has ganado +${happyHourBonus} monedas adicionales gracias al multiplicador de ${hh.multiplier}x!`,
          'reward',
          happyHourBonus
        );
      }
      if (finalWin >= betAmount * 3 || finalWin >= 200) {
        confetti({ particleCount: 80, spread: 60 });
        soundFx.playWinFanfare();
      } else {
        soundFx.playCoinChime();
      }
    }

    // Advance daily quest for game
    setDailyQuests(prev =>
      prev.map(q => {
        if (q.gameType === game && !q.completed) {
          const nextCount = q.currentCount + 1;
          const completed = nextCount >= q.targetCount;
          if (completed && !q.completed) {
            addNotification('¡Misión Diaria Completada!', `Has completado "${q.title}". ¡Reclama tus monedas en la Rueda Diaria!`, 'reward');
          }
          return { ...q, currentCount: nextCount, completed };
        }
        return q;
      })
    );

    logVmExperience({
      userEmail,
      category: 'GAME_ACTION',
      gameName: game,
      severity: 'INFO',
      summary: `${game}: apuesta ${betAmount} mo -> ${won ? `ganó ${finalWin} mo` : 'sin premio'} (${details.slice(0, 80)})`,
      details: { betAmount, finalWin, netChange, won }
    });

    return { won, net: netChange, round: roundProof };
  };

  const resetAllData = () => {
    setCoins(85);
    setCharacter(INITIAL_CHARACTER);
    setTransactions([]);
    setNotifications([]);
    setProvablyFairHistory([]);
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  };

  return (
    <GameContext.Provider
      value={{
        activeTab,
        setActiveTab,
        coins,
        character,
        transactions,
        notifications,
        activeToast,
        dismissToast,
        provablyFairHistory,
        biometrics,
        setBiometrics,
        isStoreOpen,
        setIsStoreOpen,
        selectedStoreTier,
        setSelectedStoreTier,
        isBiometricModalOpen,
        setIsBiometricModalOpen,
        isProvablyFairModalOpen,
        setIsProvablyFairModalOpen,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        userEmail,
        authToken,
        firebaseUser,
        firestoreSyncedBalance,
        isOwner,
        isDemoAccount,
        isRealAccountActive,
        loginUser,
        loginUserWithCredentials,
        registerUserWithEmail,
        loginOwnerWithKey,
        loginDemoUser,
        loginVmTester,
        resetDemoFunds,
        activateRealAccountWithDeposit,
        logoutUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        payoutConfig,
        gatewayAvailability,
        playerVisibility,
        refreshPlayerVisibility,
        updatePlayerVisibility,
        refreshPayoutConfigFromServer,
        updatePayoutConfig,
        adminWithdrawals,
        executeAdminWithdrawal,
        grossRevenueUSD,
        withdrawnUSD,
        availableBalanceUSD,
        totalCoinsSold,
        isAdminUnlocked,
        setIsAdminUnlocked,
        isRedemptionModalOpen,
        setIsRedemptionModalOpen,
        isLevelModalOpen,
        setIsLevelModalOpen,
        isDailyBonusModalOpen,
        setIsDailyBonusModalOpen,
        isLeaderboardModalOpen,
        setIsLeaderboardModalOpen,
        isReferralModalOpen,
        setIsReferralModalOpen,
        isChatWidgetOpen,
        setIsChatWidgetOpen,
        gameMode,
        setGameMode,
        vaultRetentionRate,
        playerPrizeRate,
        redemptionFeeRate,
        transferFeeRate,
        updateVaultMargins,
        vaultEconomics,
        directoryPlayers,
        transfersHistory,
        refreshTransfersAndDirectory,
        transferCoinsToPlayer,
        capturePayPalOrder,
        redemptionRequests,
        redeemableUsers,
        refreshRedemptionsFromServer,
        validateAndCreateAdminRedemption,
        syncRedemptionToFirestore,
        requestPlayerRedemption,
        approveRedemptionRequest,
        rejectRedemptionRequest,
        serverMetrics,
        playerSessions,
        totalPlayersCount,
        onlinePlayersCount,
        offlinePlayersCount,
        dailyQuests,
        claimQuestReward,
        claimDailySpinReward,
        lastDailySpinTime,
        redeemPromoCode,
        chatMessages,
        sendChatMessage,
        coinGifts,
        sendCoinsGift,
        adminAdjustUserCoins,
        happyHourCampaign,
        updateHappyHourCampaign,
        toggleHappyHour,
        isHappyHourActiveForGame,
        unlockNextHeroLevel,
        rechargeCoins,
        createLiveGatewayInvoice,
        settleCoinPurchaseWithUsdt,
        upgradeSkill,
        getSkillUpgradeCost,
        executeBet,
        addNotification,
        clearNotification,
        clearAllNotifications,
        isSupportPanelOpen,
        setIsSupportPanelOpen,
        isTransferModalOpen,
        setIsTransferModalOpen,
        supportTickets,
        createSupportTicket,
        replyToTicket,
        resolveSupportTicket,
        updateSupportTicketStatus,
        updateUserPassword,
        resolvePaymentByTxHash,
        resetAllData
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
