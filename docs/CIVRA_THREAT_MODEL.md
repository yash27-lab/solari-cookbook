# Civra safety plan

## What we protect

1. Solari keys

2. Owner files

3. Business facts

4. City account sessions

5. Payment choices

6. Submission records

## Main risks and controls

### Key leak

Risk: A key placed in browser code can be copied.

Control: The key is read only from the server process. The page calls a small Civra route and never sees the key.

### Paid route abuse

Risk: A public user could call the paid Solari route and spend the project balance.

Control: The paid route requires a private Civra session and a trusted action header. Wrong access codes are slowed. Each server also caches success, joins calls made at the same time, and pauses after failure. A multi server release still needs a shared rate limit and daily spend stop.

### Unsafe web target

Risk: A user given URL could make the server visit a private or harmful address.

Control: The MVP uses one fixed official city URL. The API does not accept a URL.

### Harmful file

Risk: A file may be too large or may not be the type it claims to be.

Control: The page allows JPG, PNG, and PDF files under 10 MB. A later server step must check the real file bytes in a separate Solari sandbox before reading it.

### Hidden action

Risk: An agent could send a form or make a payment without clear owner intent.

Control: The MVP has no submit or payment code. Future code must stop at review and ask again before each outside action.

### Wrong permit facts

Risk: A city page can change or a fact can be read in the wrong way.

Control: Each result must keep its source page and check time. The owner must see and approve facts before they are used.

### Page attack text

Risk: A web page may contain text that tries to change agent behavior.

Control: City page text is data only. Civra uses fixed checks and never treats page text as a new command.

## Safe release rule

No release may add payment, final submission, or a new web target without tests, a safety review, and a clear owner approval step.
