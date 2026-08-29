# Publicar o Desvio no Cloudflare

Este projeto é uma página estática com pequenas funções no Cloudflare Worker:

- `GET /api/config` entrega a chave pública do anti-spam ao formulário.
- `POST /api/feedback` valida o anti-spam e guarda sugestões/correções na D1.

Nada enviado pelo público é publicado automaticamente.

## 1. Criar e publicar o projeto

1. Envia este repositório para GitHub.
2. No Cloudflare, abre **Workers & Pages** → **Create application** → **Workers** → **Connect to Git**.
3. Escolhe o repositório `radareventos`. O ficheiro `wrangler.jsonc` já define o site e as rotas da API.
4. Faz o primeiro deploy. Vais receber uma morada `*.workers.dev` para testar antes de comprares o domínio.

## 2. Ativar métricas sem cookies

No projeto Pages: **Metrics** → **Enable Web Analytics**.

Não é preciso adicionar Google Analytics nem editar o código. Verás visitas, visualizações de páginas, referências e desempenho de forma agregada.

## 3. Criar a base de dados das contribuições

1. No Cloudflare, abre **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Nome sugerido: `event-radar-feedback`.
3. Abre a consola SQL dessa base de dados e executa o conteúdo de `database/schema.sql`.
4. Volta ao projeto Pages: **Settings** → **Bindings** → **Add** → **D1 database bindings**.
5. Seleciona a base criada e usa exatamente este nome de variável: `EVENT_RADAR_DB`.
6. Faz novo deploy.

Se já tinhas criado a base antes de esta opção de cartaz existir, executa também, uma única vez, o conteúdo de `database/migrations/0002_feedback_posters.sql`.

Para ativar a proteção contra tentativas repetidas, executa também uma vez a migração `database/migrations/0006_feedback_tracking.sql`.

### Limite de pedidos no Worker

O Worker aplica um limite real antes de validar o Turnstile: quatro envios de formulário em 15 minutos por origem com hash SHA-256. O IP em claro nunca é gravado na D1; os contadores expiram automaticamente. Mantém o Turnstile ativo — é a segunda camada contra abuso.

## 4. Guardar cartazes enviados para revisão

1. No Cloudflare, abre **Storage & Databases** → **R2** → **Create bucket**.
2. Nome sugerido: `event-radar-posters`. Mantém o bucket privado: estes ficheiros são apenas material de revisão.
3. No projeto Pages, abre **Settings** → **Bindings** → **Add** → **R2 bucket bindings**.
4. Seleciona o bucket e usa exatamente este nome de variável: `EVENT_POSTERS`.
5. Faz novo deploy.

No formulário, uma pessoa pode deixar um link do cartaz e/ou enviar uma imagem JPG, PNG ou WebP até 5 MB. A imagem enviada não aparece automaticamente no site: fica guardada com a sugestão até ser revista.

## 5. Proteger o formulário contra spam

1. No Cloudflare, abre **Turnstile** → **Add widget**.
2. Cria um widget chamado `Desvio — formulário público`.
3. Adiciona primeiro a morada exata recebida no Pages (por exemplo, `radareventos.pages.dev`); depois acrescenta o domínio próprio.
4. Copia a **Sitekey** e a **Secret key**.
5. No projeto Pages, abre **Settings** → **Environment variables** e cria:
   - `TURNSTILE_SITEKEY` = Sitekey (pode ser visível no browser).
   - `TURNSTILE_SECRET_KEY` = Secret key (marca como secret; nunca a coloques no GitHub).
6. Faz novo deploy.

Depois disto, o formulário fica ativo. Sem estas duas chaves, mostra uma mensagem honesta a indicar que ainda está em preparação.

## 6. Criar a área privada de revisão

O projeto inclui `admin.html`, uma área que mostra sugestões, correções, links oficiais e cartazes enviados. Ela não deve ficar acessível ao público.

1. Depois do primeiro deploy, abre **Cloudflare Zero Trust** → **Access** → **Applications** → **Add an application**.
2. Cria uma aplicação para `https://<a-tua-morada-pages>/admin.html` e outra para `https://<a-tua-morada-pages>/api/admin/*`.
3. Cria uma aplicação que protege `https://<a-tua-morada-pages>/admin.html` e `https://<a-tua-morada-pages>/api/admin/*`, usando o método de login de código por email. A aplicação deverá encaminhar todos os pedidos protegidos para o Worker.
4. Não partilhes a morada `admin.html` nem a transformes num link público do site.

As funções do painel também exigem o comprovativo do Cloudflare Access; sem essa proteção, recusam listar ou alterar pedidos.

### Login e utilizadores do painel

O Worker valida a assinatura do token do Cloudflare Access e só autoriza os e-mails ativos na tabela `admin_users`. Define estes três valores antes do deploy (não os guardes no repositório):

```sh
npx wrangler secret put ADMIN_OWNER_EMAIL
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
```

- `ADMIN_OWNER_EMAIL` é o teu e-mail e cria o único proprietário inicial;
- `TEAM_DOMAIN` é `https://<equipa>.cloudflareaccess.com`;
- `POLICY_AUD` é a etiqueta AUD da aplicação Access. Como o painel protege duas rotas (`/admin.html` e `/api/admin/*`), coloca as duas etiquetas separadas por vírgula.

Para o painel poder gerir mais e-mails sem voltar ao Cloudflare, configura a política Access para permitir o método de login escolhido e deixa o Worker aplicar a lista estrita de `admin_users`. A validação de assinatura e de AUD continua a impedir que um token de outra aplicação seja usado aqui. O proprietário pode então autorizar, suspender e reativar e-mails no topo do painel.

## 7. Rever contribuições

Na D1, podes consultar os pedidos novos com:

```sql
SELECT * FROM feedback WHERE status = 'new' ORDER BY created_at DESC;
```

Depois de rever, atualiza o estado para `reviewing`, `published`, `rejected` ou `closed`. Publicar uma sugestão continua a significar atualizar `events.js` com fonte oficial e data de verificação.

## 8. Notificações por e-mail

O formulário deixa de expor uma página de acompanhamento. Quando o pedido é aceite ou recusado no admin, o Worker envia uma mensagem para o e-mail submetido.

1. Cria uma conta no [Resend](https://resend.com) e verifica o domínio de envio. Enquanto o `odesvio.pt` não estiver disponível, podes usar um domínio que controles; o endereço remetente tem de pertencer a um domínio verificado.
2. Cria uma API key no Resend e, no Worker, guarda estes dois valores como secrets:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put OUTBOUND_EMAIL_FROM
```

3. Para `OUTBOUND_EMAIL_FROM`, usa por exemplo `Desvio <ola@teudominio.pt>`.
4. Faz deploy. Ao publicar ou recusar um pedido, o admin confirma se o e-mail foi enviado.

O segredo nunca entra no GitHub. Sem estes dois valores, o pedido continua a ser atualizado normalmente, mas o admin avisa que o e-mail ainda não está configurado.

## 9. Email e domínio (fazemos depois)

Quando comprares o domínio, criaremos pelo menos:

- `ola@teudominio.pt` — contacto geral.
- `correcoes@teudominio.pt` — correções e direitos de privacidade.

Esses endereços podem encaminhar para a tua caixa de email atual. Antes de ativar os formulários para o público, atualiza `privacidade.html` com o nome legal do responsável e esse contacto de privacidade.

## 10. Ligar o domínio

No projeto Pages: **Custom domains** → **Set up a domain**. Se o domínio principal estiver no Cloudflare, aceita a configuração de DNS sugerida. Depois confirma que tanto `www` como a versão sem `www` encaminham para uma única versão escolhida.
