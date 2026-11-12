import React, { useState } from 'react';
import { useGame, OWNER_EMAIL } from '../context/GameContext';
import {
  Building2,
  CreditCard,
  Coins,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Cpu,
  Lock,
  Landmark,
  FileText,
  DollarSign,
  ChevronRight,
  Zap,
  HelpCircle
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface PlatformDetails {
  id: string;
  name: string;
  category: 'baas_neobank' | 'global_gateway' | 'crypto_rails';
  tagline: string;
  bestFor: string;
  coverage: string;
  fees: string;
  features: string[];
  currencies: string;
  compliance: string;
  website: string;
  pros: string[];
  cons: string[];
  neobankReadinessScore: number; // 1-10
}

const PLATFORMS_DATA: PlatformDetails[] = [
  // CATEGORÍA 1: CORE BANKING & BANKING-AS-A-SERVICE (NEOBANCO DIGITAL)
  {
    id: 'swan',
    name: 'Swan (swan.io)',
    category: 'baas_neobank',
    tagline: 'Infraestructura BaaS europea para lanzar un neobanco en días con IBANs propios',
    bestFor: 'Neobanco digital europeo, emisión de cuentas IBAN multicanal y tarjetas Mastercard',
    coverage: 'Unión Europea (Francia, Alemania, España, Países Bajos y zona SEPA)',
    fees: 'Desde cuota mensual fija + ~0.10€ por transferencia SEPA + split de interchange',
    features: [
      'Emisión de cuentas con IBAN propio (ES, FR, DE, NL)',
      'Tarjetas Mastercard físicas y virtuales personalizables',
      'SEPA Instant (transferencias en menos de 10 segundos)',
      'Licencia EMI autorizada por el Banco de Francia (ACPR)',
      'Webhooks en tiempo real y APIs REST modernas'
    ],
    currencies: 'EUR (con soporte SEPA y transferencias internacionales SWIFT)',
    compliance: 'Regulado como Entidad de Dinero Electrónico (EMI). No necesitas licencia bancaria propia.',
    website: 'https://www.swan.io',
    pros: [
      'Permite operar como Neobanco de inmediato bajo su paraguas legal',
      'Marca blanca total en tarjetas y banca móvil',
      'Soporte directo de cuentas en España con IBAN ES'
    ],
    cons: ['Centrado principalmente en Europa / SEPA', 'Requiere verificación KYC/AML estricta de clientes'],
    neobankReadinessScore: 9.8
  },
  {
    id: 'unit',
    name: 'Unit (unit.co)',
    category: 'baas_neobank',
    tagline: 'Plataforma BaaS #1 en EE.UU. para crear bancos digitales y billeteras financieras',
    bestFor: 'Neobanco en dólares (USD), cuentas comerciales aseguradas por FDIC y tarjetas Visa',
    coverage: 'Estados Unidos y clientes globales con entidad en EE.UU.',
    fees: 'SaaS mensual + microcomisiones por ACH, Wire y tarjetas (ingresos compartidos de interchange)',
    features: [
      'Cuentas corrientes aseguradas por FDIC hasta $250,000 USD (vía bancos socios)',
      'Emisión de tarjetas de débito físicas y virtuales (Apple Pay / Google Pay)',
      'Transferencias ACH instantáneas, FedNow y Wires internacionales',
      'Módulo de préstamos, adelanto de ingresos y microcréditos integrados',
      'SDKs oficiales para Node.js, Python y React Native'
    ],
    currencies: 'USD (dólar estadounidense)',
    compliance: 'Asociado con bancos comunitarios regulados por OCC y FDIC.',
    website: 'https://www.unit.co',
    pros: [
      'La API más limpia y rápida de implementar en el mercado estadounidense',
      'Permite ganar ingresos pasivos por el intercambio de cada compra con tarjeta',
      'Solución integral para banca corporativa o de consumidores'
    ],
    cons: ['Requiere establecer una entidad corporativa en EE.UU. (LLC o C-Corp)'],
    neobankReadinessScore: 9.6
  },
  {
    id: 'solaris',
    name: 'Solaris SE (solarisbank.com)',
    category: 'baas_neobank',
    tagline: 'El primer banco BaaS con licencia bancaria completa de Alemania (BaFin)',
    bestFor: 'Bancos digitales que requieran depósitos protegidos, préstamos y criptocuentas institucionales',
    coverage: 'Unión Europea y Reino Unido',
    fees: 'Estructura empresarial basada en volumen y servicios contratados',
    features: [
      'Licencia bancaria plena europea (Fondo de Garantía de Depósitos hasta 100.000€)',
      'Cuentas bancarias de crédito y débito completas',
      'Solaris Digital Assets: custodia y compra/venta de criptoactivos integrada',
      'Motor de scoring crediticio y financiamiento BNPL (Buy Now Pay Later)',
      'KYC y Video-Identificación automatizada por IA'
    ],
    currencies: 'EUR, GBP, USD',
    compliance: 'Supervisado por BaFin y Banco Central Europeo (BCE).',
    website: 'https://www.solarisgroup.com',
    pros: [
      'Máxima credibilidad institucional al contar con licencia bancaria total',
      'Capacidad de ofrecer productos de ahorro y crédito regulados',
      'Módulo cripto nativo regulado'
    ],
    cons: ['Costos de incorporación y auditoría más elevados que startups BaaS ligeras'],
    neobankReadinessScore: 9.4
  },
  {
    id: 'modulr',
    name: 'Modulr Finance (modulrfinance.com)',
    category: 'baas_neobank',
    tagline: 'Especialista en cuentas virtuales masivas y pagos instantáneos para fintechs',
    bestFor: 'Billeteras digitales, pagos masivos automatizados y conciliación contable en tiempo real',
    coverage: 'Reino Unido y Europa (FCA y Banco Central de Irlanda)',
    fees: 'Tarifas transaccionales competitivas por lote y cuenta virtual',
    features: [
      'Cuentas virtuales ilimitadas generadas al vuelo para cada usuario',
      'Acceso directo a Faster Payments (UK) y SEPA Instant (Europa)',
      'Emisión de tarjetas Visa personalizadas',
      'Motor de reglas para conciliación y retención de fondos automatizada',
      'Conexión nativa con sistemas contables y ERP'
    ],
    currencies: 'GBP, EUR, USD',
    compliance: 'Entidad de Dinero Electrónico (EMI) regulada por la FCA en UK y CBI en la UE.',
    website: 'https://www.modulrfinance.com',
    pros: [
      'Velocidad de procesamiento extrema para pagos masivos',
      'Ideal para retiros instantáneos de plataformas gaming y de inversión',
      'Cuentas seguras segregadas'
    ],
    cons: ['Enfocado principalmente en B2B2C y flujos de cuentas virtuales'],
    neobankReadinessScore: 9.0
  },
  {
    id: 'mambu',
    name: 'Mambu (mambu.com)',
    category: 'baas_neobank',
    tagline: 'El motor Core Banking SaaS en la nube más utilizado por los grandes neobancos del mundo',
    bestFor: 'Arquitectura de Core Bancario independiente para liderar un banco digital escalable a millones de usuarios',
    coverage: 'Global (América Latina, Norteamérica, Europa, Asia-Pacífico)',
    fees: 'Licenciamiento SaaS empresarial basado en cuentas activas',
    features: [
      'Libro mayor (General Ledger) multimoneda de alta concurrencia',
      'Motor de productos de ahorro, cuentas a la vista y depósitos a plazo',
      'Gestión de cartera de créditos y cálculo dinámico de intereses',
      'Composability: se conecta con cualquier procesador de pagos, KYC y pasarela',
      'Utilizado por neobancos globales como N26, Western Union y Santander'
    ],
    currencies: 'Multidivisa nativo (soporta cualquier moneda fiat y tokens contables)',
    compliance: 'Certificaciones bancarias globales ISO 27001, SOC 1 & 2.',
    website: 'https://www.mambu.com',
    pros: [
      'Independencia total: no estás atado a un solo banco proveedor',
      'Escalabilidad infinita para manejar millones de transacciones por segundo',
      'Excelente soporte para regulaciones bancarias de toda Latinoamérica'
    ],
    cons: ['Requiere un equipo de ingeniería para integrarlo con bancos custodios locales'],
    neobankReadinessScore: 9.7
  },

  // CATEGORÍA 2: PASARELAS DE COBRO GLOBAL & ORQUESTACIÓN DE PAGOS
  {
    id: 'stripe',
    name: 'Stripe Connect & Treasury (stripe.com)',
    category: 'global_gateway',
    tagline: 'El estándar mundial en cobros online, cuentas embebidas y orquestación fintech',
    bestFor: 'Recaudación global con tarjetas, monederos Apple/Google Pay y cuentas virtuales',
    coverage: 'Más de 46 países con aceptación de tarjetas de más de 195 países',
    fees: '2.9% + $0.30 por transacción con tarjeta (descuentos por volumen)',
    features: [
      'Aceptación de tarjetas de crédito/débito, transferencias y monederos digitales',
      'Stripe Radar: detección de fraude con Machine Learning de clase mundial',
      'Stripe Connect: manejo de cuentas para usuarios con retenciones y splits (como tu 70/30)',
      'Stripe Treasury: funcionalidad para embeber cuentas bancarias en tu propia app',
      'Stripe Issuing: creación de tarjetas de débito físicas y virtuales'
    ],
    currencies: 'Más de 135 divisas con conversión automática',
    compliance: 'PCI-DSS Nivel 1, certificado en todas las jurisdicciones financieras principales.',
    website: 'https://stripe.com',
    pros: [
      'La documentación técnica y SDKs más reconocidos del mundo',
      'Soporte nativo para tu modelo de negocio de cobros y dispersión',
      'Facilidad de integración en tu stack Node.js / React'
    ],
    cons: ['Ciertas actividades de juego o high-risk pueden requerir aprobación especial o cuenta comercial separada'],
    neobankReadinessScore: 8.8
  },
  {
    id: 'adyen',
    name: 'Adyen (adyen.com)',
    category: 'global_gateway',
    tagline: 'Infraestructura de pagos corporativa de clase global con licencia bancaria directa',
    bestFor: 'Grandes volúmenes, tasas de aprobación líderes en la industria y menores comisiones de adquirencia',
    coverage: 'Global (Europa, Norteamérica, Latinoamérica, Asia)',
    fees: 'Tarifa de intercambio Interchange++ (~0.6% a 1.2% + tarifa fija por transacción)',
    features: [
      'Adquirencia directa en las redes Visa y Mastercard sin intermediarios',
      'Aceptación de cientos de métodos de pago locales globales',
      'Licencia bancaria europea propia que reduce costos de liquidación',
      'Módulo de emisión de tarjetas y cuentas para plataformas',
      'Procesamiento unificado online, móvil y puntos de venta físicos'
    ],
    currencies: 'Prácticamente todas las divisas comerciales del mundo',
    compliance: 'Banco regulado en la UE por el Banco Central Neerlandés (DNB).',
    website: 'https://www.adyen.com',
    pros: [
      'Comisiones significativamente más bajas que Stripe a volúmenes altos',
      'Máxima tasa de aprobación de tarjetas internacionales sin rechazos falsos',
      'Usado por gigantes como Spotify, Uber y Microsoft'
    ],
    cons: ['Dirigido a empresas con tracción y volumen mensual establecido'],
    neobankReadinessScore: 8.9
  },
  {
    id: 'dlocal',
    name: 'dLocal (dlocal.com)',
    category: 'global_gateway',
    tagline: 'Líder mundial en pagos transfronterizos para mercados emergentes y Latinoamérica',
    bestFor: 'Cobrar en moneda local en LatAm (PIX, OXXO, SPEI, PSE) y liquidar en USD/EUR a tu cuenta',
    coverage: 'Más de 40 países (México, Brasil, Colombia, Argentina, Chile, Perú, etc.)',
    fees: 'Comisiones locales competitivas según el método de pago',
    features: [
      'One dLocal: una sola API para acceder a más de 900 métodos locales',
      'Cobros masivos (Payins) y pagos inmediatos a jugadores/usuarios (Payouts)',
      'PIX instantáneo en Brasil y SPEI en tiempo real en México',
      'Conversión de divisas sin riesgo cambiario: cobras en pesos y recibes USD',
      'Especializado en plataformas digitales, gaming y comercio transfronterizo'
    ],
    currencies: 'Todas las monedas locales de Latinoamérica + USD y EUR',
    compliance: 'Registrado y autorizado en cada país local y cotiza en NASDAQ (DLO).',
    website: 'https://www.dlocal.com',
    pros: [
      'La mejor pasarela si tu público objetivo está en América Latina',
      'Permite a tus usuarios pagar con métodos en efectivo, transferencias bancarias o tarjetas nacionales',
      'Admite modelos de entretenimiento digital con excelente soporte'
    ],
    cons: ['Enfocado principalmente en cobros y dispersiones más que en cuentas de depósito'],
    neobankReadinessScore: 8.2
  },
  {
    id: 'kushki',
    name: 'Kushki (kushkipagos.com)',
    category: 'global_gateway',
    tagline: 'La pasarela y adquirente regional directo para toda América Latina',
    bestFor: 'Procesamiento de pagos con tarjetas de débito/crédito locales y transferencias en LatAm',
    coverage: 'México, Colombia, Chile, Perú, Ecuador y Centroamérica',
    fees: 'Tarifas transparentes regionales (~2.5% a 3.5% según país)',
    features: [
      'Conexión directa a las redes bancarias locales como adquirente no bancario',
      'Módulo de suscripciones y pagos recurrentes de alta tolerancia a fallos',
      'Smart Routing para reintentar transacciones y maximizar aprobaciones',
      'Cumplimiento PCI-DSS Nivel 1'
    ],
    currencies: 'MXN, COP, CLP, PEN, USD',
    compliance: 'Regulado y auditado en toda la región andina y México.',
    website: 'https://www.kushkipagos.com',
    pros: [
      'Soporte técnico y comercial 100% en español',
      'Excelente integración con transferencias interbancarias locales',
      'Aprobaciones directas sin intermediarios extranjeros'
    ],
    cons: ['Menor cobertura en mercados fuera de Latinoamérica'],
    neobankReadinessScore: 7.9
  },

  // CATEGORÍA 3: RAILS CRIPTO, STABLECOINS Y LIQUIDEZ USDT/USDC (ON/OFF RAMPS)
  {
    id: 'binance_pay',
    name: 'Binance Pay & Connect',
    category: 'crypto_rails',
    tagline: 'Cobros cripto instantáneos con 0 gas y conversión directa a USDT / Fiat',
    bestFor: 'Recibir pagos de millones de usuarios de Binance con confirmación en 1 segundo y comisiones casi nulas',
    coverage: 'Global (más de 180 países)',
    fees: '0% a 0.5% por transacción comercial (una de las más bajas del mundo)',
    features: [
      'Pagos por código QR, enlace directo o API Webhook para tu servidor',
      'Soporte nativo para USDT, BTC, ETH y más de 70 criptomonedas',
      'Liquidación automática en USDT a tu billetera corporativa o cuenta bancaria',
      'Sin riesgo de contracargos ni reversión de pagos (irreversibilidad cripto)',
      'Subcuentas API para gestionar pagos por usuario'
    ],
    currencies: 'USDT, USDC, BTC, ETH, EUR, BRL y más',
    compliance: 'Licencias VASP en múltiples jurisdicciones (Francia, España, Dubái, etc.).',
    website: 'https://merchant.binance.com',
    pros: [
      'Comisiones extremadamente bajas frente al 3% tradicional de tarjetas',
      'Liquidación instantánea sin retenciones bancarias de 48 horas',
      'Ideal para tu sistema actual de monedas y retiros de la bóveda'
    ],
    cons: ['Los usuarios finales deben contar con cuenta de cripto o Binance'],
    neobankReadinessScore: 8.5
  },
  {
    id: 'coinbase_commerce',
    name: 'Coinbase Commerce (commerce.coinbase.com)',
    category: 'crypto_rails',
    tagline: 'Infraestructura institucional regulada en EE.UU. para cobros en USDC y Cripto',
    bestFor: 'Pasarela cripto institucional con máxima reputación regulatoria y respaldo de Wall Street',
    coverage: 'Global',
    fees: '1% tarifa plana por transacción comercial',
    features: [
      'Cobros automáticos en USDC en redes de alta velocidad (Base, Polygon, Ethereum)',
      'API REST empresarial con webhooks protegidos con firma HMAC',
      'Conversión automática de cripto a USD sin volatilidad',
      'Informes contables auditados para declaraciones fiscales y contabilidad oficial'
    ],
    currencies: 'USDC, USDT, BTC, ETH, SOL y más',
    compliance: 'Registrado ante FinCEN en EE.UU., cotiza en NASDAQ (COIN).',
    website: 'https://commerce.coinbase.com',
    pros: [
      'Máximo estándar de cumplimiento regulatorio para un futuro banco digital',
      'USDC respaldado 1:1 por dólares en bancos estadounidenses auditados',
      'Sin riesgo de bloqueo de fondos por bancos tradicionales'
    ],
    cons: ['Comisión del 1% superior a pasarelas directas sin custodia'],
    neobankReadinessScore: 9.1
  },
  {
    id: 'nowpayments',
    name: 'NOWPayments (nowpayments.io)',
    category: 'crypto_rails',
    tagline: 'Pasarela no custodial para recibir USDT TRC20, ERC20 y más de 160 activos',
    bestFor: 'Procesar pagos en USDT (red Tron de bajo costo) con depósito directo a tu propia billetera',
    coverage: 'Global sin restricciones geográficas',
    fees: 'Desde 0.4% por transacción',
    features: [
      'Depósitos directos sin custodia a tus billeteras configuradas en AetherVault',
      'Autoconversión a USDT TRC20 para evitar volatilidad',
      'Botón de pago, facturas automáticas y API de pagos recurrentes',
      'Soporte completo de la red TRON (TRC20) que configuraste en tu panel de control'
    ],
    currencies: 'USDT (TRC20/ERC20/Polygon), USDC, BTC, LTC y 160+ tokens',
    compliance: 'Servicio técnico no custodial compatible con soberanía de fondos.',
    website: 'https://nowpayments.io',
    pros: [
      'Se conecta directamente con las billeteras TRC20 y ERC20 de tu Bóveda del Dueño',
      'Comisiones de red TRON de menos de $1 USD por transferencia',
      'No requiere pasar por procesos burocráticos bancarios'
    ],
    cons: ['No ofrece emisión de cuentas bancarias fiat ni tarjetas de débito'],
    neobankReadinessScore: 8.0
  }
];

export const PaymentPlatformsGuide: React.FC = () => {
  const { isOwner, userEmail, setActiveTab, payoutConfig } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'baas_neobank' | 'global_gateway' | 'crypto_rails'>('all');
  const [activePlatformModal, setActivePlatformModal] = useState<PlatformDetails | null>(null);

  const filteredPlatforms = selectedCategory === 'all'
    ? PLATFORMS_DATA
    : PLATFORMS_DATA.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-300">
      
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 p-8 sm:p-12 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30">
              Asesoría Estratégica FinTech & Neobanco
            </span>
            <span className="text-xs text-amber-300 font-mono bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              Hoja de Ruta para Banco Digital
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-100 font-display tracking-tight leading-[1.15]">
            Top 10+ Plataformas de Pagos & Arquitectura para Fundar tu Neobanco Digital
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Hemos analizado y seleccionado las mejores plataformas tecnológicas globales clasificadas en tres niveles: 
            <strong> Banking-as-a-Service (BaaS)</strong> para emitir IBANs y tarjetas de débito, <strong>Pasarelas Globales de Cobro</strong> (tarjetas y pagos locales en Latinoamérica) y <strong>Rails Cripto/USDT</strong> de alta liquidez para conectar con tu servidor Debian 13.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              11 Plataformas Auditadas
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Cumplimiento Regulatorio EMI / FDIC / BaFin
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Coins className="w-4 h-4 text-amber-400" />
              Compatible con tu Bóveda 70/30 y USDT TRC20
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step Strategic Roadmap for Launching the Digital Bank */}
      <section className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Hoja de Ruta Paso a Paso: De Plataforma Gaming a Banco Digital Regulado
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Estrategia pragmática para escalar tu negocio en 4 fases sin gastar millones en licencias iniciales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Phase 1 */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                FASE 1 (Actual)
              </span>
              <span className="text-xs text-slate-500 font-mono">Mes 1-3</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">Bóveda Cripto & Pasarela Híbrida</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cobros inmediatos con <strong>USDT TRC20/ERC20 (NOWPayments / Binance Pay)</strong> + PayPal/Stripe para recargas. Retención matemática del 70% en tu servidor Debian 13 con retiros autorizados manualmente.
            </p>
            <div className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
              <span>Riesgo Regulatorio: Mínimo</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                FASE 2 (Expansión)
              </span>
              <span className="text-xs text-slate-500 font-mono">Mes 4-8</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">Constitución & Pagos Locales</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Constituir una sociedad mercantil (ej. LLC en Delaware/Wyoming o S.L. en Europa) y activar <strong>dLocal / Kushki</strong> para recibir pagos en moneda local (PIX, SPEI, PSE) sin fricción en Latinoamérica.
            </p>
            <div className="text-[11px] text-cyan-300 font-mono flex items-center gap-1">
              <span>Volumen: $50K - $250K / mes</span>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-indigo-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                FASE 3 (Neobanco BaaS)
              </span>
              <span className="text-xs text-slate-500 font-mono">Mes 9-18</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">Emisión de Cuentas IBAN & Tarjetas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integrar <strong>Swan (Europa) o Unit (EE.UU.)</strong>. Cada usuario registrado en tu app recibe una <strong>cuenta con IBAN propio</strong> y una <strong>tarjeta de débito Mastercard</strong> para gastar sus ganancias en cualquier comercio.
            </p>
            <div className="text-[11px] text-indigo-300 font-mono flex items-center gap-1">
              <span>Modelo: Neobanco como Servicio</span>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                FASE 4 (Madurez)
              </span>
              <span className="text-xs text-slate-500 font-mono">Año 2+</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">Core Bancario & Licencia EMI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Implementar <strong>Mambu o Solaris</strong> como Core Banking independiente. Tramitar licencia propia de Entidad de Dinero Electrónico (EMI) o FinTech regulada, captando depósitos y ofreciendo microcréditos.
            </p>
            <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1">
              <span>Estatus: Institución Financiera</span>
            </div>
          </div>

        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setSelectedCategory('all');
              soundFx.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas las Plataformas ({PLATFORMS_DATA.length})
          </button>

          <button
            onClick={() => {
              setSelectedCategory('baas_neobank');
              soundFx.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'baas_neobank'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Neobanco BaaS & Core (5)</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('global_gateway');
              soundFx.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'global_gateway'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pasarelas Fiat & LatAm (4)</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('crypto_rails');
              soundFx.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'crypto_rails'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Rails Cripto & USDT (3)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Mostrando {filteredPlatforms.length} opciones recomendadas
        </div>
      </div>

      {/* Grid of Platforms Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlatforms.map(platform => {
          const isBaaS = platform.category === 'baas_neobank';
          const isCrypto = platform.category === 'crypto_rails';

          return (
            <div
              key={platform.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-slate-950/40 group relative overflow-hidden"
            >
              <div className="space-y-4">
                
                {/* Header card row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                        isBaaS
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : isCrypto
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isBaaS ? 'BaaS · Banco Digital' : isCrypto ? 'Rails Cripto · USDT' : 'Pasarela Global'}
                    </span>
                    <h3 className="text-lg font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                      {platform.name}
                    </h3>
                  </div>

                  {/* Readiness badge */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-400">
                      ★ {platform.neobankReadinessScore}/10
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Aptitud Neobanco</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {platform.tagline}
                </p>

                {/* Specifics snippet */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono-numbers">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Ideal para:</span>
                    <span className="text-slate-200 font-sans text-right truncate max-w-[180px] font-semibold">
                      {platform.bestFor.slice(0, 30)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Comisiones:</span>
                    <span className="text-amber-300 font-bold">{platform.fees.slice(0, 32)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px]">Cobertura:</span>
                    <span className="text-cyan-300 truncate max-w-[180px]">{platform.coverage.slice(0, 32)}...</span>
                  </div>
                </div>

                {/* Key features bullets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Puntos Fuertes:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {platform.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setActivePlatformModal(platform);
                    soundFx.playClick();
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Ficha Técnica</span>
                </button>

                <a
                  href={platform.website}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-700/80 text-cyan-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>Visitar Web</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          );
        })}
      </div>

      {/* Comparison Matrix Table */}
      <section className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Matriz Comparativa Directa para el Proyecto de Banco Digital
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resumen técnico de capacidades bancarias, soporte de tarjetas y regulación
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans divide-y divide-slate-800">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-3">Plataforma</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Emisión IBAN/Cuentas</th>
                <th className="py-3 px-3">Emisión Tarjetas Débito</th>
                <th className="py-3 px-3">Soporte LatAm</th>
                <th className="py-3 px-3">Regulación / Licencia</th>
                <th className="py-3 px-3 text-right">Aptitud Neobanco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
              {PLATFORMS_DATA.map(p => (
                <tr key={p.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-200">
                    <div className="font-sans text-xs">{p.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{p.website.replace('https://', '')}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {p.category === 'baas_neobank' ? 'Core BaaS' : p.category === 'crypto_rails' ? 'Cripto' : 'Pasarela Fiat'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {p.category === 'baas_neobank' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sí (Virtual & Real)
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans text-[11px]">No directo</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {p.id === 'swan' || p.id === 'unit' || p.id === 'solaris' || p.id === 'modulr' || p.id === 'stripe' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mastercard / Visa
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans text-[11px]">Vía partner</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {p.id === 'dlocal' || p.id === 'kushki' || p.id === 'mambu' || p.id === 'binance_pay' ? (
                      <span className="text-cyan-400 font-bold font-sans text-[11px]">Excelente (PIX, SPEI, PSE)</span>
                    ) : (
                      <span className="text-slate-400 font-sans text-[11px]">Global / Secundario</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-300 font-sans text-[11px] truncate max-w-[160px] block" title={p.compliance}>
                      {p.compliance.slice(0, 30)}...
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-amber-400">
                    ★ {p.neobankReadinessScore} / 10
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Owner Integration Advice Callout */}
      {isOwner && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/50 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <span>👑 Recomendación Directa para el Propietario ({OWNER_EMAIL})</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Para tu plataforma actual montada en <strong>Debian 13</strong>, la combinación ganadora inmediata es:
            <br />
            1. <strong>NOWPayments / Binance Pay</strong> para recibir USDT (TRC-20) sin fricción bancaria y con 0% de contracargos directo a tu billetera configurada.
            <br />
            2. <strong>dLocal</strong> si tienes clientes en Colombia, México, Perú o Argentina para que te paguen en efectivo o transferencias locales.
            <br />
            3. Cuando estés listo para registrar la marca bancaria, abre cuenta comercial con <strong>Swan (en Europa) o Unit (en EE.UU.)</strong> para activar la emisión de IBANs y tarjetas de débito AetherVault para tus usuarios.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {activePlatformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  Ficha Técnica Exhaustiva
                </span>
                <h3 className="text-2xl font-black text-slate-100 font-display">
                  {activePlatformModal.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {activePlatformModal.tagline}
                </p>
              </div>

              <button
                onClick={() => setActivePlatformModal(null)}
                className="p-2 text-slate-400 hover:text-slate-100 rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-numbers">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cobertura Territorial</span>
                <span className="text-slate-200 font-medium font-sans">{activePlatformModal.coverage}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Estructura de Comisiones</span>
                <span className="text-amber-300 font-bold font-sans">{activePlatformModal.fees}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Divisas Soportadas</span>
                <span className="text-cyan-300 font-bold font-sans">{activePlatformModal.currencies}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Regulación & Licencias</span>
                <span className="text-slate-200 font-sans">{activePlatformModal.compliance}</span>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs">
                <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ventajas Clave
                </h4>
                <ul className="space-y-1.5 text-slate-300">
                  {activePlatformModal.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-500" /> A Tener en Cuenta
                </h4>
                <ul className="space-y-1.5 text-slate-400">
                  {activePlatformModal.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                Puntaje Neobanco: <strong className="text-emerald-400 text-sm">★ {activePlatformModal.neobankReadinessScore}/10</strong>
              </div>

              <a
                href={activePlatformModal.website}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <span>Acceder a la Documentación Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
