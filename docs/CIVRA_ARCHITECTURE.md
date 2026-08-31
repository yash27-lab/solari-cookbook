# Civra system design

## Goal

Civra helps a small business owner understand and prepare a permit task without giving up control of payment or final submission.

## Current flow

1. The browser loads the Civra owner view.

2. The owner enters a private Civra access code. The server creates a one hour session in a private browser cookie.

3. The owner can run the live city check only while that session is open.

4. The Civra server checks that a Solari key exists.

5. The server starts a recorded Solari browser session.

6. Solari opens the fixed official New York City food permit page.

7. Civra first checks that the page is still the real permit page: the final address, the page title, and known page sections must all match.

8. If the page passes, Civra returns found or missing for each need. Found includes matching city text. Missing has no evidence and requires review. If the page fails a trust check, every need is unknown.

9. The browser shows the result. The Solari key never reaches the browser.

10. Each running server caches one result for fifteen minutes, joins requests that arrive together, and pauses for one minute after a failed run. A multi server release still needs a shared rate and spend limit.

## Trust rules

Only a fixed city page can be opened. A user cannot give the server a new URL. This lowers the risk of the server being used to reach private systems.

The live check only reads a public page. It does not sign in, upload, pay, or submit.

Every move that can create a legal or money result will need a clear owner approval screen.

## Next build steps

1. Add a private Solari browser profile for a test city account.

2. Add a Solari sandbox for file type checks and text reading.

3. Store only the facts needed for the task.

4. Add a full review page before any form fill.

5. Add a second approval before payment or final submission.

6. Save a receipt and session record after an approved run.
