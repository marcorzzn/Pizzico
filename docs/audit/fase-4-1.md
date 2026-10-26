# Fase 4.1 — Seam del motore nel bridge

> **Data**: 2026-10-26
> **Stato**: 4.1 completata e verde. 4.2 **non iniziata**, di proposito (vedi §5).

---

## 1. Cosa è stato introdotto

```
crates/wasm-bindings/src/
├── lib.rs              ← 87 funzioni pubbliche, firme INVARIATE
└── engine/
    ├── mod.rs          ← trait EngineBackend + LayerMeta/DocumentMeta/HistoryMeta
    └── legacy.rs       ← LegacyBackend su pizzico-core (motore attuale)
```

Il documento non è più un `thread_local` autonomo: vive dentro il backend.

```rust
thread_local! {
    static BACKEND: RefCell<Box<dyn EngineBackend>> =
        RefCell::new(Box::new(LegacyBackend::new()));
    static ACTIVE_HISTORY: RefCell<History> = …;   // ancora separata (vedi §4)
}
```

`with_active_document` / `with_active_document_mut` — le due funzioni da cui passano
**47 chiamate** — ora delegano al backend:

```rust
BACKEND.with(|cell| {
    let backend = cell.borrow();
    f(backend.legacy_document().expect("…"))
})
```

Nessuna delle 87 funzioni ha cambiato nome, parametri o tipo di ritorno.

## 2. Perché il trait espone anche il documento legacy

Le funzioni non ancora astratte (tratti, export, PSD, progetto) lavorano direttamente
su `pizzico_core::Document`. Se il backend tenesse il documento privato, servirebbe
duplicare lo stato — cioè due copie dello stesso documento, che divergono al primo
errore.

La scelta: il trait espone `legacy_document()` / `legacy_document_mut()` che
restituiscono `Option<&Document>`. Il backend legacy restituisce `Some`, il futuro
backend v2 restituirà `None`. È un ponte **dichiarato e temporaneo**: sparisce quando
ogni gruppo di funzioni passerà ai metodi semantici del trait.

## 3. Gate

| Gate | Esito |
|---|---|
| `cargo check -p pizzico-wasm-bindings` | ✅ exit 0 (3,44 s) |
| `cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown` | ✅ exit 0 (7,31 s) |
| `cargo test -p pizzico-wasm-bindings` | ✅ 5/5 (test del backend) |

I 5 test del backend coprono: creazione documento e layer, dimensioni del composito,
opacità/visibilità che finiscono in history, selezione che esiste solo con area,
reset completo su `create_document`.

## 4. Debito dichiarato (importante)

**La history è ancora fuori dal backend.** `LegacyBackend` possiede un campo `history`
usato dai propri metodi, ma `lib.rs` continua a usare `ACTIVE_HISTORY`, la vecchia
`thread_local`. Finché le funzioni del bridge non passano dai metodi semantici, i due
storici non si incontrano — e il campo interno del backend resta di fatto non usato dal
bridge.

Non è un bug oggi (nessuno chiama `backend.add_raster_layer`), ma è una **bomba a
orologeria**: chi domani collega una funzione al metodo del trait e non all'altro
percorso ottiene due history divergenti. Va risolto all'inizio della 4.2, spostando
`History` dentro il backend e sostituendo i 15 punti che usano `ACTIVE_HISTORY`.

Tre di questi punti sono **dentro** closure che tengono già un prestito mutabile del
backend: vanno appianati (costruire il comando, chiudere il prestito, poi accodarlo),
altrimenti `RefCell` va in panico a runtime. È la ragione per cui non l'ho fatto in
4.1: richiede una revisione puntuale, non una sostituzione meccanica.

## 5. Perché la 4.2 non è stata iniziata

La 4.2 richiede, oltre al backend v2:

1. spostare la history nel backend (15 punti + 3 annidamenti);
2. riscrivere i gruppi di funzioni perché non tocchino più `pizzico_core::Document`;
3. implementare **davvero** tratti ed export sul motore nuovo:
   - tratti con `pizzico-engine-draw` (accumulo punti, rasterizzazione a fine tratto);
   - export con `pizzico-engine-io` (PNG/JPEG/WebP);
   - PSD e formato progetto: non hanno equivalente in v2 → vanno dichiarati esclusi,
     non finti.

Fare la 4.2 "a metà" significa o lasciare funzioni che restituiscono `false`/`Err`
senza dirlo, oppure collegare il bridge a un motore che non disegna. Entrambe violano
la regola «niente wrapper finti».

**Decisione**: 4.1 chiusa qui, 4.2 in una sessione dedicata, con il piano qui sopra.

## 6. Commit

`fase-4.1: trait EngineBackend, backend legacy isolato`
