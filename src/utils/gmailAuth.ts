import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const provider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'consent select_account'
});

let isSigningIn = false;
// In-memory cache ONLY (never localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (!user) {
        cachedAccessToken = null;
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleForGmail = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se recibió el token de autorización de Google para Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGmail = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBase64Url(str: string): string {
  return utf8ToBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendSummaryViaGmailApi(params: {
  toEmail: string;
  subject: string;
  bodyText: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = cachedAccessToken;
  if (!token) {
    return {
      ok: false,
      error: 'Debes iniciar sesión con Google antes de enviar el correo.'
    };
  }

  const encodedSubject = `=?UTF-8?B?${utf8ToBase64(params.subject)}?=`;
  const encodedBody = utf8ToBase64(params.bodyText);

  const mimeMessage = [
    `To: ${params.toEmail}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody
  ].join('\r\n');

  const raw = toBase64Url(mimeMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
    }
    return {
      ok: false,
      error: errBody?.error?.message || `Error enviando vía Gmail API (HTTP ${res.status}).`
    };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, messageId: data.id };
}
