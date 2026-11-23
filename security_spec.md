# Security Specification — AetherVault Firestore Rules (Phase 0)

## 1. Data Invariants
1. **Default Deny**: All paths default to `false` unless explicitly matched and authorized.
2. **Verified Identity Only**: Standard authenticated writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Owner Exclusivity (`trabajofino52@gmail.com`)**: Only the verified owner (`isAdmin()`) may read or write `/vault_configs/{configId}`, `/btcpay_webhooks/{eventId}`, or credit `coinsBalance` in `/user_balances/{balanceId}` on blockchain settlement.
4. **No Self-Privilege Escalation**: Creating `/users/{userId}` forbids `role == 'OWNER'` unless `isAdmin()`, forbids arbitrary `coinsBalance > 0` on self-registration, and locks `uid`, `email`, and `createdAt` against modification.
5. **PII Isolation & Query Enforcement**: Any `allow get` or `allow list` on `/users` or `/user_balances` strictly evaluates `resource.data.uid == request.auth.uid` or `resource.data.email == request.auth.token.email` or `isAdmin()`.
6. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
7. **Idempotency & Immutability**: `/btcpay_webhooks/{eventId}` documents are append-only (`allow update, delete: if false`) so settled blockchain invoices cannot be replayed or altered.

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read on `/users/{userId}`
2. Unauthenticated write on `/btcpay_webhooks/{eventId}`
3. Email spoofing (`token.email == 'trabajofino52@gmail.com'` with `email_verified == false`) attempting to read `/vault_configs/main`
4. Player creating `/users/{uid}` with `role: 'OWNER'`
5. Player creating `/users/{uid}` with injected `coinsBalance: 999999`
6. Player updating `/users/{uid}` with a ghost field (`{ isAdmin: true }`)
7. Player updating `/users/{uid}` to tamper with `coinsBalance` directly (`affectedKeys().hasOnly(['coinsBalance'])`)
8. Player forging `/btcpay_webhooks/{eventId}` with `blockchainConfirmed: true`
9. Updating or deleting an already settled `/btcpay_webhooks/{eventId}`
10. Injecting oversized 2KB string into `displayName` or `userId` (`isValidId` / `.size()`)
11. Spoofing client `createdAt` timestamp not equal to `request.time`
12. Blanket `list` query on `/users` or `/user_balances` by a non-admin user trying to scrape other users' PII
