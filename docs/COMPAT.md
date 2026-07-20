# COMPAT.md — UPI app compatibility matrix (community-maintained)

Real-device results for each payment method. PR your findings — include app version and OS. ✅ works · ⚠️ partial (note it) · ❌ fails · ⬜ untested.

**Methods:** `QR` = scan from another device · `Upload` = screenshot QR → upload inside app · `Deeplink` = "Pay with UPI app" button · `Copy` = Copy-UPI-ID → manual pay (amount typed by donor).

## Android (Chrome)

| App | QR | Upload | Deeplink | Deeplink carries amount? | Copy | Notes |
|---|---|---|---|---|---|---|
| Google Pay | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Known: browser intents to personal VPAs often silently blocked |
| PhonePe | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Known: may show "exceeds limit for this merchant" |
| Paytm | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| BHIM | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| CRED | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| Amazon Pay | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |

## iOS (Safari)

| App | QR | Upload | Deeplink | Deeplink carries amount? | Copy | Notes |
|---|---|---|---|---|---|---|
| Google Pay | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | iOS `upi://` handling differs; app-picker behavior varies |
| PhonePe | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| Paytm | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| BHIM | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |

## Reporting template

```
App + version:
OS + browser:
Method tested:
Result (✅/⚠️/❌):
Amount pre-filled? Note carried through?
Anything shown to the donor (error text, screenshots welcome):
```

Baseline claim we make in docs: **QR-scan and Copy-UPI-ID work everywhere.** If you find a counterexample, that's a high-priority issue — please file it.
