# Publicar o Radar de Eventos no Cloudflare

Este projeto é uma página estática com duas pequenas funções privadas:

- `GET /api/config` entrega a chave pública do anti-spam ao formulário.
- `POST /api/feedback` valida o anti-spam e guarda sugestões/correções na D1.

Nada enviado pelo público é publicado automaticamente.

## 1. Criar e publicar o projeto

1. Envia este repositório para GitHub.
2. No Cloudflare, abre **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Escolhe o repositório `radareventos`.
4. Define **Framework preset** como `None`, **Build command** vazio e **Build output directory** como `/`.
5. Faz o primeiro deploy. Vais receber uma morada `*.pages.dev` para testar antes de comprares o domínio.

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

## 4. Proteger o formulário contra spam

1. No Cloudflare, abre **Turnstile** → **Add widget**.
2. Cria um widget chamado `Radar de Eventos — formulário público`.
3. Adiciona primeiro a morada exata recebida no Pages (por exemplo, `radareventos.pages.dev`); depois acrescenta o domínio próprio.
4. Copia a **Sitekey** e a **Secret key**.
5. No projeto Pages, abre **Settings** → **Environment variables** e cria:
   - `TURNSTILE_SITEKEY` = Sitekey (pode ser visível no browser).
   - `TURNSTILE_SECRET_KEY` = Secret key (marca como secret; nunca a coloques no GitHub).
6. Faz novo deploy.

Depois disto, o formulário fica ativo. Sem estas duas chaves, mostra uma mensagem honesta a indicar que ainda está em preparação.

## 5. Rever contribuições

Na D1, podes consultar os pedidos novos com:

```sql
SELECT * FROM feedback WHERE status = 'new' ORDER BY created_at DESC;
```

Depois de rever, atualiza o estado para `reviewing`, `published`, `rejected` ou `closed`. Publicar uma sugestão continua a significar atualizar `events.js` com fonte oficial e data de verificação.

## 6. Email e domínio (fazemos depois)

Quando comprares o domínio, criaremos pelo menos:

- `ola@teudominio.pt` — contacto geral.
- `correcoes@teudominio.pt` — correções e direitos de privacidade.

Esses endereços podem encaminhar para a tua caixa de email atual. Antes de ativar os formulários para o público, atualiza `privacidade.html` com o nome legal do responsável e esse contacto de privacidade.

## 7. Ligar o domínio

No projeto Pages: **Custom domains** → **Set up a domain**. Se o domínio principal estiver no Cloudflare, aceita a configuração de DNS sugerida. Depois confirma que tanto `www` como a versão sem `www` encaminham para uma única versão escolhida.
