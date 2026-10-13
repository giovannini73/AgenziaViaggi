# Itinerari aperti

Portale di itinerari di viaggio, protetto da password all’ingresso. Sabrina e Claudio hanno ciascuno la propria password e i propri voti, visibili all’altro.

## Cosa c’è nella prima versione

- Elenco itinerari con ricerca e filtri
- Pagina di dettaglio con mappa e tappe
- Voti a stelle e commenti
- Creazione, modifica, duplicazione
- Cronologia semplice per ripristinare una versione
- Dati iniziali: India del Sud A/B/C, Sri Lanka, Cambogia, Filippine
- Chat per creare o modificare itinerari, date e tappe, e per cercare video e immagini
- Le proposte della chat si applicano solo dopo conferma

## Avvio in locale

Serve Node.js. Poi:

```bash
npm install
npm run db:migrate:local
npm run dev
```

Apri l’indirizzo che compare nel terminale (di solito http://localhost:5173).

Per le password e la chat: copia `.dev.vars.example` in `.dev.vars` e inserisci `SITE_PASSWORD` (Sabrina), `SITE_PASSWORD_CLAUDIO` (Claudio) e, se serve, la chiave del servizio. Senza la chiave della chat il resto del sito funziona comunque.

## Pubblicazione su Cloudflare

1. Accedi a Cloudflare dal computer: `npx wrangler login`
2. Crea il database: `npx wrangler d1 create agenzia-viaggi`
3. Copia l’identificativo del database in `wrangler.jsonc` al posto di `local-agenzia-viaggi`
4. Applica lo schema: `npm run db:migrate:remote`
5. Pubblica: `npm run deploy`
6. Salva le password: `npx wrangler secret put SITE_PASSWORD` e `npx wrangler secret put SITE_PASSWORD_CLAUDIO`
7. Per la chat, salva la chiave sul server: `npx wrangler secret put OPENAI_API_KEY`

## Versione

1.0.50
