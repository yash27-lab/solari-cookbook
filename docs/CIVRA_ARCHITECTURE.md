# Civra system design

## Goal

Civra helps a small business owner understand and prepare a permit task without giving up control of payment or final submission.

## Current flow

1. The browser loads the Civra owner view.

2. The owner can run the live city check.

3. The Civra server checks that a Solari key exists.

4. The server starts a recorded Solari browser session.

5. Solari opens the fixed official New York City food permit page.

6. Civra first checks that the page is still the real permit page: the final address, the page title, and known page sections must all match.

7. If the page passes, Civra returns found or missing for each of the four permit needs, with the city text that supports each answer. If the page fails any check, every need is returned as unknown and a person must review.

8. The browser shows the result. The Solari key never reaches the browser.

9. One shared result is cached for fifteen minutes, requests that arrive together join one browser run, and a failed run pauses new runs for one minute. This bounds Solari spend.

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
