# PARAZIT / DIGITAL ARCHIVE

PARAZIT is an artist-run gallery / collective / exhibition system from Saint Petersburg. This repository is being developed as a **digital archive and gallery simultaneously**.

The interface deliberately treats the archive as an institutional/database object: dense typography, hard borders, system labels, archive IDs, provenance markers and relational records.

## Architecture

```text
JSON DATA
  │
  ├── artists
  ├── exhibitions
  ├── artworks
  ├── venues
  ├── documents
  ├── snapshots
  └── sources
        │
        ▼
 relations.json
        │
        ▼
  browser archive engine
        │
        ├── HOME
        ├── ARCHIVE
        ├── GALLERY
        ├── INDEX
        └── ABOUT
```

## Current entity layers

| File | Purpose |
| --- | --- |
| `archive.json` | archive identity + chronology + editorial notes |
| `artists.json` | artist/person index |
| `exhibitions.json` | exhibitions and external projects |
| `artworks.json` | individual works |
| `venues.json` | places and host institutions |
| `documents.json` | catalogues, exhibition pages, articles, documentary records |
| `snapshots.json` | historical versions of the PARAZIT website |
| `sources.json` | provenance/source registry |
| `relations.json` | canonical relationship graph |

See [ARCHIVE_SCHEMA.md](ARCHIVE_SCHEMA.md) before adding records.

## Archive principles

- **Source first.** Attach evidence to factual records whenever possible.
- **Uncertainty is data.** `legacy` records remain visible instead of being silently deleted or upgraded.
- **Stable IDs.** Records use permanent `PZT-*` identifiers.
- **Relations over duplication.** Artists, works, exhibitions and venues are linked rather than repeatedly copied into every page.
- **Historical websites are artifacts.** The old PARAZIT website is represented as a snapshot and documentary source rather than rewritten as if it were a modern page.
- **Static by design.** The archive can live entirely on GitHub Pages while remaining version-controlled and portable.

## Historical reference

The archive is currently being populated from institutional exhibition records, catalogues, artist CVs, academic references and the archived historical PARAZIT website. The data is intentionally incomplete and will be expanded as more primary material is collected.

## Development

No backend or database server is required at this stage.

Edit the JSON records, commit them to Git, and the frontend automatically discovers the new entities and relationships.

## Status

**ACTIVE / WORK IN PROGRESS**

The current milestone establishes the relational archive foundation. The next stages are deeper historical ingestion, document/image digitization, proper per-record pages, and reconstruction of historical website versions.
