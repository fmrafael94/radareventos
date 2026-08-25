# Desvio — O teu radar de eventos

Public music guide for Portugal. The confirmed agenda stays as a versioned static file; Cloudflare D1 is used only for private suggestions and corrections sent by visitors.

## What belongs in Desvio

Include public concerts, festivals, DJ sets, bar and club gigs, free local shows, Fado sessions, recitals, opera and musical theatre. Exclude private/invite-only events, workshops without a public performance, karaoke, and events where music is only background entertainment.

## Updating the agenda

1. Open `events.js`.
2. Copy one event object and update its details.
3. Give it a `type`: `Concerto`, `Festival`, `Concerto em bar`, `Fado regular`, `DJ set`, `Recital`, or `Musical`.
4. Only add an event after confirming it with an organiser, official venue, or official ticket seller.
5. Add the official URLs, set `verifiedAt` to the date checked, and keep the capacity as `Não divulgado` unless the organiser confirms a figure.
6. Before declaring that there is no poster, look in this exact order: the event's own official website; its concrete official ticket page (Ticketline, BOL, FNAC, Fever, etc.); the official promoter or venue; then the relevant Câmara Municipal/cultural venue. Only show a poster when it is visible on one of these pages. Save that exact page in `posterSourceUrl` and set `posterVerifiedAt`. Never create, edit, or infer a flyer. If this confirmation is missing, leave out `image`: the site will show `Não existe cartaz oficial ainda.`
7. Remove cancelled events only after their date; before then, keep them with `availability: "Cancelado"`.

`sources.js` is the source watchlist. Discovery sites help find events, but are not sufficient confirmation by themselves.

## Publish free with Cloudflare Pages

1. Create a free Cloudflare account and a free GitHub account.
2. Create a new GitHub repository and upload these files.
3. In Cloudflare, open **Workers & Pages**, choose **Create application** → **Pages** → **Connect to Git**.
4. Select the repository. There is no build command and the output folder is `/`.
5. Click **Save and Deploy**. Cloudflare gives you a free `*.pages.dev` address.

The custom domain can be connected later from the same Cloudflare project.

## Public suggestions, corrections and legal pages

The site contains a public, moderated form for event suggestions and corrections. It is only activated after deploying the Cloudflare Pages Functions, binding a D1 database and configuring Turnstile. The setup is documented in [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).

The footer links to Terms, Privacy and Cookie policies. Before publishing the form publicly, update the privacy page with the legal identity and privacy email of the project owner.

## Important accuracy policy

Every listing should show a source and verification date. Never estimate the percentage of tickets sold. Use only an organiser-provided number; otherwise use `Não divulgado`, `Disponível`, `Esgotado`, or `Cancelado`.

The same direct-page rule applies to ticket links: an agenda or homepage is a source, not a ticket button. Recheck each event page and each ticket page before publishing an update, including availability and sold-out status.
