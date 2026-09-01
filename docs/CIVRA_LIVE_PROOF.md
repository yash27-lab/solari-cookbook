# Civra live Solari proof

## Public demo

https://civra-1033856783599.us-east1.run.app/

## What ran

On August 31, 2026, Civra launched a recorded Solari cloud browser and opened the official New York City Food Service Establishment Permit page.

The first run returned unknown. The page address and title were correct, but none of the four known needs were visible. Civra stopped instead of claiming that anything was missing.

The browser view showed why. New York City places the application details behind a How To Apply tab.

Civra was updated to click that tab and wait for the application section. The next real Solari run passed every trust gate.

## Verified result

1. Final address matched the official city page.

2. Page title matched Food Service Establishment Permit.

3. The application section and requirements list were visible.

4. Certificate of Authority to Collect Sales Tax was found with city text.

5. Food Protection Certificate was found with city text.

6. Workers compensation and disability insurance was found with city text.

7. A valid email address was found with city text.

8. Solari session recording was enabled.

The safe result is committed at `civra/public/live-proof.json`. It contains no API keys, portal passwords, cookies, or owner files.

## Cloud safety

The demo runs on Google Cloud Run with one maximum service instance. The Solari key and Civra access code are stored in Google Secret Manager.

Anyone can view the saved proof. A fresh paid check requires a private Civra server session and a trusted action header. Successful results are cached, calls made at the same time share one run, and failed runs start a cooldown.
