# Event Radar

Static, database-free guide for every public music event in Portugal. It is designed to publish through Cloudflare Pages.

## What belongs in Event Radar

Include public concerts, festivals, DJ sets, bar and club gigs, free local shows, Fado sessions, recitals, opera and musical theatre. Exclude private/invite-only events, workshops without a public performance, karaoke, and events where music is only background entertainment.

## Updating the agenda

1. Open `events.js`.
2. Copy one event object and update its details.
3. Give it a `type`: `Concerto`, `Festival`, `Concerto em bar`, `Fado regular`, `DJ set`, `Recital`, or `Musical`.
4. Only add an event after confirming it with an organiser, official venue, or official ticket seller.
5. Add the official URLs, set `verifiedAt` to the date checked, and keep the capacity as `Não divulgado` unless the organiser confirms a figure.
6. Only show a poster when it is visible on that event's official page, official promoter/venue page, or its concrete official ticket page. Save that exact page in `posterSourceUrl` and set `posterVerifiedAt`. Never create, edit, or infer a flyer. If this confirmation is missing, leave out `image`: the site will show `Não existe cartaz oficial ainda.`
7. Remove cancelled events only after their date; before then, keep them with `availability: "Cancelado"`.

`sources.js` is the source watchlist. Discovery sites help find events, but are not sufficient confirmation by themselves.

## Publish free with Cloudflare Pages

1. Create a free Cloudflare account and a free GitHub account.
2. Create a new GitHub repository and upload these files.
3. In Cloudflare, open **Workers & Pages**, choose **Create application** → **Pages** → **Connect to Git**.
4. Select the repository. There is no build command and the output folder is `/`.
5. Click **Save and Deploy**. Cloudflare gives you a free `*.pages.dev` address.

The custom domain can be connected later from the same Cloudflare project.

## Important accuracy policy

Every listing should show a source and verification date. Never estimate the percentage of tickets sold. Use only an organiser-provided number; otherwise use `Não divulgado`, `Disponível`, `Esgotado`, or `Cancelado`.

The same direct-page rule applies to ticket links: an agenda or homepage is a source, not a ticket button. Recheck each event page and each ticket page before publishing an update, including availability and sold-out status.
