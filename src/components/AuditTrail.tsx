import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Lock,
  DollarSign,
  KeyRound,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CloudUpload,
  Filter,
  X,
  Eye,
  Database
} from 'lucide-react';
import { useGame, OWNER_EMAIL } from '../context/GameContext';
import { AuditTrailCategory, AuditTrailEntry, AuditTrailPageResponse } from '../types';
import {
  syncAuditTrailBatchToFirestore,
  subscribeToFirestoreAuditTrail
} from '../services/firestoreVaultService';
import { soundFx } from '../utils/audio';

type CategoryFilter = 'ALL' | AuditTrailCategory;
type SeverityFilter = 'ALL' | 'INFO' | 'WARN' | 'CRITICAL';

const CATEGORY_META: Record<
  AuditTrailCategory,
  { label: string; textClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  FINANCIAL: {
    label: 'Financiero',
    textClass: 'text-emerald-400',
    icon: DollarSign
  },
  API_CONFIG: {
    label: 'APIs & Bóveda',
    textClass: 'text-amber-400',
    icon: KeyRound
  },
  AUTHORIZATION: {
    label: 'Autorización',
    textClass: 'text-cyan-400',
    icon: UserCheck
  },
  SECURITY: {
    label: 'Seguridad',
    textClass: 'text-rose-400',
    icon: ShieldAlert
  }
};

const SEVERITY_META: Record<
  'INFO' | 'WARN' | 'CRITICAL',
  { label: string; textClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  INFO: { label: 'INFO', textClass: 'text-slate-300', icon: CheckCircle2 },
  WARN: { label: 'WARN', textClass: 'text-amber-400', icon: AlertTriangle },
  CRITICAL: { label: 'CRITICAL', textClass: 'text-rose-400', icon: XCircle }
};

export const AuditTrail: React.FC = () => {
  const { authToken, isOwner, firebaseUser, loginOwnerWithKey, addNotification } = useGame();

  // Filter & Pagination state
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [severity, setSeverity] = useState<SeverityFilter>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [dateFromStr, setDateFromStr] = useState<string>('');
  const [dateToStr, setDateToStr] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Data state
  const [data, setData] = useState<AuditTrailPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);

  // Integrity & Firestore sync state
  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState<boolean>(false);
  const [firestoreEntryIds, setFirestoreEntryIds] = useState<Set<string>>(new Set());

  // Fallback owner key unlock
  const [masterKeyInput, setMasterKeyInput] = useState<string>('');
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const isVerifiedAdminGoogle = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );

  // Debounce search text
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Subscribe to Firestore mirrored /audit_trail IDs when verified admin Google is signed in
  useEffect(() => {
    if (!isVerifiedAdminGoogle) return;
    const unsubscribe = subscribeToFirestoreAuditTrail(ids => {
      setFirestoreEntryIds(ids);
    });
    return () => unsubscribe();
  }, [isVerifiedAdminGoogle]);

  const dateFromMs = useMemo(() => {
    if (!dateFromStr) return undefined;
    const ms = new Date(`${dateFromStr}T00:00:00`).getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }, [dateFromStr]);

  const dateToMs = useMemo(() => {
    if (!dateToStr) return undefined;
    const ms = new Date(`${dateToStr}T23:59:59.999`).getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }, [dateToStr]);

  const fetchAuditTrail = useCallback(async () => {
    if (!authToken || !isOwner) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        category,
        severity
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateFromMs !== undefined) params.set('dateFrom', String(dateFromMs));
      if (dateToMs !== undefined) params.set('dateTo', String(dateToMs));

      const res = await fetch(`/api/admin/audit-trail?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const json = (await res.json()) as AuditTrailPageResponse & { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || 'No se pudo cargar la auditoría desde el servidor.');
        return;
      }
      setData(json);
      if (json.page !== page) {
        setPage(json.page);
      }
    } catch {
      setErrorMsg('Error de conexión con /api/admin/audit-trail.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, isOwner, page, pageSize, category, severity, debouncedSearch, dateFromMs, dateToMs]);

  useEffect(() => {
    if (authToken && isOwner) {
      void fetchAuditTrail();
    }
  }, [authToken, isOwner, fetchAuditTrail]);

  const handleVerifyIntegrity = async () => {
    if (!authToken) return;
    setIsVerifyingChain(true);
    try {
      const res = await fetch('/api/admin/verify-integrity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const json = await res.json();
      if (!res.ok) {
        addNotification('Error de Verificación', json.error || 'Fallo al verificar la cadena SHA-256.', 'security');
      } else {
        soundFx.playBiometricSuccess();
        addNotification(
          json.ok ? 'Cadena SHA-256 Verificada' : 'Inconsistencia Detectada',
          json.ok
            ? `Integridad criptográfica confirmada sobre ${json.integrity?.checkedRows || 0} registros inmutables.`
            : 'Se encontró una anomalía en la cadena de hashes.',
          json.ok ? 'success' : 'security'
        );
        await fetchAuditTrail();
      }
    } catch {
      addNotification('Error de Red', 'No se pudo contactar /api/admin/verify-integrity.', 'security');
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleSyncToFirestore = async () => {
    if (!isVerifiedAdminGoogle || !firebaseUser || !data || data.items.length === 0) return;
    setIsSyncingFirestore(true);
    try {
      const syncedCount = await syncAuditTrailBatchToFirestore({
        entries: data.items,
        ownerUser: firebaseUser
      });
      soundFx.playCoinChime();
      addNotification(
        'Auditoría Respaldada en Firestore',
        syncedCount > 0
          ? `Se replicaron ${syncedCount} eventos inmutables en la colección /audit_trail.`
          : 'Todos los eventos visibles en esta página ya estaban respaldados en Firestore.',
        'success'
      );
    } catch (err) {
      addNotification(
        'Error al Sincronizar',
        err instanceof Error ? err.message : 'No se pudo respaldar la página actual en Firestore.',
        'security'
      );
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleExportCsv = () => {
    if (!data || data.items.length === 0) return;
    const headers = [
      'seq',
      'id',
      'timestamp_iso',
      'category',
      'action',
      'severity',
      'actor_email',
      'ip_address',
      'details',
      'prev_hash',
      'row_hash'
    ];
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = data.items.map(item =>
      [
        item.seq,
        item.id,
        new Date(item.timestamp).toISOString(),
        item.category,
        item.action,
        item.severity,
        item.actor_email,
        item.ip_address,
        item.details,
        item.prev_hash,
        item.row_hash
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aethervault_audit_trail_p${data.page}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    soundFx.playClick();
  };

  const handleResetFilters = () => {
    setCategory('ALL');
    setSeverity('ALL');
    setSearchInput('');
    setDebouncedSearch('');
    setDateFromStr('');
    setDateToStr('');
    setPage(1);
    soundFx.playClick();
  };

  const handleUnlockOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKeyInput.trim()) return;
    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const ok = await loginOwnerWithKey(masterKeyInput.trim());
      if (!ok) {
        setUnlockError('Clave maestra incorrecta para el propietario.');
      } else {
        setMasterKeyInput('');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const hasActiveFilters =
    category !== 'ALL' ||
    severity !== 'ALL' ||
    debouncedSearch !== '' ||
    dateFromStr !== '' ||
    dateToStr !== '';

  const pageNumbers = useMemo(() => {
    if (!data) return [];
    const totalPages = data.totalPages;
    const current = data.page;
    const pages: Array<number | 'ellipsis'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push('ellipsis');
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }, [data]);

  // Owner Gate if token missing
  if (!isOwner || !authToken) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-slate-100">
              AuditTrail Exclusivo del Propietario ({OWNER_EMAIL})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inicia sesión con tu clave maestra del servidor para consultar la cadena inmutable de transacciones financieras, cambios de APIs y eventos de autorización.
            </p>
          </div>
        </div>
        <form onSubmit={handleUnlockOwner} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
          <input
            type="password"
            value={masterKeyInput}
            onChange={e => setMasterKeyInput(e.target.value)}
            placeholder="Clave maestra del propietario..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={isUnlocking}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors"
          >
            {isUnlocking ? 'Verificando...' : 'Desbloquear AuditTrail'}
          </button>
        </form>
        {unlockError && <p className="text-xs text-rose-400">{unlockError}</p>}
      </div>
    );
  }

  const counts = data?.categoryCounts ?? {
    ALL: 0,
    FINANCIAL: 0,
    API_CONFIG: 0,
    AUTHORIZATION: 0,
    SECURITY: 0
  };
  const integrity = data?.integrity;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Primary Controls */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>AuditTrail — Registro Inmutable del Propietario</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cada transacción financiera, modificación de claves API en bóveda y evento de autorización queda encadenado con SHA-256 para {OWNER_EMAIL}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchAuditTrail()}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={() => void handleVerifyIntegrity()}
              disabled={isVerifyingChain}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isVerifyingChain ? 'Verificando...' : 'Verificar SHA-256'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSyncToFirestore()}
              disabled={!isVerifiedAdminGoogle || isSyncingFirestore || !data || data.items.length === 0}
              title={
                isVerifiedAdminGoogle
                  ? 'Respaldar eventos visibles en /audit_trail de Firestore'
                  : 'Conecta tu cuenta Google verificada en VaultConfigPanel para respaldar en Firestore'
              }
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>{isSyncingFirestore ? 'Respaldando...' : 'Respaldar Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!data || data.items.length === 0}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Total Eventos</div>
            <div className="text-lg font-bold text-slate-100 font-mono tabular-nums mt-0.5">
              {counts.ALL.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span>Financieros</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {counts.FINANCIAL.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Cambios APIs</span>
            </div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              {counts.API_CONFIG.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-cyan-400" />
              <span>Autorizaciones</span>
            </div>
            <div className="text-lg font-bold text-cyan-400 font-mono tabular-nums mt-0.5">
              {counts.AUTHORIZATION.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Seguridad</span>
            </div>
            <div className="text-lg font-bold text-rose-400 font-mono tabular-nums mt-0.5">
              {counts.SECURITY.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Database className="w-3 h-3 text-slate-300" />
              <span>Cadena SHA-256</span>
            </div>
            <div
              className={`text-sm font-bold mt-1 flex items-center gap-1 ${
                integrity?.chainValid ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {integrity ? (
                integrity.chainValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-mono tabular-nums">INTACTA ({integrity.checkedRows})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>REVISAR CADENA</span>
                  </>
                )
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs + Multi-Filter Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL' as const, label: `Todas (${counts.ALL})` },
                { id: 'FINANCIAL' as const, label: `Financiero (${counts.FINANCIAL})` },
                { id: 'API_CONFIG' as const, label: `APIs & Bóveda (${counts.API_CONFIG})` },
                { id: 'AUTHORIZATION' as const, label: `Autorizaciones (${counts.AUTHORIZATION})` },
                { id: 'SECURITY' as const, label: `Seguridad (${counts.SECURITY})` }
              ]
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategory(tab.id);
                  setPage(1);
                  soundFx.playClick();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  category === tab.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[11px] text-slate-400 font-medium block">
                Buscar por actor, acción, IP, detalle o hash
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Ej. BTCPAY, trabajofino52, 127.0.0.1..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] text-slate-400 font-medium block">Severidad</label>
              <select
                value={severity}
                onChange={e => {
                  setSeverity(e.target.value as SeverityFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todas</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] text-slate-400 font-medium block">Desde</label>
              <input
                type="date"
                value={dateFromStr}
                onChange={e => {
                  setDateFromStr(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] text-slate-400 font-medium block">Hasta</label>
              <input
                type="date"
                value={dateToStr}
                onChange={e => {
                  setDateToStr(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-slate-400 font-medium block">Filas</label>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Limpiar todos los filtros"
                  className="mt-5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between gap-3">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => void fetchAuditTrail()}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Paginated Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/70">
                <th className="py-3 px-3 font-semibold">Seq</th>
                <th className="py-3 px-3 font-semibold">Fecha / Hora</th>
                <th className="py-3 px-3 font-semibold">Categoría</th>
                <th className="py-3 px-3 font-semibold">Evento</th>
                <th className="py-3 px-3 font-semibold">Actor / IP</th>
                <th className="py-3 px-3 font-semibold">Nivel</th>
                <th className="py-3 px-3 font-semibold">Detalle</th>
                <th className="py-3 px-3 font-semibold text-right">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading && !data ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-3">
                      <div className="h-3 w-8 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-28 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-20 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-36 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-32 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-12 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-48 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-3 w-20 bg-slate-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : data && data.items.length > 0 ? (
                data.items.map(entry => {
                  const catMeta = CATEGORY_META[entry.category];
                  const sevMeta = SEVERITY_META[entry.severity];
                  const CatIcon = catMeta.icon;
                  const SevIcon = sevMeta.icon;
                  const cleanDocId = entry.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
                  const isSynced = firestoreEntryIds.has(cleanDocId);
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(isSelected ? null : entry)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-900' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        #{entry.seq}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${catMeta.textClass}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{catMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-100 whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <div className="truncate max-w-[180px]" title={entry.actor_email}>
                          {entry.actor_email}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-slate-500">
                          {entry.ip_address}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${sevMeta.textClass}`}>
                          <SevIcon className="w-3 h-3" />
                          <span>{sevMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-[300px]">
                        <div className="truncate" title={entry.details}>
                          {entry.details}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[11px] text-slate-400">
                          <span>{entry.row_hash.slice(0, 12)}…</span>
                          {isSynced && (
                            <span title="Respaldado en Firestore">
                              <CloudUpload className="w-3 h-3 text-emerald-400" />
                            </span>
                          )}
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Filter className="w-6 h-6 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-300">
                        No hay registros que coincidan con los filtros seleccionados.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Entry Inspector */}
        {selectedEntry && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Inspector Criptográfico · Evento #{selectedEntry.seq}</span>
                <span className="font-mono text-slate-400">({selectedEntry.id})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-slate-400">Acción y Categoría</div>
                <div className="font-mono text-slate-100">
                  {selectedEntry.action} · {CATEGORY_META[selectedEntry.category].label} · {selectedEntry.severity}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400">Actor / Dirección IP / Fecha UTC</div>
                <div className="font-mono tabular-nums text-slate-200">
                  {selectedEntry.actor_email} · {selectedEntry.ip_address} ·{' '}
                  {new Date(selectedEntry.timestamp).toISOString()}
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <div className="text-slate-400">Detalle Completo</div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 break-words">
                  {selectedEntry.details}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400">Hash Anterior (prev_hash)</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                  {selectedEntry.prev_hash}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400">Hash Actual Encadenado (row_hash)</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all">
                  {selectedEntry.row_hash}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-400">
          <div className="font-mono tabular-nums">
            {data && data.total > 0 ? (
              <>
                Mostrando {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} de {data.total.toLocaleString()} registros
              </>
            ) : (
              '0 registros'
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.page <= 1 || isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {pageNumbers.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e_${idx}`} className="px-2 text-slate-500">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono tabular-nums border ${
                      data.page === item
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages || isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 disabled:opacity-40 flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
