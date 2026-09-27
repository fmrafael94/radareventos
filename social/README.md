# Publicação social

`publishing-manifest.json` é a fonte única para tudo o que segue para a Meta.

Fluxo obrigatório:

1. `draft`: conteúdo ainda em trabalho.
2. `approved`: imagens, copy, fontes e handles aprovados.
3. `scheduled`: confirmado no Planner; preencher `meta.verifiedAt` e, quando disponível, `meta.postId`.
4. `published`: confirmar a publicação pública.
5. `needs_replacement`: existe uma versão errada na Meta e tem de ser trocada antes da data.

Antes de agendar, executar `npm run audit:social`. Para exigir também confirmação externa do Planner, executar `node scripts/audit-social-manifest.mjs --strict-external`.

Cada entrada contém os ficheiros de feed por ordem e exatamente uma Story correspondente por cartão. As Stories usam sempre uma ligação pública do Desvio.
