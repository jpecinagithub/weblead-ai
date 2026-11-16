/**
 * Gmail integration — Fase E stub (instrucciones §7, docs/gmail-setup.md).
 *
 * Honest state: NOT CONNECTED. No real account is connected, no OAuth
 * tokens exist, no credentials are stored anywhere in this repo. The
 * functions below describe the intended flow and refuse to act until
 * Jon completes the OAuth setup in docs/gmail-setup.md.
 *
 * When connected (future), the only scopes are the minimum:
 * - https://www.googleapis.com/auth/gmail.readonly (read authorised replies)
 * - https://www.googleapis.com/auth/gmail.compose (create drafts only)
 * There is deliberately NO gmail.send scope: nothing in WebLead AI sends
 * email. Drafts live in Postgres (EmailDraft) until a human approves a
 * real send through Gmail itself.
 */

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;

export const GMAIL_STATUS = {
  connected: false,
  status: 'not_connected',
  reason:
    'Sin cuenta conectada: falta el OAuth de Gmail (client ID/secret y la ' +
    'autorización de Jon). Ver docs/gmail-setup.md. Los borradores son locales ' +
    '(Postgres) hasta entonces.',
  scopes: [...GMAIL_SCOPES],
  canSend: false,
} as const;

export type GmailStatus = typeof GMAIL_STATUS;

/** Current Gmail connection state — always not_connected until OAuth is done. */
export function getGmailStatus(): GmailStatus {
  return GMAIL_STATUS;
}

export class GmailNotConnectedError extends Error {
  constructor(action: string) {
    super(
      `Gmail no conectado: no se puede ${action}. Completa el OAuth en docs/gmail-setup.md ` +
        `(scopes gmail.readonly + gmail.compose). Sin cuenta real conectada, sin envío.`,
    );
    this.name = 'GmailNotConnectedError';
  }
}

/**
 * Would create a Gmail draft — refuses while not connected. Even when
 * connected, this only creates a DRAFT (gmail.compose); sending stays
 * a human action in Gmail, never an API call from WebLead AI.
 */
export function createGmailDraft(_opts: { to: string; subject: string; body: string }): never {
  throw new GmailNotConnectedError('crear un borrador en Gmail');
}

/** Would list authorised replies — refuses while not connected. */
export function listGmailReplies(): never {
  throw new GmailNotConnectedError('leer respuestas en Gmail');
}
