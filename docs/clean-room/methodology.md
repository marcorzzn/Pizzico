<!--
Pizzico — docs/clean-room/methodology.md
Riferimento manifesto: §7
Licenza: MIT OR Apache-2.0
-->

# Metodologia di Sviluppo Clean Room — Progetto Pizzico

La procedura di **Clean Room** adottata in Pizzico è una misura vincolante volta a garantire la totale originalità del codice sorgente, l'assoluta integrità legale e il rispetto delle proprietà intellettuali di prodotti commerciali terzi.

---

## 1. Regole Inviolabili (§7.1)

1. **Divieto di codice decompilato**: È rigorosamente vietato ispezionare, includere, tradurre o trascrivere frammenti di codice offuscato, minificato o decompilato provenienti da software commerciali proprietari.
2. **Fonti consentite**:
   - Pubblicazioni scientifiche accademiche (ACM SIGGRAPH, IEEE TIP/TPAMI, IPOL, Springer).
   - Specifiche ufficiali aperte o documentate pubblicamente dai titolari dei formati (es. *Adobe Photoshop File Formats Specification*, specifiche W3C SVG e W3C WebGPU).
   - Documentazione e articoli tecnici di ingegneria liberamente accessibili.
   - Progetti open source distribuiti con licenze compatibili permissive (MIT, Apache 2.0, BSD), opportunamente attribuiti in `NOTICE.md`.
3. **Uso di strumenti di reverse engineering (`rea`)**:
   - Gli strumenti di analisi dinamica possono essere impiegati **esclusivamente per l'osservazione comportamentale black-box** (es. verificare quali header HTTP o strutture di input/output produce un'applicazione in un determinato scenario d'uso).
   - È vietato l'uso di output di deoffuscamento per replicare logiche interne o architetture proprietarie.
4. **Isolamento dei ruoli ("Due Stanze")**:
   - *Stanza di Analisi (Spec Analyst)*: esamina le specifiche pubbliche o i paper scientifici e redige una descrizione comportamentale o matematica in linguaggio naturale.
   - *Stanza di Implementazione (Implementer)*: scrive il codice sorgente Rust o TypeScript basandosi esclusivamente sulle formule e descrizioni redatte dalla prima stanza, senza mai avere accesso a binari proprietari.
   - Ogni sessione di consultazione viene verbalizzata nei log cronologici di `docs/clean-room/logs/`.
5. **Verifica brevetti (§7.1, §7.2)**:
   - Prima di integrare un algoritmo, viene verificata la data di pubblicazione accademica e l'assenza di vincoli brevettuali attivi. Molte tecniche fondamentali (es. PatchMatch, Poisson Editing) sono contributi puramente accademici liberamente implementabili.

---

## 2. Processo di Audit
Ogni Pull Request e rilascio di versione viene sottoposto a verifica incrociata con il registro di attribuzione `NOTICE.md` e la matrice di tracciabilità (§12 del Manifesto).
