# PARAZIT Archive Schema

The website is a static, version-controlled archive. JSON is the source of truth; the browser is a read-only presentation and exploration layer.

## Entity types

- `artists.json` — people and artist groups.
- `exhibitions.json` — exhibitions and external projects.
- `artworks.json` — individual works.
- `venues.json` — physical/institutional places.
- `documents.json` — catalogues, exhibition pages, articles and other documentary evidence.
- `snapshots.json` — historical website/interface captures.
- `sources.json` — provenance registry.
- `relations.json` — canonical graph of relationships.
- `archive.json` — archive metadata, timeline and editorial notes.

## IDs

Every entity gets a stable internal `id` and a human-facing archive identifier:

- `PZT-ART-*` — artist
- `PZT-EXH-*` — exhibition/project
- `PZT-WRK-*` — artwork
- `PZT-VEN-*` — venue
- `PZT-DOC-*` — document
- `PZT-SNP-*` — website snapshot
- `PZT-ARC-*` — archive/system

Do not recycle IDs.

## Relationships

`relations.json` uses directed edges:

```json
{
  "from": {"type": "artist", "id": "kozin"},
  "relation": "participated-in",
  "to": {"type": "exhibition", "id": "exh-trained-spectator-2022"},
  "role": "artist",
  "sourceIds": ["src-gisich-2022"]
}
```

Common relation verbs:

- `participated-in`
- `curated`
- `created`
- `held-at`
- `shown-in`
- `documented-by`
- `represented-by`
- `documents`

Embedded ID arrays are allowed for editorial convenience, but `relations.json` is the canonical relationship graph.

## Provenance

A record may have:

- `sourceIds` — references into `sources.json`.
- `confidence: documented | legacy`.
- `notes` — editorial explanation.

`legacy` means the record came from an earlier draft or an unverified secondary record. It must remain visible until resolved, but the interface must never present it as equally verified.

## Historical websites

The old PARAZIT website is represented as a `snapshot`, not as a rewritten modern page. The snapshot can point to an external Wayback capture and associated documentary records.

## Editorial rule

Never invent missing dates, participants, addresses, artwork attribution or documentation merely to make a record look complete. Prefer `null`, `legacy`, or an explicit note and add a source when the information is verified.

## Adding a new exhibition

1. Add the exhibition to `exhibitions.json`.
2. Reuse or create its venue in `venues.json`.
3. Add artist participation relations in `relations.json`.
4. Add works in `artworks.json` when individual works are documented.
5. Add documentary evidence to `documents.json`.
6. Register URLs/materials in `sources.json`.
7. Connect the exhibition to its documents, venue and works.

The UI should then discover the record automatically without hard-coding it into `index.html`.
