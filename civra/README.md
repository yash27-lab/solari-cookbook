# Civra

Civra helps small business owners keep permits ready.

## The problem

Small business owners often use many city sites for permits and renewals. The forms can be long. Files can be hard to find. Due dates can be missed. A missed permit can stop a business from working.

## Our answer

Civra puts the full permit task in one clear place. It finds the right city page, checks saved files, fills facts that are already known, and tells the owner what is missing.

The owner stays in charge. Civra always waits before payment or final send.

## How Civra uses Solari

Civra is built from the Solari Cookbook.

The live permit check uses the Solari browser SDK to open the official New York City food permit page and find four listed needs.

The Solari run has session recording turned on so the work can have a clear record.

The sandbox example gives Civra a private place to read files, check facts, and make ready to send forms.

The desktop example can help with old PDF forms and city tools that need a full screen.

The current live check reads a public city page. Sign in, form filling, file processing, payment, and final submission are not turned on in this MVP.

## How to use Civra

1. Add a permit name, due date, and file.

2. Let Civra find the city page and list what is needed.

3. Open the task and check every answer.

4. Add any missing file.

5. Choose when to pay or send.

The guide inside Civra walks through all six parts of the task. It starts with the permit list and ends with owner review.

## Safety

The live check fails closed when the final address, page title, known page sections, or most known phrases do not match. In that case, every permit need is unknown and Civra asks for a human look.

A found answer includes the matching city text. A missing answer means the known phrase was not found and has no evidence. Missing never means the owner is ready. The page tells the owner to review it.

The paid live check requires a private Civra access code. A correct code creates a one hour browser session in a private cookie. The page cannot read that cookie. Repeated wrong codes are slowed.

The live check is also metered inside each running server. One result is cached for fifteen minutes, requests that arrive together share one browser run, and a failed run pauses new runs for one minute. A real multi server release still needs a shared rate limit and daily spend limit.

Civra does not store portal passwords or sign in to private city accounts today. In a future private portal flow, the owner will type the password themselves. Civra will be designed not to collect or store that password.

The current demo keeps selected files in the browser. It does not send them to a city site.

The real file check will use a separate Solari work space.

The Solari key must stay on the server. It must never be placed in the page.

Civra always waits for the owner before payment or final send.

## Run Civra

```text
cd civra
npm install
npm start
```

Open http://localhost:4173

## Check Civra

```text
cd civra
npm run check
```

## Run the live Solari check

Copy `.env.example` to `.env`, add your Solari key, and choose a long private Civra access code. Load both values into your server shell before starting Civra.

The Solari key and Civra access code are read only by the server. They are never placed in the page code.

## Solari source

The source examples are in the main examples folder of this repo.

Solari docs are at https://docs.getsolari.com

## Project docs

System design: `../docs/CIVRA_ARCHITECTURE.md`

Safety plan: `../docs/CIVRA_THREAT_MODEL.md`

How to help: `../CONTRIBUTING.md`
