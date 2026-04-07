# Finstat 2.0 — Český obchodný register

Webová aplikácia na prehliadanie všetkých aktívnych firiem v Českej republike (s.r.o., a.s., k.s., v.o.s.). Dáta pochádzajú z ČSÚ RES open data a ARES VR API.

**Live:** https://finstat-82735485330.europe-central2.run.app

---

## Funkcie

- **604 000+ firiem** zoradených A–Z
- **Filtrovanie podľa mesta** — okamžité výsledky z lokálnej DB
- **Vyhľadávanie** — fulltext cez ARES API
- **Detail firmy** — jednatelia, spoločníci, sídlo (načítané on-demand z ARES VR)

## Spustenie lokálne

```bash
# Vyžaduje Node.js v24 (nvm)
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Inštalácia závislostí
npm install

# Stiahnutie DB (Git LFS)
git lfs pull

# Spustenie dev servera
npm run dev
```

Otvor [http://localhost:3000](http://localhost:3000).

## Obnova databázy

Dáta sa aktualizujú 2× mesačne na stránke ČSÚ. Pre refresh:

```bash
npm run sync   # stiahne nový RES CSV (~513 MB) a importuje do SQLite
```

Po sync commitni novú DB:
```bash
git add prisma/dev.db && git commit -m "Update DB" && git push
```

## Deployment (Google Cloud Run)

Push na `main` = automatický redeploy cez Cloud Build.

```bash
git push origin main
```

Build trvá ~5 minút. DB je baked do Docker image cez Git LFS.

---

## Technológie

| Vrstva | Technológia |
|--------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API Routes |
| Databáza | SQLite (Prisma 6), 122 MB, 604k záznamov |
| Dáta | ČSÚ RES CSV + ARES VR API |
| Deployment | Docker, Google Cloud Run, Artifact Registry |
| Verzia kontrola DB | Git LFS |

---

## limitácie a issues 
Vyhľadávanie cez názov/IČO stále funguje cez API, zmenil by som to na vyhľadávanie v databáze.  

### Dáta
- **Žiadne finančné údaje** — ARES VR API neposkytuje tržby, zisk ani účtovné závierky. Tie sú dostupné len ako PDF na [justice.cz](https://justice.cz).
- Email a čísla väčšinou fyzické osoby nemajú zverejnené, keďtak iba firemné na svojich stránkach. 

### Detail firmy (ARES VR)
- **Rate limit 500 req/min** — pri vysokej návštevnosti môže byť detail pomalší.
- **Cache 24 hodín** — po prvom načítaní sa detail uloží do DB na 24h. Ak ARES medzitým aktualizuje dáta, zobrazia sa až po expirácii cache.
- **Nie všetky firmy majú VR záznam** — niektoré staršie s.r.o. nie sú v Obchodnom registri (Veřejný rejstřík), detail bude prázdny.

### Databáza & Deployment
- **SQLite nie je vhodný pre vysokú záťaž** — pri súbežných zápisoch (caching detailov) môže dôjsť k zamknutiu DB. Pre produkciu s väčšou návštevnosťou odporúčame migráciu na PostgreSQL
- **DB v Docker image** — každý sync vyžaduje nový build a redeploy (~5 min). Nie je možné aktualizovať DB bez redeployu.
- **Cloud Run scale-to-zero** — pri prvom requeste po dlhej nečinnosti môže byť cold start ~2–3 sekundy.
- **Bez perzistentného storage** — záznamy z ARES VR API cachované počas behu kontajnera sa stratia pri reštarte/redeployi.

### Vyhľadávanie
- **ARES API limit 1000 výsledkov** — pre populárne výrazy (napr. "Auto") vráti ARES chybu. 
- **Vyhľadávanie nie je fulltext** — ARES API robí word-token matching, nie substring search. Hľadanie "nova" nenájde "Inovace s.r.o.".

### Čas venovaný tomuto projektu:
- cca 12 hodín čistého pracovného času
