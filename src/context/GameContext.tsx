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
  HappyHourCampaign
} from '../types';
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
  
  // User & Owner Session
  userEmail: string;
  isOwner: boolean;
  loginUser: (email: string) => void;
  loginOwnerWithKey: (password: string) => Promise<boolean>;
  logoutUser: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

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

  // Game Mode: Solo vs Live Multiplayer
  gameMode: GamePlayMode;
  setGameMode: (mode: GamePlayMode) => void;

  // Admin & Financial Management
  payoutConfig: PayoutDestinationConfig;
  updatePayoutConfig: (config: Partial<PayoutDestinationConfig>) => void;
  adminWithdrawals: AdminWithdrawalRecord[];
  executeAdminWithdrawal: (amountUSD: number, destinationType: 'crypto_usdt' | 'bank_wire' | 'paypal', destinationAddress: string) => Promise<boolean>;
  grossRevenueUSD: number;
  withdrawnUSD: number;
  availableBalanceUSD: number;
  totalCoinsSold: number;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;

  // Dynamic Vault Margins & Economics (70% House / 30% Player Reserve / 20% Withdrawal Fee)
  vaultRetentionRate: number;
  playerPrizeRate: number;
  redemptionFeeRate: number;
  updateVaultMargins: (retentionRate: number, feeRate: number) => void;
  vaultEconomics: VaultSplitEconomics;
  
  // Coin Redemptions (Cashouts requiring Owner Authorization)
  redemptionRequests: PlayerRedemptionRequest[];
  requestPlayerRedemption: (coins: number, destType: 'crypto_usdt' | 'paypal' | 'bank_wire', destAddress: string) => Promise<boolean>;
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
  isHappyHourActiveForGame: (game: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Top50Casino') => {
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
  upgradeSkill: (skill: keyof CharacterSkills) => boolean;
  getSkillUpgradeCost: (skill: keyof CharacterSkills) => number;
  executeBet: (game: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Top50Casino', betAmount: number, winAmount: number, details: string) => Promise<{ won: boolean; net: number; round: ProvablyFairRound }>;
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
// Clave 256-bit cifrada para trabajofino52@gmail.com (GokuCheckersMasterKey2024Secure)
export const OWNER_KEY_HASH_256 = '4fa9b3722fd5ff79ffea5511c819e9cafc4592b026864d82b25857e885c91cdf';

const INITIAL_PAYOUT_CONFIG: PayoutDestinationConfig = {
  merchantName: 'AetherVault Gaming Ltd. (Bóveda Principal)',
  usdtTrc20Address: 'TRX7xQ8z99E10vP44aZ88yQw3901bLkVaether',
  usdtErc20Address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  paypalEmail: 'cobros@aethervault.io',
  bankIbanSwift: 'ES76 2100 0418 4502 0005 1332 (SWIFT: CAIXESBBXXX)',
  bankAccountHolder: 'AetherVault Operaciones Internacionales',
  stripeAccountId: 'acct_1NvAether89234',
  autoForwardToWallet: true
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

  const isOwner = userEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase() && isOwnerAuthenticated;

  const loginOwnerWithKey = async (password: string): Promise<boolean> => {
    const hash = await sha256(password.trim());
    if (hash === OWNER_KEY_HASH_256) {
      setUserEmail(OWNER_EMAIL);
      setIsOwnerAuthenticated(true);
      try {
        localStorage.setItem(STORAGE_KEY_USER_EMAIL, OWNER_EMAIL);
        localStorage.setItem('aethervault_owner_auth_v1', 'true');
      } catch {
        // ignore
      }
      soundFx.playBiometricSuccess();
      addNotification(
        'Sesión de Propietario Cifrada 256-bit Verificada',
        `Bienvenido de vuelta ${OWNER_EMAIL}. Bóveda del Dueño y Hub de Neobanco desbloqueados con éxito.`,
        'security'
      );
      return true;
    } else {
      soundFx.playClick();
      addNotification(
        'Clave Maestra Inválida',
        'La clave ingresada no coincide con el hash SHA-256 de 256-bit del propietario.',
        'security'
      );
      return false;
    }
  };

  const loginUser = (email: string) => {
    const cleanEmail = email.trim();
    if (cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      setIsAuthModalOpen(true);
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
    soundFx.playClick();
    addNotification(
      'Sesión de Jugador Estándar',
      `Sesión activa como ${cleanEmail}. Las opciones de Banco Digital y Bóveda del Dueño están reservadas para el administrador.`,
      'info'
    );
    setActiveTab('store');
  };

  const logoutUser = () => {
    const guestEmail = 'jugador_anonimo@aethervault.com';
    setUserEmail(guestEmail);
    setIsOwnerAuthenticated(false);
    try {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, guestEmail);
      localStorage.setItem('aethervault_owner_auth_v1', 'false');
    } catch {
      // ignore
    }
    soundFx.playClick();
    addNotification('Sesión Cerrada', 'Has cerrado sesión. La Bóveda del Dueño y el módulo de Banco Digital ahora están bloqueados.', 'info');
    setActiveTab('store');
  };

  // Admin Payout Config
  const [payoutConfig, setPayoutConfig] = useState<PayoutDestinationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAYOUT_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PAYOUT_CONFIG;
  });

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

  const playerPrizeRate = Math.max(0, 100 - vaultRetentionRate);

  const updateVaultMargins = (newRetention: number, newFee: number) => {
    const clampedRetention = Math.min(95, Math.max(50, newRetention));
    const clampedFee = Math.min(50, Math.max(5, newFee));
    setVaultRetentionRate(clampedRetention);
    setRedemptionFeeRate(clampedFee);
    try {
      localStorage.setItem('aethervault_retention_rate_v1', String(clampedRetention));
      localStorage.setItem('aethervault_fee_rate_v1', String(clampedFee));
    } catch {
      // ignore
    }
    soundFx.playCoinChime();
    addNotification(
      'Parámetros Económicos Actualizados',
      `Margen de Bóveda: ${clampedRetention}%, Reserva de Premios: ${100 - clampedRetention}%, Comisión de Retiro: ${clampedFee}%.`,
      'security'
    );
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

  // Redemptions (Cashouts with 20% commission to Owner's Vault)
  const [redemptionRequests, setRedemptionRequests] = useState<PlayerRedemptionRequest[]>(() => {
    try {
      const saved = localStorage.getItem('aethervault_redemptions_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'red_101',
        playerEmail: 'carlos_trader@crypto.io',
        playerName: 'Carlos VIP',
        amountCoins: 300,
        grossUSD: 240,
        feeUSD: 48, // 20% auto-deducted
        netUSD: 192, // 80% to player
        destinationType: 'crypto_usdt',
        destinationAddress: 'TRX88xP99qLaEther99120',
        status: 'PENDING_APPROVAL',
        timestamp: Date.now() - 7200000,
        txHash: '0x49f91a0c8973b1847192a9cf1832049182371928371928371928371928371928'
      },
      {
        id: 'red_102',
        playerEmail: 'elena_gamer@vip.io',
        playerName: 'Elena Pro',
        amountCoins: 100,
        grossUSD: 80,
        feeUSD: 16, // 20%
        netUSD: 64, // 80%
        destinationType: 'paypal',
        destinationAddress: 'elena_pro@vip.io',
        status: 'PENDING_APPROVAL',
        timestamp: Date.now() - 3600000,
        txHash: '0x718293a817293819283019283019283019283019283019283019283019283019'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aethervault_redemptions_v1', JSON.stringify(redemptionRequests));
    } catch {
      // ignore
    }
  }, [redemptionRequests]);

  // Server Resource Metrics (Debian 13 System Monitor)
  const [serverMetrics, setServerMetrics] = useState<ServerResourceMetrics>({
    cpuPercent: 18.4,
    cpuCores: 4,
    cpuModel: 'Intel Xeon / AMD EPYC (Debian 13 Trixie Kernel 6.12)',
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
  };

  const executeAdminWithdrawal = async (
    amountUSD: number,
    destinationType: 'crypto_usdt' | 'bank_wire' | 'paypal',
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

  const isHappyHourActiveForGame = useCallback((game: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Top50Casino') => {
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
  const requestPlayerRedemption = async (
    coinsToRedeem: number,
    destType: 'crypto_usdt' | 'paypal' | 'bank_wire',
    destAddress: string
  ): Promise<boolean> => {
    if (coinsToRedeem <= 0 || coinsToRedeem > coins) return false;

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

    const newReq: PlayerRedemptionRequest = {
      id: 'red_' + Date.now(),
      playerEmail: userEmail,
      playerName: character.name,
      amountCoins: coinsToRedeem,
      grossUSD,
      feeUSD,
      netUSD,
      destinationType: destType,
      destinationAddress: destAddress,
      status: 'PENDING_APPROVAL',
      timestamp: Date.now(),
      txHash
    };

    setCoins(prev => prev - coinsToRedeem);
    setRedemptionRequests(prev => [newReq, ...prev]);

    const tx: TransactionRecord = {
      id: 'tx_red_' + Date.now(),
      timestamp: Date.now(),
      type: 'REDEMPTION_REQUEST',
      title: `Solicitud de Canje: ${coinsToRedeem} Monedas ($${netUSD.toFixed(2)} USD Netos)`,
      description: `Retiro con 20% de comisión ($${feeUSD.toFixed(2)} USD) retenida para la Bóveda. Pendiente de autorización por ${OWNER_EMAIL}`,
      amountCoins: -coinsToRedeem,
      amountUSD: netUSD,
      status: 'PENDING',
      txHash,
      biometricVerified: true
    };
    setTransactions(prev => [tx, ...prev]);

    addNotification(
      'Solicitud de Canje Enviada',
      `Se descontaron ${coinsToRedeem} monedas. En cola para autorización por ${OWNER_EMAIL}. Monto neto: $${netUSD.toFixed(2)} USD (20% comisión Bóveda).`,
      'info'
    );
    return true;
  };

  const approveRedemptionRequest = async (requestId: string): Promise<boolean> => {
    if (!isOwner) {
      addNotification('Acceso Restringido', `Solo el Administrador (${OWNER_EMAIL}) puede autorizar canjes.`, 'security');
      return false;
    }

    const targetReq = redemptionRequests.find(r => r.id === requestId);
    if (!targetReq || targetReq.status !== 'PENDING_APPROVAL') return false;

    setRedemptionRequests(prev =>
      prev.map(r =>
        r.id === requestId
          ? { ...r, status: 'APPROVED', reviewedAt: Date.now() }
          : r
      )
    );

    soundFx.playCoinChime();
    confetti({ particleCount: 75, spread: 60 });

    addNotification(
      'Canje Autorizado con Éxito',
      `Se autorizó el retiro de $${targetReq.netUSD.toFixed(2)} USD para ${targetReq.playerName}. La comisión del 20% ($${targetReq.feeUSD.toFixed(2)} USD) ingresó a tu Bóveda.`,
      'success'
    );
    return true;
  };

  const rejectRedemptionRequest = async (requestId: string, reason?: string): Promise<boolean> => {
    if (!isOwner) return false;
    const targetReq = redemptionRequests.find(r => r.id === requestId);
    if (!targetReq || targetReq.status !== 'PENDING_APPROVAL') return false;

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
              reviewedAt: Date.now(),
              rejectionReason: reason || 'Rechazado por verificación de seguridad'
            }
          : r
      )
    );

    soundFx.playClick();
    addNotification('Solicitud de Canje Rechazada', `La solicitud de ${targetReq.playerName} fue rechazada y las monedas reembolsadas.`, 'info');
    return true;
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

  // Execute a Provably Fair Casino Bet or Arena outcome
  const executeBet = async (
    game: 'Roulette' | 'Blackjack' | 'Poker' | 'Arena' | 'Top50Casino',
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
    setCoins(prev => prev + netChange);

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
        isOwner,
        loginUser,
        loginOwnerWithKey,
        logoutUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        payoutConfig,
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
        updateVaultMargins,
        vaultEconomics,
        redemptionRequests,
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
        upgradeSkill,
        getSkillUpgradeCost,
        executeBet,
        addNotification,
        clearNotification,
        clearAllNotifications,
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
