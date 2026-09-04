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

## Publicar com Cloudflare Workers

1. Create a free Cloudflare account and a free GitHub account.
2. Create a new GitHub repository and upload these files.
3. In Cloudflare, open **Workers & Pages**, choose the Worker `radareventos` and connect the GitHub repository in **Settings → Builds**.
4. O `wrangler.jsonc` define o Worker, os ficheiros estáticos, D1 e R2. Cada alteração no `main` é publicada automaticamente.

The custom domain can be connected later from the same Cloudflare project.

## Domínio e descoberta orgânica

O endereço público é `https://odesvio.pt`. A versão `www` redireciona permanentemente para esta versão canónica.

- `robots.txt` e `sitemap.xml` são rotas dinâmicas do Worker; o sitemap inclui a agenda publicada e é atualizado com cada alteração em `events.js`.
- Falta criar e validar a propriedade `odesvio.pt` no Google Search Console e submeter `https://odesvio.pt/sitemap.xml`. Isto exige acesso à conta Google que ficará responsável pelo Desvio.
- Falta configurar o Resend com o domínio verificado e os secrets `RESEND_API_KEY` e `OUTBOUND_EMAIL_FROM`, para enviar notificações de aprovação ou recusa de pedidos a partir de `ola@odesvio.pt`.
- O contacto público nos Termos e na Política de Privacidade usa `ola@odesvio.pt`.
- Alertas opcionais por cidade e artista continuam previstos, enviados apenas a quem os subscrever.

## Public suggestions, corrections and legal pages

The site contains a public, moderated form for event suggestions and corrections. It is only activated after deploying the Cloudflare Pages Functions, binding a D1 database and configuring Turnstile. The setup is documented in [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).

The footer links to Terms, Privacy and Cookie policies. Before publishing the form publicly, update the privacy page with the legal identity and privacy email of the project owner.

## Important accuracy policy

Every listing should show a source and verification date. Never estimate the percentage of tickets sold. Use only an organiser-provided number; otherwise use `Não divulgado`, `Disponível`, `Esgotado`, or `Cancelado`.

The same direct-page rule applies to ticket links: an agenda or homepage is a source, not a ticket button. Recheck each event page and each ticket page before publishing an update, including availability and sold-out status.

## Revisão automática no admin

As duas GitHub Actions produzem uma fila de trabalho privada, sem publicar ou alterar eventos sozinhas:

- de 2 em 2 horas, `Verificação de links oficiais` verifica páginas oficiais, bilheteiras e cartazes; alterações técnicas ou links indisponíveis entram na fila;
- diariamente, `Ronda diária de fontes` percorre todas as fontes e só cria um sinal quando uma página muda ou deixa de responder.

Para fazer os resultados aparecerem em `admin.html`:

1. No Worker do Cloudflare, cria o secret `AUDIT_INGEST_TOKEN` com uma palavra-passe longa e aleatória.
2. No repositório GitHub, abre **Settings → Secrets and variables → Actions** e cria estes dois secrets:
   - `DESVIO_AUDIT_INGEST_URL`: `https://odesvio.pt/api/internal/audit-report`;
   - `DESVIO_AUDIT_INGEST_TOKEN`: exatamente a mesma palavra-passe do Worker.
3. Executa cada workflow uma vez manualmente. Os sinais entram em **Revisão automática** no admin.

Um resultado `403` ou `429` pode significar uma proteção anti-bot da plataforma, e não uma página avariada. A fila serve para decidir manualmente: *em análise*, *resolvido* ou *ignorado*.

## Segurança de imagens submetidas

Os ficheiros de imagem enviados com sugestões passam por validação do ficheiro e verificação automática no Workers AI. Nudez, conteúdo sexual/pornográfico, violência gráfica e imagens de ódio claramente identificadas são rejeitados e não ficam guardados no R2. Casos ambíguos são guardados em área privada de quarentena e assinalados no admin para revisão humana.

Antes de ativar esta funcionalidade, executa a migração `database/migrations/0004_feedback_image_moderation.sql` na D1, acrescenta a binding `AI` (já declarada no `wrangler.jsonc`) e aceita uma vez a licença do modelo Meta Llama 3.2 Vision no Cloudflare.

## Notificações de pedidos

Quando uma sugestão é publicada ou recusada no painel, o Desvio envia uma notificação para o e-mail indicado no formulário. Consulta `CLOUDFLARE_SETUP.md` para ligar o fornecedor de envio.
