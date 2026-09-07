import{n as e}from"./rolldown-runtime-QTnfLwEv.js";import{Fn as t,Nn as n,Pn as r}from"./src-CtugEJLq.js";import{n as i}from"./opfsFs-BE8d9yCs.js";var a=[{version:1,name:`init`,sql:`
-- ── Library ────────────────────────────────────────────────────────────────

CREATE TABLE folders (
  id          TEXT PRIMARY KEY,            -- uuid, never a path
  parent_id   TEXT REFERENCES folders(id),
  name        TEXT NOT NULL,
  path        TEXT,                        -- materialized path of ids: /a/b/c — nearest-ancestor grant lookups
  owner_id    TEXT,                        -- dormant until identity ships (ADR-005)
  home        TEXT NOT NULL DEFAULT 'local',  -- local | server   (ADR-004)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_folders_parent ON folders(parent_id);

CREATE TABLE toppings (
  id           TEXT PRIMARY KEY,           -- uuid
  type         TEXT NOT NULL CHECK (type IN ('note','link','file','dash')),  -- ADR-003
  folder_id    TEXT NOT NULL REFERENCES folders(id),
  title        TEXT NOT NULL,
  content_ref  TEXT,                       -- vault rows: file path (links: the .url carrier; URL lives in properties)
  content_hash TEXT,                       -- re-association after offline moves
  thumb_ref    TEXT,                       -- key into .waffle/thumbs/
  blurhash     TEXT,
  owner_id     TEXT,
  source       TEXT,                       -- share-extension | paste | finder | import | seed | ...
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT                        -- tombstone (shared-folder sync)
);
CREATE INDEX idx_toppings_folder ON toppings(folder_id, type);
CREATE INDEX idx_toppings_folder_updated ON toppings(folder_id, updated_at);
CREATE INDEX idx_toppings_updated ON toppings(updated_at);  -- global recents
CREATE INDEX idx_toppings_hash ON toppings(content_hash);

-- Typed properties, EAV. For notes, YAML frontmatter is canonical and this
-- mirrors it; for link/file/dash this is canonical (mirrored to .waffle/meta.json, ADR-013).
CREATE TABLE properties (
  topping_id  TEXT NOT NULL REFERENCES toppings(id),
  key         TEXT NOT NULL,
  kind        TEXT NOT NULL,               -- text|number|money|duration|date|coords|select|url|checkbox
  value_text  TEXT,
  value_num   REAL,                        -- canonical unit per kind (money: amount · duration: seconds)
  value_aux   TEXT,                        -- money: ISO 4217 · coords: lng · select: option id
  PRIMARY KEY (topping_id, key)
);
CREATE INDEX idx_properties_key_num  ON properties(key, value_num);
CREATE INDEX idx_properties_key_text ON properties(key, value_text);

CREATE TABLE tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,              -- user tags now; global crowd tags P3
  scope TEXT NOT NULL DEFAULT 'user'       -- user | global
);
CREATE TABLE topping_tags (
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  tag_id     TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (topping_id, tag_id)
);
CREATE INDEX idx_topping_tags_tag ON topping_tags(tag_id);

-- ── Views (ADR-006, ADR-014) ───────────────────────────────────────────────

CREATE TABLE views (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT REFERENCES folders(id),  -- NULL ⇒ smart folder (query-scoped)
  name       TEXT NOT NULL,
  layout     TEXT NOT NULL,                -- renderer registry key: masonry|list|table|board|gallery|map|...
  config     TEXT NOT NULL,                -- JSON: filters AST, sorts, group_by, visible props, subtree
  kind       TEXT NOT NULL DEFAULT 'shared', -- shared | personal
  owner_id   TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  position   REAL NOT NULL                 -- tab order
);
CREATE INDEX idx_views_folder ON views(folder_id);

-- Per-view manual ordering: fractional index keys — one write per drag-drop.
CREATE TABLE view_order (
  view_id    TEXT NOT NULL REFERENCES views(id),
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  order_key  TEXT NOT NULL,
  PRIMARY KEY (view_id, topping_id)
);

-- ── Sharing (ADR-005, dormant until P1) ────────────────────────────────────

CREATE TABLE grants (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT NOT NULL REFERENCES folders(id),
  grantee    TEXT NOT NULL,                -- user id | invite-link token
  role       TEXT NOT NULL CHECK (role IN ('viewer','editor')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_grants_folder ON grants(folder_id);

-- ── Search ─────────────────────────────────────────────────────────────────

CREATE VIRTUAL TABLE toppings_fts USING fts5(
  topping_id UNINDEXED,
  title, body, tags
);

-- ── Datasets (ADR-007..011) ────────────────────────────────────────────────
-- Actual dataset tables (health_sleep, oura_readiness, ...) are created per
-- connector manifest by the host. This registry tracks them.

CREATE TABLE datasets (
  table_name   TEXT PRIMARY KEY,           -- e.g. 'health_sleep'
  kind         TEXT NOT NULL,              -- canonical | extension
  schema_ver   TEXT NOT NULL,
  connector_id TEXT,                       -- NULL for canonical multi-source tables
  created_at   TEXT NOT NULL
);

CREATE TABLE source_priority (              -- ADR-011: user-orderable provider precedence
  table_name TEXT NOT NULL,
  source     TEXT NOT NULL,
  priority   INTEGER NOT NULL,
  PRIMARY KEY (table_name, source)
);

CREATE TABLE fx_rates (                     -- ADR-010: currency converts at query time
  day      TEXT NOT NULL,                  -- ISO date
  currency TEXT NOT NULL,                  -- ISO 4217
  eur_rate REAL NOT NULL,
  PRIMARY KEY (day, currency)
);

CREATE TABLE connector_state (
  connector_id TEXT PRIMARY KEY,
  installed_at TEXT NOT NULL,
  last_pull    TEXT,
  status       TEXT NOT NULL DEFAULT 'ok'  -- ok | auth_required | error | disabled
);
`},{version:2,name:`status_and_ratings`,sql:`
CREATE TABLE status_sets (
  id     TEXT PRIMARY KEY,                 -- 'read' | 'watch' | 'visit' | 'buy' | 'do' | custom uuid
  name   TEXT NOT NULL,
  labels TEXT NOT NULL                     -- JSON: slot → label, e.g. {"queued":"Want to read",...}
);

CREATE TABLE status_set_bindings (
  set_id      TEXT NOT NULL REFERENCES status_sets(id),
  match_kind  TEXT NOT NULL,               -- 'schema_type' | 'tag'
  match_value TEXT NOT NULL,               -- 'Book' | 'Place' | tag id
  PRIMARY KEY (match_kind, match_value)
);

CREATE TABLE interactions (
  owner_id    TEXT NOT NULL DEFAULT 'local',
  entity_kind TEXT NOT NULL DEFAULT 'url', -- 'url' now; extensible (ADR: rate anything)
  entity_key  TEXT NOT NULL,               -- trimmed-URL hash; never the carrier file's content_hash
  set_id      TEXT REFERENCES status_sets(id),
  slot        TEXT CHECK (slot IN ('queued','active','done','dropped')),
  rating      REAL,                        -- canonical 0-10; display maps to user preference
  note        TEXT,
  status_at   TEXT,
  rated_at    TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (owner_id, entity_kind, entity_key)
);
CREATE INDEX idx_interactions_slot ON interactions(owner_id, slot);

INSERT INTO status_sets (id, name, labels) VALUES
  ('read',  'Reading',  '{"queued":"Want to read","active":"Reading","done":"Read","dropped":"Abandoned"}'),
  ('watch', 'Watching', '{"queued":"Watchlist","active":"Watching","done":"Watched","dropped":"Dropped"}'),
  ('visit', 'Places',   '{"queued":"Want to go","done":"Been"}'),
  ('buy',   'Shopping', '{"queued":"Want it","done":"Bought","dropped":"Returned"}'),
  ('do',    'Tasks',    '{"queued":"To do","active":"Doing","done":"Done","dropped":"Dropped"}');

INSERT INTO status_set_bindings (set_id, match_kind, match_value) VALUES
  ('read',  'schema_type', 'Book'),
  ('read',  'schema_type', 'Article'),
  ('watch', 'schema_type', 'Movie'),
  ('watch', 'schema_type', 'TVSeries'),
  ('visit', 'schema_type', 'Place'),
  ('visit', 'schema_type', 'Restaurant'),
  ('buy',   'schema_type', 'Product');
`},{version:3,name:`thumbnails`,sql:`
ALTER TABLE toppings ADD COLUMN thumb_aspect REAL;   -- width / height
ALTER TABLE toppings ADD COLUMN thumb_color  TEXT;   -- dominant color, e.g. '#a2b3c4'
`},{version:4,name:`multi_axis_status`,sql:`
CREATE TABLE interactions_v4 (
  owner_id    TEXT NOT NULL DEFAULT 'local',
  entity_kind TEXT NOT NULL DEFAULT 'url',
  entity_key  TEXT NOT NULL,
  set_id      TEXT NOT NULL REFERENCES status_sets(id),
  slot        TEXT CHECK (slot IN ('queued','active','done','dropped')),
  rating      REAL,
  note        TEXT,
  status_at   TEXT,
  rated_at    TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (owner_id, entity_kind, entity_key, set_id)
);
INSERT INTO interactions_v4
  SELECT owner_id, entity_kind, entity_key, COALESCE(set_id, 'do'), slot, rating, note, status_at, rated_at, updated_at
  FROM interactions;
DROP TABLE interactions;
ALTER TABLE interactions_v4 RENAME TO interactions;
CREATE INDEX idx_interactions_slot ON interactions(owner_id, slot);
`},{version:5,name:`topping_entity_refs`,sql:`
CREATE TABLE topping_entities (
  topping_id  TEXT NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_key  TEXT NOT NULL,
  PRIMARY KEY (topping_id, entity_kind)
);
CREATE INDEX idx_topping_entities_identity
  ON topping_entities(entity_kind, entity_key);
`},{version:6,name:`url_entity_aliases`,sql:`
ALTER TABLE topping_entities ADD COLUMN alias_key TEXT;

CREATE TABLE url_entity_aliases (
  alias_key          TEXT PRIMARY KEY,
  entity_key         TEXT NOT NULL,
  candidate_key      TEXT NOT NULL,
  normalizer_version INTEGER NOT NULL,
  provider           TEXT,
  provider_key       TEXT,
  evidence           TEXT NOT NULL,
  state              TEXT NOT NULL CHECK (state IN ('resolved','conflict')),
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_url_entity_aliases_entity
  ON url_entity_aliases(entity_key);
`},{version:7,name:`topping_stat_columns`,sql:`
ALTER TABLE toppings ADD COLUMN stat_size  INTEGER;
ALTER TABLE toppings ADD COLUMN stat_mtime INTEGER;
`},{version:8,name:`local_file_content_search`,sql:`
CREATE TABLE content_documents (
  topping_id       TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash      TEXT NOT NULL,
  media_type       TEXT NOT NULL,
  extractor_id     TEXT NOT NULL,
  extractor_version INTEGER NOT NULL,
  status           TEXT NOT NULL CHECK (
    status IN ('pending','indexed','needs_ocr','locked','unsupported','failed')
  ),
  page_count       INTEGER,
  detail           TEXT,
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_content_documents_status
  ON content_documents(status, updated_at);

CREATE VIRTUAL TABLE content_chunks_fts USING fts5(
  topping_id UNINDEXED,
  anchor_page UNINDEXED,
  ordinal UNINDEXED,
  text
);
`},{version:9,name:`local_link_preview_evidence`,sql:`
CREATE TABLE link_preview_evidence (
  topping_id          TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash         TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  transport           TEXT NOT NULL CHECK (
    transport IN ('share-target','rich-paste','manual','extension-dom','native-fetch')
  ),
  status              TEXT NOT NULL CHECK (status IN ('ready','denied','malformed')),
  observed_at         TEXT NOT NULL,
  collector_id        TEXT NOT NULL,
  collector_version   INTEGER NOT NULL,
  title_text          TEXT,
  title_provenance    TEXT,
  description_text    TEXT,
  description_provenance TEXT,
  site_name_text      TEXT,
  site_name_provenance TEXT,
  hero_ref            TEXT,
  hero_media_type     TEXT,
  hero_alt            TEXT,
  hero_provenance     TEXT,
  favicon_ref         TEXT,
  favicon_media_type  TEXT,
  favicon_provenance  TEXT
);
`},{version:10,name:`local_work_governor_state`,sql:`
CREATE TABLE local_work_state (
  kind       TEXT NOT NULL CHECK (kind IN ('meta','revision','job')),
  key        TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, key)
);
`},{version:11,name:`local_list_topping_type`,sql:`
CREATE TABLE toppings_v11 AS SELECT * FROM toppings;
CREATE TABLE properties_v11 AS SELECT * FROM properties;
CREATE TABLE topping_tags_v11 AS SELECT * FROM topping_tags;
CREATE TABLE view_order_v11 AS SELECT * FROM view_order;
CREATE TABLE topping_entities_v11 AS SELECT * FROM topping_entities;
CREATE TABLE content_documents_v11 AS SELECT * FROM content_documents;
CREATE TABLE link_preview_evidence_v11 AS SELECT * FROM link_preview_evidence;

DROP TABLE properties;
DROP TABLE topping_tags;
DROP TABLE view_order;
DROP TABLE topping_entities;
DROP TABLE content_documents;
DROP TABLE link_preview_evidence;
DROP TABLE toppings;

CREATE TABLE toppings (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('note','link','file','dash','list')),
  folder_id    TEXT NOT NULL REFERENCES folders(id),
  title        TEXT NOT NULL,
  content_ref  TEXT,
  content_hash TEXT,
  thumb_ref    TEXT,
  blurhash     TEXT,
  owner_id     TEXT,
  source       TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  thumb_aspect REAL,
  thumb_color  TEXT,
  stat_size    INTEGER,
  stat_mtime   INTEGER
);
INSERT INTO toppings (
  id, type, folder_id, title, content_ref, content_hash, thumb_ref, blurhash,
  owner_id, source, created_at, updated_at, deleted_at, thumb_aspect,
  thumb_color, stat_size, stat_mtime
)
SELECT
  id, type, folder_id, title, content_ref, content_hash, thumb_ref, blurhash,
  owner_id, source, created_at, updated_at, deleted_at, thumb_aspect,
  thumb_color, stat_size, stat_mtime
FROM toppings_v11;
DROP TABLE toppings_v11;

CREATE INDEX idx_toppings_folder ON toppings(folder_id, type);
CREATE INDEX idx_toppings_folder_updated ON toppings(folder_id, updated_at);
CREATE INDEX idx_toppings_updated ON toppings(updated_at);
CREATE INDEX idx_toppings_hash ON toppings(content_hash);

CREATE TABLE properties (
  topping_id  TEXT NOT NULL REFERENCES toppings(id),
  key         TEXT NOT NULL,
  kind        TEXT NOT NULL,
  value_text  TEXT,
  value_num   REAL,
  value_aux   TEXT,
  PRIMARY KEY (topping_id, key)
);
INSERT INTO properties SELECT * FROM properties_v11;
DROP TABLE properties_v11;
CREATE INDEX idx_properties_key_num ON properties(key, value_num);
CREATE INDEX idx_properties_key_text ON properties(key, value_text);

CREATE TABLE topping_tags (
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  tag_id     TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (topping_id, tag_id)
);
INSERT INTO topping_tags SELECT * FROM topping_tags_v11;
DROP TABLE topping_tags_v11;
CREATE INDEX idx_topping_tags_tag ON topping_tags(tag_id);

CREATE TABLE view_order (
  view_id    TEXT NOT NULL REFERENCES views(id),
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  order_key  TEXT NOT NULL,
  PRIMARY KEY (view_id, topping_id)
);
INSERT INTO view_order SELECT * FROM view_order_v11;
DROP TABLE view_order_v11;

CREATE TABLE topping_entities (
  topping_id  TEXT NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_key  TEXT NOT NULL,
  alias_key   TEXT,
  PRIMARY KEY (topping_id, entity_kind)
);
INSERT INTO topping_entities SELECT * FROM topping_entities_v11;
DROP TABLE topping_entities_v11;
CREATE INDEX idx_topping_entities_identity
  ON topping_entities(entity_kind, entity_key);

CREATE TABLE content_documents (
  topping_id         TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash        TEXT NOT NULL,
  media_type         TEXT NOT NULL,
  extractor_id       TEXT NOT NULL,
  extractor_version  INTEGER NOT NULL,
  status             TEXT NOT NULL CHECK (
    status IN ('pending','indexed','needs_ocr','locked','unsupported','failed')
  ),
  page_count         INTEGER,
  detail             TEXT,
  updated_at         TEXT NOT NULL
);
INSERT INTO content_documents SELECT * FROM content_documents_v11;
DROP TABLE content_documents_v11;
CREATE INDEX idx_content_documents_status
  ON content_documents(status, updated_at);

CREATE TABLE link_preview_evidence (
  topping_id          TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash         TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  transport           TEXT NOT NULL CHECK (
    transport IN ('share-target','rich-paste','manual','extension-dom','native-fetch')
  ),
  status              TEXT NOT NULL CHECK (status IN ('ready','denied','malformed')),
  observed_at         TEXT NOT NULL,
  collector_id        TEXT NOT NULL,
  collector_version   INTEGER NOT NULL,
  title_text          TEXT,
  title_provenance    TEXT,
  description_text    TEXT,
  description_provenance TEXT,
  site_name_text      TEXT,
  site_name_provenance TEXT,
  hero_ref            TEXT,
  hero_media_type     TEXT,
  hero_alt             TEXT,
  hero_provenance     TEXT,
  favicon_ref         TEXT,
  favicon_media_type  TEXT,
  favicon_provenance  TEXT
);
INSERT INTO link_preview_evidence SELECT * FROM link_preview_evidence_v11;
DROP TABLE link_preview_evidence_v11;
`},{version:12,name:`drop_list_topping_type`,sql:`
CREATE TABLE toppings_v12 AS SELECT * FROM toppings;
CREATE TABLE properties_v12 AS SELECT * FROM properties;
CREATE TABLE topping_tags_v12 AS SELECT * FROM topping_tags;
CREATE TABLE view_order_v12 AS SELECT * FROM view_order;
CREATE TABLE topping_entities_v12 AS SELECT * FROM topping_entities;
CREATE TABLE content_documents_v12 AS SELECT * FROM content_documents;
CREATE TABLE link_preview_evidence_v12 AS SELECT * FROM link_preview_evidence;

DROP TABLE properties;
DROP TABLE topping_tags;
DROP TABLE view_order;
DROP TABLE topping_entities;
DROP TABLE content_documents;
DROP TABLE link_preview_evidence;
DROP TABLE toppings;

CREATE TABLE toppings (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('note','link','file','dash')),
  folder_id    TEXT NOT NULL REFERENCES folders(id),
  title        TEXT NOT NULL,
  content_ref  TEXT,
  content_hash TEXT,
  thumb_ref    TEXT,
  blurhash     TEXT,
  owner_id     TEXT,
  source       TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  thumb_aspect REAL,
  thumb_color  TEXT,
  stat_size    INTEGER,
  stat_mtime   INTEGER
);
INSERT INTO toppings (
  id, type, folder_id, title, content_ref, content_hash, thumb_ref, blurhash,
  owner_id, source, created_at, updated_at, deleted_at, thumb_aspect,
  thumb_color, stat_size, stat_mtime
)
SELECT
  id,
  CASE WHEN type = 'list' THEN 'file' ELSE type END,
  folder_id, title, content_ref, content_hash, thumb_ref, blurhash,
  owner_id, source, created_at, updated_at, deleted_at, thumb_aspect,
  thumb_color, stat_size, stat_mtime
FROM toppings_v12;
DROP TABLE toppings_v12;

CREATE INDEX idx_toppings_folder ON toppings(folder_id, type);
CREATE INDEX idx_toppings_folder_updated ON toppings(folder_id, updated_at);
CREATE INDEX idx_toppings_updated ON toppings(updated_at);
CREATE INDEX idx_toppings_hash ON toppings(content_hash);

CREATE TABLE properties (
  topping_id  TEXT NOT NULL REFERENCES toppings(id),
  key         TEXT NOT NULL,
  kind        TEXT NOT NULL,
  value_text  TEXT,
  value_num   REAL,
  value_aux   TEXT,
  PRIMARY KEY (topping_id, key)
);
INSERT INTO properties SELECT * FROM properties_v12;
DROP TABLE properties_v12;
CREATE INDEX idx_properties_key_num ON properties(key, value_num);
CREATE INDEX idx_properties_key_text ON properties(key, value_text);

CREATE TABLE topping_tags (
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  tag_id     TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (topping_id, tag_id)
);
INSERT INTO topping_tags SELECT * FROM topping_tags_v12;
DROP TABLE topping_tags_v12;
CREATE INDEX idx_topping_tags_tag ON topping_tags(tag_id);

CREATE TABLE view_order (
  view_id    TEXT NOT NULL REFERENCES views(id),
  topping_id TEXT NOT NULL REFERENCES toppings(id),
  order_key  TEXT NOT NULL,
  PRIMARY KEY (view_id, topping_id)
);
INSERT INTO view_order SELECT * FROM view_order_v12;
DROP TABLE view_order_v12;

CREATE TABLE topping_entities (
  topping_id  TEXT NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_key  TEXT NOT NULL,
  alias_key   TEXT,
  PRIMARY KEY (topping_id, entity_kind)
);
INSERT INTO topping_entities SELECT * FROM topping_entities_v12;
DROP TABLE topping_entities_v12;
CREATE INDEX idx_topping_entities_identity
  ON topping_entities(entity_kind, entity_key);

CREATE TABLE content_documents (
  topping_id         TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash        TEXT NOT NULL,
  media_type         TEXT NOT NULL,
  extractor_id       TEXT NOT NULL,
  extractor_version  INTEGER NOT NULL,
  status             TEXT NOT NULL CHECK (
    status IN ('pending','indexed','needs_ocr','locked','unsupported','failed')
  ),
  page_count         INTEGER,
  detail             TEXT,
  updated_at         TEXT NOT NULL
);
INSERT INTO content_documents SELECT * FROM content_documents_v12;
DROP TABLE content_documents_v12;
CREATE INDEX idx_content_documents_status
  ON content_documents(status, updated_at);

CREATE TABLE link_preview_evidence (
  topping_id          TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_hash         TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  transport           TEXT NOT NULL CHECK (
    transport IN ('share-target','rich-paste','manual','extension-dom','native-fetch')
  ),
  status              TEXT NOT NULL CHECK (status IN ('ready','denied','malformed')),
  observed_at         TEXT NOT NULL,
  collector_id        TEXT NOT NULL,
  collector_version   INTEGER NOT NULL,
  title_text          TEXT,
  title_provenance    TEXT,
  description_text    TEXT,
  description_provenance TEXT,
  site_name_text      TEXT,
  site_name_provenance TEXT,
  hero_ref            TEXT,
  hero_media_type     TEXT,
  hero_alt             TEXT,
  hero_provenance     TEXT,
  favicon_ref         TEXT,
  favicon_media_type  TEXT,
  favicon_provenance  TEXT
);
INSERT INTO link_preview_evidence SELECT * FROM link_preview_evidence_v12;
DROP TABLE link_preview_evidence_v12;
`},{version:13,name:`rowid_addressed_fts_deletion`,sql:`
CREATE TABLE toppings_fts_rows (
  fts_rowid  INTEGER PRIMARY KEY,
  topping_id TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  tags       TEXT NOT NULL
);
INSERT INTO toppings_fts_rows (fts_rowid, topping_id, title, body, tags)
SELECT f.rowid, f.topping_id, f.title, f.body, f.tags
  FROM toppings_fts f
  JOIN (
    SELECT topping_id, MAX(rowid) AS rowid
      FROM toppings_fts
     GROUP BY topping_id
  ) latest ON latest.rowid = f.rowid;
DROP TABLE toppings_fts;

CREATE VIRTUAL TABLE toppings_fts USING fts5(
  topping_id UNINDEXED,
  title,
  body,
  tags,
  content = 'toppings_fts_rows',
  content_rowid = 'fts_rowid'
);
CREATE TRIGGER toppings_fts_rows_ai AFTER INSERT ON toppings_fts_rows BEGIN
  INSERT INTO toppings_fts (rowid, topping_id, title, body, tags)
  VALUES (new.fts_rowid, new.topping_id, new.title, new.body, new.tags);
END;
CREATE TRIGGER toppings_fts_rows_ad AFTER DELETE ON toppings_fts_rows BEGIN
  INSERT INTO toppings_fts (toppings_fts, rowid, topping_id, title, body, tags)
  VALUES ('delete', old.fts_rowid, old.topping_id, old.title, old.body, old.tags);
END;
CREATE TRIGGER toppings_fts_rows_au AFTER UPDATE ON toppings_fts_rows BEGIN
  INSERT INTO toppings_fts (toppings_fts, rowid, topping_id, title, body, tags)
  VALUES ('delete', old.fts_rowid, old.topping_id, old.title, old.body, old.tags);
  INSERT INTO toppings_fts (rowid, topping_id, title, body, tags)
  VALUES (new.fts_rowid, new.topping_id, new.title, new.body, new.tags);
END;
INSERT INTO toppings_fts(toppings_fts) VALUES('rebuild');

CREATE TABLE content_chunks_fts_rows (
  fts_rowid  INTEGER PRIMARY KEY,
  topping_id TEXT NOT NULL,
  anchor_page INTEGER NOT NULL,
  ordinal    INTEGER NOT NULL,
  text       TEXT NOT NULL
);
CREATE INDEX idx_content_chunks_fts_rows_topping
  ON content_chunks_fts_rows(topping_id);
INSERT INTO content_chunks_fts_rows (
  fts_rowid, topping_id, anchor_page, ordinal, text
)
SELECT rowid, topping_id, anchor_page, ordinal, text FROM content_chunks_fts;
DROP TABLE content_chunks_fts;

CREATE VIRTUAL TABLE content_chunks_fts USING fts5(
  topping_id UNINDEXED,
  anchor_page UNINDEXED,
  ordinal UNINDEXED,
  text,
  content = 'content_chunks_fts_rows',
  content_rowid = 'fts_rowid'
);
CREATE TRIGGER content_chunks_fts_rows_ai AFTER INSERT ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (rowid, topping_id, anchor_page, ordinal, text)
  VALUES (new.fts_rowid, new.topping_id, new.anchor_page, new.ordinal, new.text);
END;
CREATE TRIGGER content_chunks_fts_rows_ad AFTER DELETE ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (
    content_chunks_fts, rowid, topping_id, anchor_page, ordinal, text
  )
  VALUES (
    'delete', old.fts_rowid, old.topping_id, old.anchor_page, old.ordinal, old.text
  );
END;
CREATE TRIGGER content_chunks_fts_rows_au AFTER UPDATE ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (
    content_chunks_fts, rowid, topping_id, anchor_page, ordinal, text
  )
  VALUES (
    'delete', old.fts_rowid, old.topping_id, old.anchor_page, old.ordinal, old.text
  );
  INSERT INTO content_chunks_fts (rowid, topping_id, anchor_page, ordinal, text)
  VALUES (new.fts_rowid, new.topping_id, new.anchor_page, new.ordinal, new.text);
END;
INSERT INTO content_chunks_fts(content_chunks_fts) VALUES('rebuild');
`},{version:14,name:`attachment_reference_projection`,sql:`
CREATE TABLE attachment_reference_documents (
  source_topping_id TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_path       TEXT NOT NULL,
  source_hash       TEXT NOT NULL
);
CREATE TABLE attachment_reference_candidates (
  source_topping_id TEXT NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  reference_ordinal INTEGER NOT NULL,
  candidate_path    TEXT NOT NULL,
  priority          INTEGER NOT NULL,
  PRIMARY KEY (source_topping_id, reference_ordinal, priority)
);
CREATE INDEX idx_attachment_reference_candidates_path
  ON attachment_reference_candidates(
    candidate_path,
    source_topping_id,
    reference_ordinal,
    priority
  );
CREATE INDEX idx_toppings_source_content_ref_live
  ON toppings(source, content_ref, deleted_at);
`},{version:15,name:`private_entity_projection`,sql:`
CREATE TABLE private_entity_active_vault (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  vault_id   TEXT NOT NULL
);

CREATE TABLE private_entity_mirror_migrations (
  vault_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  completed_at  TEXT NOT NULL,
  orphan_count  INTEGER NOT NULL CHECK (orphan_count >= 0),
  PRIMARY KEY (vault_id, name)
);

CREATE TABLE private_entity_url_refs (
  topping_id         TEXT PRIMARY KEY,
  scheme             TEXT NOT NULL,
  value              TEXT NOT NULL,
  issuer             TEXT,
  derivation_id      TEXT NOT NULL,
  derivation_version INTEGER NOT NULL
);
CREATE INDEX idx_private_entity_url_refs_identifier
  ON private_entity_url_refs(scheme, value, issuer);

CREATE TABLE private_entity_bindings (
  topping_id        TEXT PRIMARY KEY,
  entity_id         TEXT NOT NULL,
  binding_record_id TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_private_entity_bindings_entity
  ON private_entity_bindings(entity_id);

CREATE TABLE private_entity_identifier_claims (
  claim_record_id   TEXT PRIMARY KEY,
  entity_id         TEXT NOT NULL,
  scheme            TEXT NOT NULL,
  value             TEXT NOT NULL,
  issuer            TEXT,
  derivation_id     TEXT,
  derivation_version INTEGER
);
CREATE INDEX idx_private_entity_identifier_claims_identifier
  ON private_entity_identifier_claims(scheme, value, issuer, entity_id);

CREATE TABLE private_entity_marks (
  mark_record_id TEXT NOT NULL UNIQUE,
  entity_id      TEXT NOT NULL,
  set_id         TEXT NOT NULL REFERENCES status_sets(id),
  slot           TEXT CHECK (slot IN ('queued','active','done','dropped')),
  rating         REAL,
  note           TEXT,
  status_at      TEXT,
  rated_at       TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, set_id)
);
CREATE INDEX idx_private_entity_marks_slot
  ON private_entity_marks(slot, entity_id);
CREATE INDEX idx_private_entity_marks_rating
  ON private_entity_marks(rating, entity_id);

CREATE TABLE private_entity_toppings (
  topping_id  TEXT PRIMARY KEY,
  entity_id   TEXT,
  resolution  TEXT NOT NULL CHECK (
    resolution IN ('binding','identifier','ambiguous')
  )
);
CREATE INDEX idx_private_entity_toppings_entity
  ON private_entity_toppings(entity_id, topping_id);

CREATE TABLE private_entity_projection_issues (
  issue_key  TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  detail     TEXT NOT NULL,
  record_ids TEXT NOT NULL
);

CREATE VIEW private_entity_effective_marks AS
SELECT
  t.topping_id,
  m.entity_id,
  m.set_id,
  m.slot,
  m.rating,
  m.note,
  m.status_at,
  m.rated_at,
  m.updated_at
FROM private_entity_toppings t
JOIN private_entity_marks m ON m.entity_id = t.entity_id
WHERE t.resolution != 'ambiguous'
UNION ALL
SELECT
  te.topping_id,
  NULL AS entity_id,
  i.set_id,
  i.slot,
  i.rating,
  i.note,
  i.status_at,
  i.rated_at,
  i.updated_at
FROM topping_entities te
JOIN interactions i
  ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
WHERE i.owner_id = 'local'
  AND NOT EXISTS (
    SELECT 1
      FROM private_entity_active_vault active
      JOIN private_entity_mirror_migrations migration
        ON migration.vault_id = active.vault_id
       AND migration.name = 'url-bridge-v1'
     WHERE active.singleton = 1
  )
  AND NOT EXISTS (
    SELECT 1
      FROM private_entity_toppings private_topping
      JOIN private_entity_marks private_mark
        ON private_mark.entity_id = private_topping.entity_id
     WHERE private_topping.topping_id = te.topping_id
       AND private_mark.set_id = i.set_id
  );
`},{version:16,name:`video_object_status_binding`,sql:`
INSERT INTO status_set_bindings (set_id, match_kind, match_value)
VALUES ('watch', 'schema_type', 'VideoObject');
`},{version:17,name:`typed_link_preview_records`,sql:`
ALTER TABLE link_preview_evidence ADD COLUMN schema_type TEXT;
ALTER TABLE link_preview_evidence ADD COLUMN schema_type_provenance TEXT;
`},{version:18,name:`rich_typed_link_preview_records`,sql:`
ALTER TABLE link_preview_evidence ADD COLUMN typed_properties_json TEXT;
ALTER TABLE link_preview_evidence ADD COLUMN media_json TEXT;
`},{version:19,name:`local_semantic_embedding_projection`,sql:`
CREATE TABLE semantic_model_state (
  model_id          TEXT PRIMARY KEY,
  model_revision    TEXT NOT NULL,
  processor_version INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('requested','ready','failed','removing')),
  expected_bytes    INTEGER NOT NULL CHECK (expected_bytes > 0),
  received_bytes    INTEGER NOT NULL DEFAULT 0 CHECK (received_bytes >= 0),
  error_class       TEXT,
  requested_at      TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE semantic_embedding_documents (
  topping_id        TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  source_revision   TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  model_revision    TEXT NOT NULL,
  processor_version INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('pending','indexed','failed')),
  segment_count     INTEGER NOT NULL DEFAULT 0 CHECK (segment_count >= 0),
  error_class       TEXT,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_semantic_embedding_documents_status
  ON semantic_embedding_documents(status, updated_at);

CREATE TABLE semantic_embeddings (
  topping_id        TEXT NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  source_revision   TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  model_revision    TEXT NOT NULL,
  processor_version INTEGER NOT NULL,
  segment_kind      TEXT NOT NULL CHECK (segment_kind IN ('topping','content')),
  anchor_page       INTEGER NOT NULL DEFAULT 0 CHECK (anchor_page >= 0),
  ordinal           INTEGER NOT NULL CHECK (ordinal >= 0),
  snippet           TEXT NOT NULL,
  dimensions        INTEGER NOT NULL CHECK (dimensions > 0),
  vector            BLOB NOT NULL,
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (topping_id, segment_kind, anchor_page, ordinal)
);
CREATE INDEX idx_semantic_embeddings_model
  ON semantic_embeddings(model_id, model_revision, processor_version);

CREATE TABLE semantic_query_requests (
  request_id        TEXT PRIMARY KEY,
  source_revision   TEXT NOT NULL,
  query_text        TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  model_revision    TEXT NOT NULL,
  processor_version INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('queued','completed','failed','cancelled')),
  dimensions        INTEGER,
  vector            BLOB,
  error_class       TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_semantic_query_requests_status
  ON semantic_query_requests(status, created_at);
`},{version:20,name:`asserted_schema_type`,sql:`
ALTER TABLE toppings ADD COLUMN asserted_schema_type TEXT;
`},{version:21,name:`reconcile_drifted_fts_titles`,sql:`
UPDATE toppings_fts_rows
   SET title = (SELECT t.title FROM toppings t WHERE t.id = toppings_fts_rows.topping_id)
 WHERE title != (SELECT t.title FROM toppings t WHERE t.id = toppings_fts_rows.topping_id);
`},{version:22,name:`materialization_provenance`,sql:`
ALTER TABLE link_preview_evidence ADD COLUMN written_values_json TEXT;
ALTER TABLE link_preview_evidence ADD COLUMN asset_origins_json TEXT;
`},{version:23,name:`link_preview_ratings`,sql:`
ALTER TABLE link_preview_evidence ADD COLUMN ratings_json TEXT;
`},{version:24,name:`display_thumbnail_rendition`,sql:`
ALTER TABLE toppings ADD COLUMN thumb_display_ref TEXT;
`},{version:25,name:`identity_materialization_provenance`,sql:`
CREATE TABLE identity_materialization_provenance (
  topping_id          TEXT PRIMARY KEY REFERENCES toppings(id) ON DELETE CASCADE,
  written_values_json TEXT,
  asset_origins_json  TEXT,
  recorded_at         TEXT NOT NULL
);
`},{version:26,name:`retire_private_entity_legacy_projection`,sql:`
DROP VIEW private_entity_effective_marks;
CREATE VIEW private_entity_effective_marks AS
SELECT
  t.topping_id,
  m.entity_id,
  m.set_id,
  m.slot,
  m.rating,
  m.note,
  m.status_at,
  m.rated_at,
  m.updated_at
FROM private_entity_toppings t
JOIN private_entity_marks m ON m.entity_id = t.entity_id
WHERE t.resolution != 'ambiguous';

DROP TABLE private_entity_mirror_migrations;
DROP TABLE private_entity_active_vault;
DROP TABLE topping_entities;
DROP TABLE interactions;
`},{version:27,name:`timestamp_content_anchors`,sql:`
DROP TRIGGER content_chunks_fts_rows_ai;
DROP TRIGGER content_chunks_fts_rows_ad;
DROP TRIGGER content_chunks_fts_rows_au;
DROP TABLE content_chunks_fts;

CREATE TABLE content_chunks_fts_rows_v2 (
  fts_rowid       INTEGER PRIMARY KEY,
  topping_id      TEXT NOT NULL,
  anchor_page     INTEGER,
  anchor_start_ms INTEGER,
  anchor_end_ms   INTEGER,
  ordinal         INTEGER NOT NULL,
  text            TEXT NOT NULL,
  CHECK ((anchor_page IS NOT NULL) + (anchor_start_ms IS NOT NULL) = 1),
  CHECK (anchor_start_ms IS NULL OR (anchor_end_ms > anchor_start_ms AND anchor_start_ms >= 0))
);
INSERT INTO content_chunks_fts_rows_v2 (
  fts_rowid, topping_id, anchor_page, anchor_start_ms, anchor_end_ms, ordinal, text
)
SELECT fts_rowid, topping_id, anchor_page, NULL, NULL, ordinal, text
  FROM content_chunks_fts_rows;
DROP TABLE content_chunks_fts_rows;
ALTER TABLE content_chunks_fts_rows_v2 RENAME TO content_chunks_fts_rows;
CREATE INDEX idx_content_chunks_fts_rows_topping
  ON content_chunks_fts_rows(topping_id);

CREATE VIRTUAL TABLE content_chunks_fts USING fts5(
  topping_id UNINDEXED,
  anchor_page UNINDEXED,
  anchor_start_ms UNINDEXED,
  anchor_end_ms UNINDEXED,
  ordinal UNINDEXED,
  text,
  content = 'content_chunks_fts_rows',
  content_rowid = 'fts_rowid'
);
CREATE TRIGGER content_chunks_fts_rows_ai AFTER INSERT ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (
    rowid, topping_id, anchor_page, anchor_start_ms, anchor_end_ms, ordinal, text
  )
  VALUES (
    new.fts_rowid, new.topping_id, new.anchor_page, new.anchor_start_ms,
    new.anchor_end_ms, new.ordinal, new.text
  );
END;
CREATE TRIGGER content_chunks_fts_rows_ad AFTER DELETE ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (
    content_chunks_fts, rowid, topping_id, anchor_page, anchor_start_ms,
    anchor_end_ms, ordinal, text
  )
  VALUES (
    'delete', old.fts_rowid, old.topping_id, old.anchor_page, old.anchor_start_ms,
    old.anchor_end_ms, old.ordinal, old.text
  );
END;
CREATE TRIGGER content_chunks_fts_rows_au AFTER UPDATE ON content_chunks_fts_rows BEGIN
  INSERT INTO content_chunks_fts (
    content_chunks_fts, rowid, topping_id, anchor_page, anchor_start_ms,
    anchor_end_ms, ordinal, text
  )
  VALUES (
    'delete', old.fts_rowid, old.topping_id, old.anchor_page, old.anchor_start_ms,
    old.anchor_end_ms, old.ordinal, old.text
  );
  INSERT INTO content_chunks_fts (
    rowid, topping_id, anchor_page, anchor_start_ms, anchor_end_ms, ordinal, text
  )
  VALUES (
    new.fts_rowid, new.topping_id, new.anchor_page, new.anchor_start_ms,
    new.anchor_end_ms, new.ordinal, new.text
  );
END;
INSERT INTO content_chunks_fts(content_chunks_fts) VALUES('rebuild');
`}];async function o(e){await e.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`);let t=(await e.exec(`SELECT MAX(version) AS v FROM schema_migrations`))[0]?.v??0,n=a.at(-1).version;if(t>n)throw Error(`This library index uses schema v${t}, newer than this build understands (v${n}). Update Waffle to continue — your files are untouched.`);for(let n of a)n.version<=t||await e.transaction(async e=>{(await e.exec(`SELECT 1 AS ok FROM schema_migrations WHERE version = ?`,[n.version])).length>0||(await e.exec(n.sql),await e.exec(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`,[n.version,n.name,new Date().toISOString()]))});return(await e.exec(`SELECT MAX(version) AS v FROM schema_migrations`))[0]?.v??0}var s=`waffle:sqlite-index`,c=3e3,l=class extends Error{diagnostic;constructor(e,t){super(e),this.diagnostic=t,this.name=`WebDbStartupError`}},u=class{send;tail=Promise.resolve();transactionFault=null;constructor(e){this.send=e}exec(e,t){return this.runExclusive(()=>this.send(e,t))}transaction(e){return this.runExclusive(()=>this.runTransaction(e))}runExclusive(e){let t=this.tail.then(()=>{if(this.transactionFault)throw this.transactionFault;return e()});return this.tail=t.catch(()=>void 0),t}async runTransaction(e){let t=!1,n=!1,r=[],i,a=!1,o={scope:`transaction`,exec:(e,t)=>{if(!n)return Promise.reject(Error(`SQLite transaction executor is no longer active`));let o=this.send(e,t);return r.push(o.then(()=>void 0,e=>{a||(i=e),a=!0})),o}};try{await this.send(`BEGIN IMMEDIATE`),t=!0,n=!0;let s,c,l=!1;try{s=await e(o)}catch(e){l=!0,c=e}finally{n=!1}if(await Promise.all(r),l)throw c;if(a)throw i;return await this.send(`COMMIT`),t=!1,s}catch(e){if(n=!1,t)try{await this.send(`ROLLBACK`)}catch(e){let t=e instanceof Error?e.message:String(e);this.transactionFault=Error(`SQLite rollback failed; reload before using the index again (${t})`)}throw e}}},d=class{ready;worker=null;releaseOwnership=null;nextId=1;pending=new Map;commands=new u((e,t)=>this.send(e,t));constructor(){this.ready=this.initialize()}initialize(){if(!(`locks`in navigator))return Promise.reject(new l(`This browser cannot safely coordinate Waffle’s persistent index because Web Locks are unavailable. Your files are untouched.`,{kind:`ownership-unavailable`}));let e=new AbortController,t=!1;return new Promise((n,r)=>{let i=setTimeout(()=>{t||e.abort()},c);navigator.locks.request(s,{mode:`exclusive`,signal:e.signal},async()=>{t=!0,clearTimeout(i);let e,a=new Promise(t=>{e=t});this.releaseOwnership=e;try{let e=await this.startWorker();n(e),e.storage===`opfs-sahpool`&&await a}catch(e){r(e)}finally{this.releaseOwnership===e&&(this.releaseOwnership=null),e()}}).catch(n=>{if(clearTimeout(i),t)return;if(e.signal.aborted){r(new l(`Another Waffle tab is using this browser library. Close it, then try again. Waffle did not open a temporary in-memory index.`,{kind:`ownership-timeout`,waitedMs:c}));return}let a=n instanceof Error?`${n.name}: ${n.message}`:String(n);r(new l(`Waffle could not acquire its browser-index lock (${a}). Your files are untouched.`,{kind:`ownership-failed`,cause:a}))})})}startWorker(){let e=new Worker(new URL(`/assets/sqlite.worker-DcGqZHHx.js`,``+import.meta.url),{type:`module`});return this.worker=e,new Promise((t,n)=>{let r=!1,i=t=>{r||(r=!0,n(t));for(let e of this.pending.values())e.reject(t);this.pending.clear(),e.terminate(),this.worker===e&&(this.worker=null),this.releaseOwnership?.(),this.releaseOwnership=null},a=n=>{let o=n.data;if(o.kind===`ready`)if(e.removeEventListener(`message`,a),o.ok)r=!0,t({storage:o.storage,sqliteVersion:o.sqliteVersion,warning:o.error,recovery:o.recovery});else{let e=new l(o.error??`SQLite worker failed to start`,o.diagnostic);i(e)}};e.addEventListener(`message`,a),e.addEventListener(`message`,e=>{let t=e.data;if(t.kind!==`result`)return;let n=this.pending.get(t.id);n&&(this.pending.delete(t.id),t.ok?n.resolve(t.rows??[]):n.reject(Error(t.error)))}),e.addEventListener(`error`,()=>{i(Error(`Waffle’s SQLite worker stopped unexpectedly. Reload to reopen the local index; your files are untouched.`))}),e.addEventListener(`messageerror`,()=>{i(Error(`Waffle could not read a SQLite worker response. Reload to reopen the local index; your files are untouched.`))})})}exec(e,t){return this.commands.exec(e,t)}transaction(e){return this.commands.transaction(e)}corruptIndexForDev(){return Promise.reject(Error(`Index corruption probe is unavailable outside development.`))}send(e,t){return this.sendMessage({kind:`exec`,sql:e,params:t})}sendMessage(e){let t=this.worker;if(t===null)return Promise.reject(Error(`SQLite worker is unavailable. Reload Waffle to reopen the local index.`));let n=this.nextId++;return new Promise((r,i)=>{this.pending.set(n,{resolve:r,reject:i}),t.postMessage({...e,id:n})})}},f=()=>{throw Error(`Use getVaultFs() (platform/instance.ts) — platform.fs is not the web vault seam`)},p={atomicPublicationCapabilities:Object.freeze({present:!1,absent:!1}),pickRoot:f,read:f,statFile:f,write:f,preflightAtomicPublication:f,replaceFileAtomically:f,preflightAtomicRelocation:f,preflightAtomicRelocationToSyncStaging:f,relocateFileAtomically:f,relocateFileToSyncStagingAtomically:f,createDirectory:f,removeEmptyDirectory:f,move:f,remove:f,list:f,watch:f};function m(){let e=new d;return{db:e,dbReady:e.ready,fs:p,net:{fetch:(e,t)=>fetch(e,t)}}}var h=e({getActiveVaultId:()=>x,getVaultFs:()=>b,getVaultGeneration:()=>S,platform:()=>g,platformReady:()=>w,setVaultFs:()=>C}),g=m(),_=(()=>{let e=`waffle-identity-writer`;try{let t=localStorage.getItem(e);if(t)return t;let n=crypto.randomUUID();return localStorage.setItem(e,n),n}catch{return crypto.randomUUID()}})(),v=i().then(e=>(n(e,_),e)),y=0,b=()=>v,x=async()=>t(await v,async e=>e.vaultId),S=()=>y,C=e=>{v.then(e=>r(e)).catch(()=>void 0),n(e,_),v=Promise.resolve(e),y+=1},w=(async()=>{let e=await g.dbReady,t=await o(g.db);return{storage:e.storage,sqliteVersion:e.sqliteVersion,schemaVersion:t,warning:e.warning,recovery:e.recovery}})();export{g as a,h as i,b as n,w as o,S as r,C as s,x as t};