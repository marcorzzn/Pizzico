<!--
Pizzico — tests/psd-corpus/README.md
Riferimento manifesto: §2, §6.5, §11 Step 7
Licenza: MIT OR Apache-2.0
-->

# Suite di Regressione PSD Corpus

Questo direttorio è dedicato all'archiviazione e al test continuo di file in formato Adobe Photoshop (PSD / PSB) per verificare la compatibilità e la correttezza del parser `pizzico-io-psd`.

## Obiettivo della Suite
Garantire che ogni commit e rilascio di Pizzico sia in grado di:
1. Effettuare il parsing dell'intestazione (Header) senza errori.
2. Estrarre correttamente tutti i livelli (Layer Records) preservandone nome, opacità, rettangolo di coordinate e blend mode.
3. Decodificare i canali compressi in RLE PackBits o Raw.
4. Ricostruire l'immagine composita e confrontarla con l'output di riferimento con tolleranza SSIM $\ge 0.99$.

## Linee Guida per l'Aggiunta di File PSD
1. **Origine consentita**:
   - File creati da software libero (GIMP, Krita) esportati in PSD.
   - File PSD sintetici generati da script di test.
   - File campione di pubblico dominio o con licenza aperta (CC0 o CC-BY).
   - È vietato includere file coperti da copyright commerciale o non redistribuibili.
2. **Convenzione sui nomi**:
   - `simple_rgba_8bit.psd`
   - `layers_blend_modes.psd`
   - `large_canvas_psb.psb`
   - `group_folders_nested.psd`
3. Per ogni file aggiunto, inserire una scheda tecnica descrittiva in `metadata.json` con dimensioni, numero di layer e hash SHA-256.
