import { CoinPackageTier, PaymentMethodOption } from '../types';

export const COIN_TIERS: CoinPackageTier[] = [
  {
    level: 1,
    name: 'Paquete Iniciado',
    coins: 10,
    priceUSD: 10,
    bonusPercent: 0,
    badge: 'Nivel 1',
    color: 'from-slate-600 to-slate-800',
    features: [
      '10 Monedas Aether al instante',
      'Costo por moneda: $1.00 USD',
      'Desbloqueo de Habilidad Base',
      'Cifrado SSL de extremo a extremo'
    ]
  },
  {
    level: 2,
    name: 'Alijo del Recluta',
    coins: 25,
    priceUSD: 24,
    bonusPercent: 4,
    badge: 'Nivel 2',
    color: 'from-blue-700 to-slate-900',
    features: [
      '25 Monedas Aether (+1 bono)',
      'Costo por moneda: $0.96 USD',
      '1 Mejora de Habilidad Nivel 2',
      'Confirmación biométrica instantánea'
    ]
  },
  {
    level: 3,
    name: 'Cofre Explorador',
    coins: 50,
    priceUSD: 45,
    bonusPercent: 10,
    badge: 'Nivel 3',
    color: 'from-emerald-700 to-slate-900',
    features: [
      '50 Monedas Aether (+5 bono)',
      'Costo por moneda: $0.90 USD',
      'Desbloqueo de Torneo Casino Bronce',
      'Recibo digital firmado con HMAC'
    ]
  },
  {
    level: 4,
    name: 'Fuerza Guerrera',
    coins: 100,
    priceUSD: 85,
    bonusPercent: 15,
    badge: 'Nivel 4 · Popular',
    popular: true,
    color: 'from-teal-600 to-slate-900',
    features: [
      '100 Monedas Aether (+15 bono)',
      'Costo por moneda: $0.85 USD',
      'Acelerador de Fortuna +5% en Ruleta',
      'Verificación biométrica Touch/FaceID'
    ]
  },
  {
    level: 5,
    name: 'Tesoro del Paladín',
    coins: 250,
    priceUSD: 210,
    bonusPercent: 18,
    badge: 'Nivel 5',
    color: 'from-cyan-600 to-slate-900',
    features: [
      '250 Monedas Aether (+45 bono)',
      'Costo por moneda: $0.84 USD',
      'Acceso a Mesas VIP de Blackjack',
      'Hash SHA-256 inmutable de transacción'
    ]
  },
  {
    level: 6,
    name: 'Bóveda de Asalto',
    coins: 500,
    priceUSD: 410,
    bonusPercent: 20,
    badge: 'Nivel 6',
    color: 'from-indigo-600 to-slate-900',
    features: [
      '500 Monedas Aether (+100 bono)',
      'Costo por moneda: $0.82 USD',
      'Título de Héroe "Veterano Élite"',
      'Soporte prioritario de pagos globales'
    ]
  },
  {
    level: 7,
    name: 'Cámara del Soberano',
    coins: 1000,
    priceUSD: 800,
    bonusPercent: 25,
    badge: 'Nivel 7 · Destacado',
    popular: true,
    color: 'from-amber-600 to-slate-900',
    features: [
      '1,000 Monedas Aether (+250 bono)',
      'Costo por moneda: $0.80 USD (Tarifa $800 USD)',
      'Multiplicador de Casino +10% Suerte',
      'Token de autenticación de alta seguridad'
    ]
  },
  {
    level: 8,
    name: 'Relicario Mítico',
    coins: 2500,
    priceUSD: 1950,
    bonusPercent: 28,
    badge: 'Nivel 8 · Alto Valor',
    color: 'from-orange-600 to-slate-900',
    features: [
      '2,500 Monedas Aether (+700 bono)',
      'Costo por moneda: $0.78 USD',
      'Seguro de Pérdida en Casino 5%',
      'Cifrado militar E2EE dedicado'
    ]
  },
  {
    level: 9,
    name: 'Reserva Titánica',
    coins: 5000,
    priceUSD: 3800,
    bonusPercent: 30,
    badge: 'Nivel 9 · Gran Maestro',
    color: 'from-purple-600 to-slate-900',
    features: [
      '5,000 Monedas Aether (+1,500 bono)',
      'Costo por moneda: $0.76 USD',
      'Desbloqueo de Habilidad Legendaria',
      'Línea de liquidación instantánea VIP'
    ]
  },
  {
    level: 10,
    name: 'Bóveda Cósmica Suprema',
    coins: 10000,
    priceUSD: 7200,
    bonusPercent: 35,
    badge: 'Nivel 10 · Máximo 10k',
    popular: true,
    color: 'from-rose-600 to-amber-900',
    features: [
      '10,000 Monedas Aether (+3,500 bono)',
      'Costo por moneda: $0.72 USD (Mejor Escala)',
      'Estatus VIP Infinito & Aura Dorada',
      'Cifrado cuántico E2EE y Biometría Forzada'
    ]
  }
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'credit_card',
    name: 'Tarjeta de Crédito / Débito',
    provider: 'Visa, Mastercard, Amex, Diners',
    icon: 'credit-card',
    processingFee: '0% Comisión',
    speed: 'Inmediata'
  },
  {
    id: 'paypal',
    name: 'PayPal Global Express',
    provider: 'Balance PayPal, Cuenta Bancaria vinculada',
    icon: 'paypal',
    processingFee: '0% Comisión',
    speed: 'Inmediata'
  },
  {
    id: 'crypto_usdt',
    name: 'Criptoactivos (USDT / USDC)',
    provider: 'Tether TRC-20, ERC-20, Polygon',
    icon: 'coins',
    processingFee: 'Red 0.5%',
    speed: 'Inmediata (1 bloque)'
  },
  {
    id: 'apple_google_pay',
    name: 'Apple Pay & Google Pay',
    provider: 'Billeteras Digitales de 1-toque',
    icon: 'smartphone',
    processingFee: '0% Comisión',
    speed: 'Biométrica 1s'
  },
  {
    id: 'bank_wire',
    name: 'Transferencia Bancaria Internacional',
    provider: 'SWIFT, SEPA, ACH, SPEI',
    icon: 'building-2',
    processingFee: '0% Comisión',
    speed: 'Aprobación Inmediata'
  }
];
