export type TelemetryCategory =
  | 'GAME_ACTION'
  | 'PAYMENT_FLOW'
  | 'AUTH_EVENT'
  | 'UI_ERROR'
  | 'API_ERROR'
  | 'USER_FEEDBACK'
  | 'SYSTEM';

export type TelemetrySeverity = 'INFO' | 'WARN' | 'ERROR' | 'BUG_REPORT';

const SESSION_KEY = 'aethervault_vm_session_id';

export function getVmSessionId(): string {
  try {
    let existing = sessionStorage.getItem(SESSION_KEY);
    if (!existing) {
      existing = 'vm_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return 'vm_anon';
  }
}

export function logVmExperience(params: {
  userEmail?: string;
  category: TelemetryCategory;
  gameName?: string;
  severity?: TelemetrySeverity;
  summary: string;
  details?: Record<string, unknown>;
}): void {
  const payload = {
    userEmail: params.userEmail || 'anonymous',
    sessionId: getVmSessionId(),
    category: params.category,
    gameName: params.gameName || 'PLATFORM',
    severity: params.severity || 'INFO',
    summary: params.summary.slice(0, 300),
    details: params.details || {}
  };

  try {
    const token = localStorage.getItem('aethervault_auth_token_v1');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch('/api/telemetry/log', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // Never interrupt user experience if telemetry endpoint is temporarily unavailable
    });
  } catch {
    // Ignore storage/network restrictions
  }
}

let telemetryListenersInstalled = false;

export function installGlobalErrorTelemetry(getCurrentUserEmail?: () => string): void {
  if (telemetryListenersInstalled || typeof window === 'undefined') return;
  telemetryListenersInstalled = true;

  window.addEventListener('error', event => {
    const msg = event.message || 'Error de ejecución en navegador';
    if (msg.includes('ResizeObserver') || msg.includes('WebSocket')) return;
    logVmExperience({
      userEmail: getCurrentUserEmail ? getCurrentUserEmail() : undefined,
      category: 'UI_ERROR',
      gameName: 'WINDOW_RUNTIME',
      severity: 'ERROR',
      summary: msg,
      details: {
        filename: event.filename || '',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        stack: event.error?.stack ? String(event.error.stack).slice(0, 800) : ''
      }
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Promise rechazada');
    if (reason.includes('WebSocket')) return;
    logVmExperience({
      userEmail: getCurrentUserEmail ? getCurrentUserEmail() : undefined,
      category: 'UI_ERROR',
      gameName: 'PROMISE_RUNTIME',
      severity: 'ERROR',
      summary: `Promesa no controlada: ${reason}`,
      details: {
        stack: event.reason?.stack ? String(event.reason.stack).slice(0, 800) : ''
      }
    });
  });
}
