# PARAZIT Archive Schema

PARAZIT is a static, version-controlled digital archive. JSON is the source of truth; the browser is a read-only presentation and exploration layer.

## Entity types

- `artists.json` — people and artist groups.
- `exhibitions.json` — exhibitions, external projects and art fairs.
- `artworks.json` — individual works.
- `venues.json` — physical and institutional places.
- `documents.json` — catalogues, books, exhibition pages, press records and social-media documentation.
- `snapshots.json` — historical website/interface captures.
- `sources.json` — provenance registry.
- `relations.json` — explicit canonical graph edges.
- `archive.json` — archive metadata, timeline and editorial notes.

## IDs

Every entity gets a stable internal `id` and a human-facing archive identifier:

- `PZT-ART-*` — artist
- `PZT-EXH-*` — exhibition/project
- `PZT-FAIR-*` — fair
- `PZT-WRK-*` — artwork
- `PZT-VEN-*` — venue
- `PZT-DOC-*` — document
- `PZT-SNP-*` — website snapshot
- `PZT-ARC-*` — archive/system

Do not recycle IDs.

## Relationship model

`relations.json` stores directed, source-aware structural edges:

```json
{
  "from": {"type": "exhibition", "id": "exh-trained-spectator-2022"},
  "relation": "held-at",
  "to": {"type": "venue", "id": "venue-gisich-projects"},
  "sourceIds": ["src-gisich-2022"]
}
```

Core relation verbs:

- `participated-in` — artist → exhibition
- `curated` — artist → exhibition
- `created` — artist → artwork
- `held-at` — exhibition → venue
- `shown-in` — artwork → exhibition
- `documented-by` — exhibition → document
- `authored` — artist → document/publication
- `presented-at` — document → exhibition
- `documents` — snapshot → document
- `represented-by` — artwork → institutional representation when independently documented

### Embedded relationship fields

Exhibition records may contain `artistIds`, `curatorIds`, `venueId`, `artworkIds` and `documentIds` for efficient filtering and editorial clarity.

These fields are **relationship declarations**, not unrelated duplicate metadata. The archive UI deterministically derives navigation edges from them in addition to explicit `relations.json` edges. Explicit edges are preferred whenever a relationship has an independent source or needs a role/provenance annotation.

This hybrid model prevents the graph from becoming unnecessarily enormous while retaining one consistent relationship vocabulary.

## Participation scope

When a source says only “main roster of PARAZIT”, do not invent a list of individual participants. Use:

```json
"artistIds": [],
"participantScope": "main roster of PARAZIT; individual participants not enumerated by source"
```

When a secondary source names only some participants, use the named IDs and mark the scope as `documented subset`.

## Provenance

A record may have:

- `sourceIds` — references into `sources.json`.
- `confidence: documented | official listing | legacy`.
- `notes` — editorial explanation.
- `dateText` — original source wording when normalized dates are unsafe.

Never silently normalize an impossible or ambiguous historical date. Preserve the source wording and flag it for review. The current `FIX PRICE` record is an example: the official website prints “21–30 February 2025”, which is calendar-invalid and therefore remains as source text rather than being silently corrected.

## Historical websites

The old PARAZIT website is represented as a `snapshot`, not as a rewritten modern page. A snapshot can point to a Wayback capture and associated documentary records.

## Editorial rule

Never invent missing dates, participants, addresses, artwork attribution or documentation merely to make a record look complete. Prefer `null`, an explicit scope statement, `legacy`, or a source-backed subset.

## Adding a new exhibition

1. Add the exhibition to `exhibitions.json`.
2. Reuse or create its venue in `venues.json`.
3. Add documented artist/curator IDs to the exhibition record.
4. Add explicit structural relations to `relations.json` where useful or independently sourced.
5. Add works in `artworks.json` when individual works are documented.
6. Add documentary evidence to `documents.json`.
7. Register URLs/materials in `sources.json`.
8. Connect the exhibition to its venue, works and documents.

The UI should discover the record automatically without hard-coding it into `index.html`.
