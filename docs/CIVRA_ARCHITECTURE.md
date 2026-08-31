# Civra system design

## Goal

Civra helps a small business owner understand and prepare a permit task without giving up control of payment or final submission.

## Current flow

1. The browser loads the Civra owner view.

2. The owner can run the live city check.

3. The Civra server checks that a Solari key exists.

4. The server starts a recorded Solari browser session.

5. Solari opens the fixed official New York City food permit page.

6. Civra looks for four permit needs and returns true or false for each one.

7. The browser shows the count. The Solari key never reaches the browser.

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
