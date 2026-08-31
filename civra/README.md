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

Copy `.env.example` to `.env` and add your Solari key. Load it into your server shell before starting Civra.

The key is read only by the server. It is never sent to the page.

## Solari source

The source examples are in the main examples folder of this repo.

Solari docs are at https://docs.getsolari.com

## Project docs

System design: `../docs/CIVRA_ARCHITECTURE.md`

Safety plan: `../docs/CIVRA_THREAT_MODEL.md`

How to help: `../CONTRIBUTING.md`
