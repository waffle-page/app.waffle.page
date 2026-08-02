import{m as e,v as t}from"./src-BHZJQV51.js";import{t as n}from"./preload-helper-Czpn1I53.js";import{ct as r,ot as i,pt as a,st as o,t as s,v as c,x as l,y as u}from"./handleFs-aLQtHgaI.js";var d=[{version:1,name:`init`,sql:`
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
`}];async function f(e){await e.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`);let t=(await e.exec(`SELECT MAX(version) AS v FROM schema_migrations`))[0]?.v??0,n=d.at(-1).version;if(t>n)throw Error(`This library index uses schema v${t}, newer than this build understands (v${n}). Update Waffle to continue — your files are untouched.`);for(let n of d)n.version<=t||await e.transaction(async e=>{(await e.exec(`SELECT 1 AS ok FROM schema_migrations WHERE version = ?`,[n.version])).length>0||(await e.exec(n.sql),await e.exec(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`,[n.version,n.name,new Date().toISOString()]))});return(await e.exec(`SELECT MAX(version) AS v FROM schema_migrations`))[0]?.v??0}var p=`\0`;function m(e,t){let n=e.byFolder.get(t)??0;return n>=3&&e.total>0&&n/e.total>=.7}function ee(e){let t=null;for(let n of e.byFolder.keys())if(m(e,n)){if(t!==null)return null;t=n}return t}function te(e){let t=new Map;for(let[n,r]of e.tallies){let e=ee(r);e!==null&&t.set(n,e)}let n=new Map;for(let r of e.items){let i=null,a=null,o=!1;for(let n of r.signals){let s=e.tallies.get(n),c=t.get(n);if(!(!s||c===void 0||c===r.folderId)&&!m(s,r.folderId)){if(i!==null&&i!==c){o=!0;break}i=c,a??=n}}if(o||i===null||a===null)continue;let s=[i,a].join(p);n.set(s,[...n.get(s)??[],r.toppingId])}let r=[];for(let[t,i]of n){let[n,a]=t.split(p),o=e.tallies.get(a),s=o.byFolder.get(n)??0;i.sort(),r.push({targetFolderId:n,signal:a,toppingIds:i,reason:`${s} of your ${o.total} ${o.label} are here`,fingerprint:[a,...i].join(p)})}return r.sort((e,t)=>t.toppingIds.length-e.toppingIds.length||e.targetFolderId.localeCompare(t.targetFolderId)||e.signal.localeCompare(t.signal)),r}var ne=`waffle:sqlite-index`,h=3e3,g=class extends Error{diagnostic;constructor(e,t){super(e),this.diagnostic=t,this.name=`WebDbStartupError`}},re=class{send;tail=Promise.resolve();transactionFault=null;constructor(e){this.send=e}exec(e,t){return this.runExclusive(()=>this.send(e,t))}transaction(e){return this.runExclusive(()=>this.runTransaction(e))}runExclusive(e){let t=this.tail.then(()=>{if(this.transactionFault)throw this.transactionFault;return e()});return this.tail=t.catch(()=>void 0),t}async runTransaction(e){let t=!1,n=!1,r=[],i,a=!1,o={scope:`transaction`,exec:(e,t)=>{if(!n)return Promise.reject(Error(`SQLite transaction executor is no longer active`));let o=this.send(e,t);return r.push(o.then(()=>void 0,e=>{a||(i=e),a=!0})),o}};try{await this.send(`BEGIN IMMEDIATE`),t=!0,n=!0;let s,c,l=!1;try{s=await e(o)}catch(e){l=!0,c=e}finally{n=!1}if(await Promise.all(r),l)throw c;if(a)throw i;return await this.send(`COMMIT`),t=!1,s}catch(e){if(n=!1,t)try{await this.send(`ROLLBACK`)}catch(e){let t=e instanceof Error?e.message:String(e);this.transactionFault=Error(`SQLite rollback failed; reload before using the index again (${t})`)}throw e}}},ie=class{ready;worker=null;releaseOwnership=null;nextId=1;pending=new Map;commands=new re((e,t)=>this.send(e,t));constructor(){this.ready=this.initialize()}initialize(){if(!(`locks`in navigator))return Promise.reject(new g(`This browser cannot safely coordinate Waffle’s persistent index because Web Locks are unavailable. Your files are untouched.`,{kind:`ownership-unavailable`}));let e=new AbortController,t=!1;return new Promise((n,r)=>{let i=setTimeout(()=>{t||e.abort()},h);navigator.locks.request(ne,{mode:`exclusive`,signal:e.signal},async()=>{t=!0,clearTimeout(i);let e,a=new Promise(t=>{e=t});this.releaseOwnership=e;try{let e=await this.startWorker();n(e),e.storage===`opfs-sahpool`&&await a}catch(e){r(e)}finally{this.releaseOwnership===e&&(this.releaseOwnership=null),e()}}).catch(n=>{if(clearTimeout(i),t)return;if(e.signal.aborted){r(new g(`Another Waffle tab is using this browser library. Close it, then try again. Waffle did not open a temporary in-memory index.`,{kind:`ownership-timeout`,waitedMs:h}));return}let a=n instanceof Error?`${n.name}: ${n.message}`:String(n);r(new g(`Waffle could not acquire its browser-index lock (${a}). Your files are untouched.`,{kind:`ownership-failed`,cause:a}))})})}startWorker(){let e=new Worker(new URL(`/assets/sqlite.worker-DcGqZHHx.js`,``+import.meta.url),{type:`module`});return this.worker=e,new Promise((t,n)=>{let r=!1,i=t=>{r||(r=!0,n(t));for(let e of this.pending.values())e.reject(t);this.pending.clear(),e.terminate(),this.worker===e&&(this.worker=null),this.releaseOwnership?.(),this.releaseOwnership=null},a=n=>{let o=n.data;if(o.kind===`ready`)if(e.removeEventListener(`message`,a),o.ok)r=!0,t({storage:o.storage,sqliteVersion:o.sqliteVersion,warning:o.error,recovery:o.recovery});else{let e=new g(o.error??`SQLite worker failed to start`,o.diagnostic);i(e)}};e.addEventListener(`message`,a),e.addEventListener(`message`,e=>{let t=e.data;if(t.kind!==`result`)return;let n=this.pending.get(t.id);n&&(this.pending.delete(t.id),t.ok?n.resolve(t.rows??[]):n.reject(Error(t.error)))}),e.addEventListener(`error`,()=>{i(Error(`Waffle’s SQLite worker stopped unexpectedly. Reload to reopen the local index; your files are untouched.`))}),e.addEventListener(`messageerror`,()=>{i(Error(`Waffle could not read a SQLite worker response. Reload to reopen the local index; your files are untouched.`))})})}exec(e,t){return this.commands.exec(e,t)}transaction(e){return this.commands.transaction(e)}corruptIndexForDev(){return Promise.reject(Error(`Index corruption probe is unavailable outside development.`))}send(e,t){return this.sendMessage({kind:`exec`,sql:e,params:t})}sendMessage(e){let t=this.worker;if(t===null)return Promise.reject(Error(`SQLite worker is unavailable. Reload Waffle to reopen the local index.`));let n=this.nextId++;return new Promise((r,i)=>{this.pending.set(n,{resolve:r,reject:i}),t.postMessage({...e,id:n})})}},_=()=>{throw Error(`Use getVaultFs() (platform/instance.ts) — platform.fs is not the web vault seam`)},ae={pickRoot:_,read:_,statFile:_,write:_,createDirectory:_,removeEmptyDirectory:_,move:_,remove:_,list:_,watch:_};function oe(){let e=new ie;return{db:e,dbReady:e.ready,fs:ae,net:{fetch:(e,t)=>fetch(e,t)}}}var v=`/vault`;async function y(){return s(await(await navigator.storage.getDirectory()).getDirectoryHandle(`vault`,{create:!0}),v)}var b=oe(),x=(()=>{let e=`waffle-identity-writer`;try{let t=localStorage.getItem(e);if(t)return t;let n=crypto.randomUUID();return localStorage.setItem(e,n),n}catch{return crypto.randomUUID()}})(),S=y().then(e=>(i(e,x),e)),C=0,se=()=>S,ce=async()=>r(await S,async e=>e.vaultId),w=()=>C,T=e=>{S.then(e=>o(e)).catch(()=>void 0),i(e,x),S=Promise.resolve(e),C+=1},E=(async()=>{let e=await b.dbReady,t=await f(b.db);return{storage:e.storage,sqliteVersion:e.sqliteVersion,schemaVersion:t,warning:e.warning,recovery:e.recovery}})();function D(e){return e.home!==`local`||e.path===null?null:e.path===`/`?``:e.path.replace(/^\//,``)}function le(e,t){return t!==``&&e.startsWith(`${t}/`)}function ue(e){if(!e)return null;try{let t=new URL(e);return t.protocol!==`http:`&&t.protocol!==`https:`?null:t.hostname.toLowerCase().replace(/^www\./,``)||null}catch{return null}}function de(e,t,n,r){let i=new Map;for(let e of t)i.set(e.topping_id,[...i.get(e.topping_id)??[],e]);let a=new Map;for(let e of n)a.set(e.topping_id,[...a.get(e.topping_id)??[],e.name]);let o=new Map,s=e.map(e=>{let t=new Set;if(e.type===`link`){let n=i.get(e.id)?.find(e=>e.key===`url`)?.value_text??null,r=ue(n);if(r){let e=`host:${r}`;t.add(e),o.set(e,`${r} links`)}let a=n?c(n):null;if(a){let e=`schema:${a.type}`;t.add(e),o.set(e,`${l(a.type)} links`)}}else{for(let n of i.get(e.id)??[]){let e=`property:${n.key}`;t.add(e),o.set(e,`notes with “${n.key}”`)}for(let n of a.get(e.id)??[]){let e=`tag:${n}`;t.add(e),o.set(e,`#${n} notes`)}}return{toppingId:e.id,folderId:e.folder_id,signals:[...t].sort()}}),u=new Map;for(let e of s)for(let t of e.signals){let n=u.get(t)??{label:o.get(t)??t,byFolder:new Map,total:0};n.byFolder.set(e.folderId,(n.byFolder.get(e.folderId)??0)+1),n.total+=1,u.set(t,n)}let d=new Map(u),f=new Map(e.map(e=>[e.id,e])),p=new Map;for(let e of te({items:s,tallies:d})){let t=r.get(e.targetFolderId);if(!t)continue;let n=p.get(e.targetFolderId)??{target:t,reasons:new Set,fingerprints:[],items:new Map};n.reasons.add(e.reason),n.fingerprints.push(e.fingerprint);for(let t of e.toppingIds){let e=f.get(t);e&&n.items.set(t,{id:t,title:e.title,path:e.content_ref,sourceFolderName:e.folder_name})}p.set(e.targetFolderId,n)}return[...p].flatMap(([e,t])=>{let n=[...t.items.values()].sort((e,t)=>e.id.localeCompare(t.id));return n.length===0?[]:[{targetFolderId:e,targetFolderName:t.target.name,targetFolderPath:t.target.path,reason:[...t.reasons].join(` · `),fingerprint:JSON.stringify(t.fingerprints.sort()),items:n}]}).sort((e,t)=>t.items.length-e.items.length||e.targetFolderId.localeCompare(t.targetFolderId))}function O(e=`t`){return`(
    COALESCE(${e}.source, '') != 'vault'
    OR ${e}.type != 'file'
    OR NOT EXISTS (
      SELECT 1
        FROM attachment_reference_candidates attachment_ref
        JOIN toppings attachment_source
          ON attachment_source.id = attachment_ref.source_topping_id
         AND attachment_source.source = 'vault'
         AND attachment_source.type = 'note'
         AND attachment_source.deleted_at IS NULL
       WHERE attachment_ref.candidate_path = ${e}.content_ref
         AND NOT EXISTS (
           SELECT 1
             FROM attachment_reference_candidates prior_ref
             JOIN toppings prior_asset
               ON prior_asset.source = 'vault'
              AND prior_asset.deleted_at IS NULL
              AND prior_asset.content_ref = prior_ref.candidate_path
            WHERE prior_ref.source_topping_id = attachment_ref.source_topping_id
              AND prior_ref.reference_ordinal = attachment_ref.reference_ordinal
              AND prior_ref.priority < attachment_ref.priority
         )
    )
  )`}async function k(){let e=await b.db.exec(`
    SELECT f.id, f.parent_id, f.name, f.path, f.home,
      (SELECT COUNT(*) FROM toppings t
        WHERE t.folder_id = f.id
          AND t.deleted_at IS NULL
          AND ${O(`t`)}) AS count
    FROM folders f`),t=new Map(e.map(e=>[e.id,{id:e.id,parentId:e.parent_id,name:e.name,count:e.count,vaultPath:D(e),children:[]}])),n=[];for(let e of t.values()){let r=e.parentId?t.get(e.parentId):void 0;r?r.children.push(e):n.push(e)}let r=e=>{e.sort((e,t)=>e.name.localeCompare(t.name)),e.forEach(e=>r(e.children))};return r(n),n}function fe(e){let t=new Map;for(let n of e)!n.thumb_ref||t.has(n.folder_id)||t.set(n.folder_id,{thumbRef:n.thumb_ref,thumbColor:n.thumb_color,...n.updated_at?{updatedAt:n.updated_at}:{}});return t}async function pe(e){let t=[...new Set(e)];if(t.length===0)return new Map;let n=t.map(()=>`?`).join(`,`);return fe(await b.db.exec(`WITH ranked AS (
       SELECT folder_id, thumb_ref, thumb_color, updated_at,
              ROW_NUMBER() OVER (
                PARTITION BY folder_id
                ORDER BY updated_at DESC, id ASC
              ) AS recency_rank
         FROM toppings t
        WHERE t.folder_id IN (${n})
          AND t.deleted_at IS NULL
          AND ${O(`t`)}
          AND NULLIF(thumb_ref, '') IS NOT NULL
     )
     SELECT folder_id, thumb_ref, thumb_color, updated_at
       FROM ranked
      WHERE recency_rank = 1`,t))}var A={key:`$updated`,dir:`desc`},me={sorts:[A],filters:null,groupBy:null};function he({total:e,thumbs:t,docs:n}){return e<4||t/e>=.5?`masonry`:n/e>=.6?`list`:`masonry`}function j(e){if(!Array.isArray(e))return;let n=new Set,r=[];for(let i of e){let e=typeof i==`string`?i:i&&typeof i==`object`&&typeof i.key==`string`?i.key:``;if(!e||e.startsWith(`$`)||n.has(e))continue;n.add(e);let a=i&&typeof i==`object`?t(i.width):160;r.push({key:e,width:a})}return r}function ge(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let t={};for(let[n,r]of Object.entries(e))n&&typeof r==`string`&&r.trim()&&(t[n]=r.trim());return Object.keys(t).length>0?t:void 0}function M(e){if(e===`title`)return[{key:`$title`,dir:`asc`}];if(e===`updated`)return[A];let t=(Array.isArray(e)?e:[e]).flatMap(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return[];let t=e;return typeof t.key!=`string`||!t.key?[]:[{key:t.key,dir:t.dir===`asc`?`asc`:`desc`}]});if(t.find(e=>e.key===`$manual`))return[{key:`$manual`,dir:`asc`}];let n=new Set,r=t.filter(e=>n.has(e.key)?!1:(n.add(e.key),!0));return r.length>0?r:[A]}function N(e){if(typeof e==`string`)return e?{key:e,dir:`asc`}:null;if(!e||typeof e!=`object`)return null;let t=e;return typeof t.key!=`string`||!t.key?null:{key:t.key,dir:t.dir===`desc`?`desc`:`asc`}}function P(e,t){try{let n=JSON.parse(e);return JSON.stringify({layout:n.layout,sorts:M(`sorts`in n?n.sorts:n.sort),filters:n.filters,groupBy:`groupBy`in n?N(n.groupBy):t,columns:Array.isArray(n.columns)?j(n.columns)??null:n.columns??null})}catch{return e}}function F(e){let t=JSON.parse(e),n=M(t.sorts??t.sort);t.colSort&&(n=M(t.colSort));let r=N(t.groupBy),i={sorts:n,filters:t.filters??null,groupBy:r},a=j(t.columns);a&&(i.columns=a);let o=ge(t.propertyLabels);if(o&&(i.propertyLabels=o),t.roles&&typeof t.roles==`object`&&!Array.isArray(t.roles)){let e={};for(let[n,r]of Object.entries(t.roles))typeof r==`string`&&r&&(e[n]=r);Object.keys(e).length>0&&(i.roles=e)}if(Array.isArray(t.hidden)){let e=t.hidden.filter(e=>typeof e==`string`&&e!==``);e.length>0&&(i.hidden=e)}return t.origin&&(i.origin={...t.origin,spec:P(t.origin.spec,r)}),i}async function I(e,t){let n=await e.exec(`SELECT id, name, layout, config, is_default, position FROM views WHERE folder_id IS ? ORDER BY position, name`,[t]);if(n.length===0){let n=`masonry`;if(t!==null){let r=(await e.exec(`SELECT COUNT(*) AS total,
                COUNT(NULLIF(thumb_ref, '')) AS thumbs,
                SUM(CASE WHEN type IN ('note','link') THEN 1 ELSE 0 END) AS docs
           FROM toppings t
          WHERE t.folder_id = ? AND t.deleted_at IS NULL
            AND ${O(`t`)}`,[t]))[0];n=he({total:r?.total??0,thumbs:r?.thumbs??0,docs:r?.docs??0})}let r={id:`v_${t??`root`}`,name:`Default`,layout:n,isDefault:!0,position:1,cfg:me};return await e.exec(`INSERT OR IGNORE INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',1,1)`,[r.id,t,r.name,r.layout,JSON.stringify(r.cfg)]),[r]}let r=n.map(e=>({id:e.id,name:e.name,layout:e.layout,isDefault:e.is_default===1,position:e.position,cfg:F(e.config)}));return r.some(e=>e.isDefault)||(r[0].isDefault=!0),r}function L(e){return I(b.db,e)}async function R(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[t]),i={id:`v_${crypto.randomUUID()}`,name:n.name,layout:n.layout,isDefault:!1,position:(r[0]?.maxpos??0)+1,cfg:n.cfg};return await e.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[i.id,t,i.name,i.layout,JSON.stringify(i.cfg),i.position]),i}function _e(e,t){return R(b.db,e,t)}async function ve(e,t){return b.db.transaction(async n=>{let r=await n.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[e]),i=await n.exec(`SELECT name FROM views WHERE folder_id IS ?`,[e]),a=new Set(i.map(e=>e.name.trim().toLowerCase())),o=[],s=r[0]?.maxpos??0;for(let r of t){let t=r.name.trim().toLowerCase();if(!t||a.has(t))continue;a.add(t);let i={id:`v_${crypto.randomUUID()}`,name:r.name,layout:r.layout,isDefault:!1,position:++s,cfg:r.cfg};await n.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[i.id,e,i.name,i.layout,JSON.stringify(i.cfg),i.position]),o.push(i)}return o})}async function ye(e,t){await b.db.exec(`UPDATE views SET name = ? WHERE id = ?`,[t,e])}async function z(e,t){await e.exec(`DELETE FROM view_order WHERE view_id = ?`,[t]),await e.exec(`DELETE FROM views WHERE id = ?`,[t])}function be(e){return z(b.db,e)}async function xe(e,t){await b.db.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[e]),await b.db.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[t])}async function B(e,t,n,r){await e.exec(`UPDATE views SET layout = ?, config = ? WHERE id = ?`,[n,JSON.stringify(r),t])}function Se(e,t,n){return B(b.db,e,t,n)}async function Ce(e,t,n){await b.db.exec(`INSERT INTO view_order (view_id, topping_id, order_key) VALUES (?,?,?)
       ON CONFLICT(view_id, topping_id) DO UPDATE SET order_key = excluded.order_key`,[e,t,n])}async function V(e,t){let{spacedOrderKeys:r}=await n(async()=>{let{spacedOrderKeys:e}=await import(`./orderKeys-EFJGhdo7.js`);return{spacedOrderKeys:e}},[]),i=r(t.length),a=new Map;return await b.db.transaction(async n=>{for(let r=0;r<t.length;r+=1){let o=t[r],s=i[r];a.set(o,s),await n.exec(`INSERT INTO view_order (view_id, topping_id, order_key) VALUES (?,?,?)
           ON CONFLICT(view_id, topping_id) DO UPDATE SET order_key = excluded.order_key`,[e,o,s])}}),a}async function we(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[n]);await e.exec(`UPDATE views SET folder_id = ?, is_default = 0, position = ? WHERE id = ?`,[n,(r[0]?.maxpos??0)+1,t])}function Te(e){return{list:t=>I(e,t),create:(t,n)=>R(e,t,n),delete:t=>z(e,t),moveToFolder:(t,n)=>we(e,t,n),saveState:(t,n,r)=>B(e,t,n,r)}}var H={eq:`=`,ne:`!=`,lt:`<`,lte:`<=`,gt:`>`,gte:`>=`},U=e=>e.replace(/[\\%_]/g,`\\$&`);function W(e,t){if(e.op!==`cmp`){if(e.children.length===0)return`1`;let n=e.op===`not`?` OR `:` ${e.op.toUpperCase()} `,r=`(`+e.children.map(e=>W(e,t)).join(n)+`)`;return e.op===`not`?`NOT ${r}`:r}if(e.key===`$title`||e.key===`$basename`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.title, ?) > 0`:`t.title ${H[e.cmp]??`=`} ?`;if(e.key===`$name`){let n=String(e.value);t.push(n,`%/${U(n)}`);let r=`(t.content_ref = ? OR t.content_ref LIKE ? ESCAPE '\\')`;return e.cmp===`ne`?`NOT ${r}`:r}if(e.key===`$path`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.content_ref, ?) > 0`:`t.content_ref ${H[e.cmp]??`=`} ?`;if(e.key===`$folder`){let n=`CASE WHEN f.path = '/' THEN '' ELSE SUBSTR(f.path, 2) END`;if(e.cmp===`inFolder`){let r=String(e.value).replace(/^\/+|\/+$/g,``);return t.push(r,`${U(r)}/%`),`(${n} = ? OR ${n} LIKE ? ESCAPE '\\')`}return e.cmp===`startsWith`?(t.push(String(e.value)),`INSTR(${n}, ?) = 1`):(t.push(String(e.value)),e.cmp===`contains`?`INSTR(${n}, ?) > 0`:`${n} ${H[e.cmp]??`=`} ?`)}if(e.key===`$ext`){let n=`%.${U(String(e.value).replace(/^[.]/,``).toLowerCase())}`;return t.push(n),e.cmp===`ne`?`LOWER(t.content_ref) NOT LIKE ? ESCAPE '\\'`:`LOWER(t.content_ref) LIKE ? ESCAPE '\\'`}if(e.key===`$updated`)return t.push(Number(e.value)),`(unixepoch(t.updated_at) * 1000) ${H[e.cmp]??`=`} ?`;if(e.key===`$type`)return t.push(String(e.value)),`t.type = ?`;if(e.key===`$interaction.status`)return t.push(String(e.value)),e.cmp===`ne`?`EXISTS (
        SELECT 1
        FROM private_entity_effective_marks i
        WHERE i.topping_id = t.id AND i.slot IS NOT NULL
      ) AND NOT EXISTS (
        SELECT 1
        FROM private_entity_effective_marks i
        WHERE i.topping_id = t.id AND i.slot = ?
      )`:`EXISTS (
      SELECT 1
      FROM private_entity_effective_marks i
      WHERE i.topping_id = t.id AND i.slot = ?
    )`;if(e.key===`$interaction.rating`)return t.push(Number(e.value)),e.cmp===`ne`?`EXISTS (
        SELECT 1
        FROM private_entity_effective_marks i
        WHERE i.topping_id = t.id AND i.rating IS NOT NULL
      ) AND NOT EXISTS (
        SELECT 1
        FROM private_entity_effective_marks i
        WHERE i.topping_id = t.id AND i.rating = ?
      )`:`EXISTS (
      SELECT 1
      FROM private_entity_effective_marks i
      WHERE i.topping_id = t.id AND i.rating IS NOT NULL
        AND i.rating ${H[e.cmp]??`=`} ?
    )`;if(e.cmp===`tagged`){let n=String(e.value).replace(/^#/,``).toLowerCase();return t.push(n,`${U(n)}/%`),`EXISTS (
      SELECT 1 FROM topping_tags tt JOIN tags g ON g.id = tt.tag_id
      WHERE tt.topping_id = t.id AND (g.name = ? OR g.name LIKE ? ESCAPE '\\')
    )`}return typeof e.value==`number`||typeof e.value==`boolean`?(t.push(e.key,typeof e.value==`boolean`?+!!e.value:e.value),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_num ${H[e.cmp]??`=`} ?)`):e.cmp===`contains`?(t.push(e.key,String(e.value),String(e.value)),`EXISTS (
      SELECT 1 FROM properties p
      WHERE p.topping_id = t.id AND p.key = ?
        AND (
          (p.kind = 'list' AND EXISTS (SELECT 1 FROM json_each(p.value_text) j WHERE CAST(j.value AS TEXT) = ?))
          OR (p.kind != 'list' AND INSTR(p.value_text, ?) > 0)
        )
    )`):(t.push(e.key,String(e.value)),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_text ${H[e.cmp]??`=`} ?)`)}function G(e){if(!e||e.op===`not`||e.op===`or`)return null;if(e.op===`cmp`)return e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`eq`)?String(e.value):null;for(let t of e.children){let e=G(t);if(e!==null)return e}return null}function K(e){return!e||e.op===`not`||e.op===`or`?!1:e.op===`cmp`?e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`startsWith`):e.children.some(K)}function Ee(e,t){return e===null||K(t)}async function De(e,t,n){let r=[],i=``,a,o=t.sorts.length>0?t.sorts:[A],s=o[0]?.key===`$manual`;if(s)i=`LEFT JOIN view_order vo ON vo.topping_id = t.id AND vo.view_id = ?`,r.push(n??``),a=`(vo.order_key IS NULL) ASC, vo.order_key ASC, t.updated_at DESC`;else{let e=[],t=[];for(let[n,i]of o.entries()){let a=i.dir===`asc`?`ASC`:`DESC`;if(i.key===`$updated`)t.push(`t.updated_at ${a}`);else if(i.key===`$created`)t.push(`t.created_at ${a}`);else if(i.key===`$title`||i.key===`$basename`||i.key===`$name`)t.push(`t.title COLLATE NOCASE ${a}`);else if(i.key===`$path`)t.push(`t.content_ref COLLATE NOCASE ${a}`);else if(i.key===`$folder`)t.push(`f.path COLLATE NOCASE ${a}`);else{let o=`s${n}`;e.push(`LEFT JOIN properties ${o} ON ${o}.topping_id = t.id AND ${o}.key = ?`),r.push(i.key),t.push(`(${o}.topping_id IS NULL) ASC`,`${o}.value_num ${a}`,`${o}.value_text COLLATE NOCASE ${a}`)}}i=e.join(` `),a=[...t,`t.id ASC`].join(`, `)}let c=``;e&&!K(t.filters)&&(c+=` AND t.folder_id = ?`,r.push(e)),t.filters&&(c+=` AND ${W(t.filters,r)}`);let l=(await b.db.exec(`SELECT t.id, t.type, t.title, t.content_ref, t.source, f.name AS folder, t.updated_at, t.thumb_ref, t.thumb_color, t.thumb_aspect${s?`, vo.order_key`:``}
     FROM toppings t JOIN folders f ON f.id = t.folder_id ${i}
     WHERE t.deleted_at IS NULL AND ${O(`t`)} ${c}
     ORDER BY ${a}`,r)).map(e=>({id:e.id,type:e.type,title:e.title,subtitle:e.folder,contentRef:e.source===`vault`?e.content_ref:null,updatedAt:e.updated_at,thumbRef:e.thumb_ref,thumbColor:e.thumb_color,aspect:e.thumb_aspect,...s?{orderKey:e.order_key??null}:{}})),u=await Me(l.map(e=>e.id));for(let e of l){let t=u.get(e.id);t&&(e.interactionMarks=t)}return await Oe(l),l}async function q(){let[e,t]=await Promise.all([b.db.exec(`SELECT id, name, labels FROM status_sets`),b.db.exec(`SELECT match_value, set_id FROM status_set_bindings
        WHERE match_kind = 'schema_type'
        ORDER BY match_value, set_id`)]);return{sets:new Map(e.map(e=>[e.id,{id:e.id,name:e.name,labels:Z(e.labels)}])),bindings:t.map(e=>({schemaType:e.match_value,setId:e.set_id}))}}async function Oe(e){let t=e.filter(e=>e.type===`link`);if(t.length===0)return;let[n,r]=await Promise.all([je(t.map(e=>e.id)),q()]);for(let e of t){let t=e.interactionMarks?.[0]?.setId??null,i=t?null:n.get(e.id),a=r.sets.get(u({pinnedSetId:t,schemaType:i?c(i)?.type??null:null,bindings:r.bindings}));a&&(e.statusSet=a)}}async function ke(e,t){let n=Y(e),[r,i]=await Promise.all([n===null?Promise.resolve([]):b.db.exec(`SELECT t.folder_id, p.value_text
       FROM properties p JOIN toppings t ON t.id = p.topping_id
       WHERE p.key = 'url' AND t.type = 'link' AND t.deleted_at IS NULL`),b.db.exec(`SELECT folder_id FROM toppings
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 50`)]),a=e===null?null:c(e),o=new Map,s=new Map;for(let e of r)e.value_text&&(Y(e.value_text)===n&&o.set(e.folder_id,(o.get(e.folder_id)??0)+1),a&&c(e.value_text)?.type===a.type&&s.set(e.folder_id,(s.get(e.folder_id)??0)+1));let u=[];for(let e of i)u.includes(e.folder_id)||u.push(e.folder_id);return{...a?{type:{value:a.type,label:l(a.type),tallies:J(s)}}:{},...n?{domain:{value:n,label:n,tallies:J(o)}}:{},recent:u,currentFolderId:t}}function J(e){return[...e].map(([e,t])=>({folderId:e,count:t}))}function Y(e){if(!e)return null;try{let t=new URL(e);return t.protocol!==`http:`&&t.protocol!==`https:`?null:t.hostname.toLowerCase().replace(/^www\./,``)||null}catch{return null}}async function Ae(){let[e,t,n,r]=await Promise.all([b.db.exec(`SELECT t.id, t.type, t.title, t.folder_id, f.name AS folder_name,
              t.content_ref
         FROM toppings t
         JOIN folders f ON f.id = t.folder_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND t.content_ref IS NOT NULL
          AND t.type IN ('note', 'link')
        ORDER BY t.id`),b.db.exec(`SELECT p.topping_id, p.key, p.value_text
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND (
            t.type = 'note'
            OR (t.type = 'link' AND p.key = 'url')
          )
        ORDER BY p.topping_id, p.key`),b.db.exec(`SELECT tt.topping_id, tags.name
         FROM topping_tags tt
         JOIN tags ON tags.id = tt.tag_id
         JOIN toppings t ON t.id = tt.topping_id
        WHERE t.source = 'vault'
          AND t.type = 'note'
          AND t.deleted_at IS NULL
        ORDER BY tt.topping_id, tags.name`),k()]),i=new Map,a=e=>{e.vaultPath!==null&&i.set(e.id,{name:e.vaultPath===``?`Vault`:e.vaultPath,path:e.vaultPath}),e.children.forEach(a)};return r.forEach(a),de(e,t,n,i)}async function je(e){if(e.length===0)return new Map;let t=e.length<=900,n=await b.db.exec(`SELECT p.topping_id, p.value_text
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE p.key = 'url' AND t.type = 'link'
       ${t?`AND p.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}`,t?e:[]),r=new Set(e),i=new Map;for(let e of n)!e.value_text||!r.has(e.topping_id)||i.set(e.topping_id,e.value_text);return i}var X=new Set([`queued`,`active`,`done`,`dropped`]);async function Me(e){if(e.length===0)return new Map;let t=e.length<=900,n=await b.db.exec(`SELECT i.topping_id, i.set_id, s.name AS set_name, s.labels, i.slot, i.rating
     FROM private_entity_effective_marks i
     JOIN status_sets s ON s.id = i.set_id
     WHERE (i.slot IS NOT NULL OR i.rating IS NOT NULL)
       ${t?`AND i.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}
     ORDER BY i.updated_at DESC, i.set_id`,t?e:[]),r=new Set(e),i=new Map;for(let e of n){if(!r.has(e.topping_id))continue;let t=e.slot&&X.has(e.slot)?e.slot:null,n=Z(e.labels),a={setId:e.set_id,setName:e.set_name,slot:t,statusLabel:t?n[t]??t:null,rating:e.rating},o=i.get(e.topping_id)??[];o.push(a),i.set(e.topping_id,o)}return i}function Z(e){try{let t=JSON.parse(e),n={};for(let e of X)typeof t[e]==`string`&&(n[e]=t[e]);return n}catch{return{}}}function Ne(t){if(!t)return null;switch(t.kind){case`number`:return t.value;case`money`:return t.amount;case`duration`:return t.seconds;case`checkbox`:return+!!t.value;case`date`:return Date.parse(t.iso)||0;default:return e(t).toLowerCase()}}async function Pe(t,n,r){let i=n.key,o=new Map;if(!i.startsWith(`$`)){let e=new Set(r.map(e=>e.id)),t=[];if(r.length>0&&r.length<=2e3){let n=[...e];for(let e=0;e<n.length;e+=500){let r=n.slice(e,e+500);t.push(...await b.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
           FROM properties p
           WHERE p.key = ? AND p.topping_id IN (${r.map(()=>`?`).join(`,`)})`,[i,...r]))}}else r.length>0&&t.push(...await b.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
         FROM properties p JOIN toppings t ON t.id = p.topping_id
         WHERE t.deleted_at IS NULL AND p.key = ?`,[i]));for(let n of t){if(!e.has(n.topping_id))continue;let t=a(n.kind,n.value_text,n.value_num,n.value_aux);t&&o.set(n.topping_id,t)}}let s=new Map;for(let t of r){let n=o.get(t.id),r=i===`$title`||i===`$basename`?t.title:i===`$name`?t.contentRef?.split(`/`).pop()??null:i===`$path`?t.contentRef??null:i===`$folder`?t.contentRef?.split(`/`).slice(0,-1).join(`/`)??null:i===`$ext`?t.contentRef?.split(`.`).pop()?.toLowerCase()??null:i===`$updated`?t.updatedAt??null:i===`$type`?t.type:null,a=n?e(n):r||`No ${i}`,c=n?Ne(n):r?i===`$updated`?Date.parse(r):r.toLowerCase():null,l=s.get(a)??{order:c,items:[]};l.items.push(t),s.set(a,l)}let c=n.dir===`desc`?-1:1,l=[...s.entries()].sort(([,e],[,t])=>e.order===null?1:t.order===null?-1:typeof e.order==`number`&&typeof t.order==`number`?(e.order-t.order)*c:String(e.order).localeCompare(String(t.order))*c);return{items:l.flatMap(([,e])=>e.items),groups:l.map(([e,t])=>({label:e,count:t.items.length}))}}async function Fe(e){let t=await b.db.exec(`SELECT t.type, COUNT(*) AS count
       FROM toppings t
      WHERE t.folder_id = ? AND t.deleted_at IS NULL
        AND ${O(`t`)}
      GROUP BY t.type
      ORDER BY type`,[e]);return Object.fromEntries(t.map(e=>[e.type,e.count]))}async function Ie(e){return e.length===0?[]:(await b.db.exec(`SELECT DISTINCT t.content_ref
       FROM properties p JOIN toppings t ON t.id = p.topping_id
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref IS NOT NULL
        AND p.key IN (${e.map(()=>`?`).join(`,`)})`,e)).map(e=>e.content_ref)}async function Le(e){return(await b.db.exec(`SELECT value_text FROM properties WHERE topping_id = ? AND key = 'url'`,[e]))[0]?.value_text??null}async function Re(e){let t=e?`AND t.folder_id = ?`:``;return Q(await b.db.exec(`SELECT p.key, p.kind, COUNT(*) AS item_count
       FROM properties p JOIN toppings t ON t.id = p.topping_id
      WHERE t.deleted_at IS NULL AND ${O(`t`)} ${t}
      GROUP BY p.key, p.kind
      ORDER BY p.key, item_count DESC, p.kind`,e?[e]:[])).map(({key:e,kind:t})=>({key:e,kind:t}))}function Q(e){let t=new Map;for(let n of e){let e=t.get(n.key);(!e||n.item_count>e.item_count||n.item_count===e.item_count&&n.kind.localeCompare(e.kind)<0)&&t.set(n.key,n)}return[...t.values()].sort((e,t)=>e.key.localeCompare(t.key)).map(({key:e,kind:t,item_count:n})=>({key:e,kind:t,itemCount:n}))}async function ze(e){let t=e===null?``:`AND t.folder_id = ?`,n=e===null?[]:[e],[r,i]=await Promise.all([b.db.exec(`SELECT COUNT(*) AS live_item_count
         FROM toppings t
        WHERE t.deleted_at IS NULL
          AND ${O(`t`)} ${t}`,n),b.db.exec(`SELECT p.key, p.kind, COUNT(DISTINCT t.id) AS item_count
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.deleted_at IS NULL
          AND ${O(`t`)} ${t}
        GROUP BY p.key, p.kind
        ORDER BY p.key, item_count DESC, p.kind`,n)]);return{liveItemCount:r[0]?.live_item_count??0,fields:Q(i)}}async function Be(e){let t=e?`AND t.folder_id = ?`:``,n=await b.db.exec(`SELECT p.key,
       SUM(CASE
         WHEN p.value_text IS NULL
           OR LENGTH(TRIM(p.value_text)) != 3
           OR UPPER(TRIM(p.value_text)) GLOB '*[^A-Z]*'
         THEN 1 ELSE 0 END) AS invalid,
       GROUP_CONCAT(DISTINCT CASE
         WHEN p.value_text IS NOT NULL
           AND LENGTH(TRIM(p.value_text)) = 3
           AND UPPER(TRIM(p.value_text)) NOT GLOB '*[^A-Z]*'
         THEN UPPER(TRIM(p.value_text)) END) AS codes
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE t.deleted_at IS NULL
       AND ${O(`t`)}
       AND p.kind IN ('text', 'select') ${t}
     GROUP BY p.key ORDER BY p.key`,e?[e]:[]),r=typeof Intl.supportedValuesOf==`function`?new Set(Intl.supportedValuesOf(`currency`)):null;return n.filter(e=>e.invalid>0||!e.codes?!1:e.codes.split(`,`).every(e=>{if(r)return r.has(e);try{return new Intl.NumberFormat(`en`,{style:`currency`,currency:e}),!0}catch{return!1}})).map(e=>e.key)}async function Ve(e,t={}){if(t.itemIds?.length===0)return new Map;let n=[],r=[`t.deleted_at IS NULL`,O(`t`)];e&&(r.push(`t.folder_id = ?`),n.push(e)),t.kinds?.length&&(r.push(`p.kind IN (${t.kinds.map(()=>`?`).join(`,`)})`),n.push(...t.kinds)),t.itemIds!==void 0&&t.itemIds.length<=900&&(r.push(`p.topping_id IN (${t.itemIds.map(()=>`?`).join(`,`)})`),n.push(...t.itemIds));let i=await b.db.exec(`SELECT p.topping_id, p.key, p.kind, p.value_text, p.value_num, p.value_aux
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE ${r.join(` AND `)}`,n),o=t.itemIds?new Set(t.itemIds):null,s=new Map;for(let e of i){if(o&&!o.has(e.topping_id))continue;let t=a(e.kind,e.value_text,e.value_num,e.value_aux);if(!t)continue;let n=s.get(e.topping_id);n||s.set(e.topping_id,n={}),n[e.key]=t}return s}async function He(e,t){let n=await b.db.exec(`SELECT t.id, t.title, t.content_ref, p.key, p.kind, p.value_text, p.value_num, p.value_aux
       FROM toppings t JOIN properties p ON p.topping_id = t.id AND p.key IN (?, ?)
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.type = 'note'`,[e,t]),r=new Map;for(let e of n){let t=a(e.kind,e.value_text,e.value_num,e.value_aux);if(!t)continue;let n=r.get(e.id);n||r.set(e.id,n={id:e.id,title:e.title,contentRef:e.content_ref,props:{}}),n.props[e.key]=t}return[...r.values()]}async function Ue(){return(await b.db.exec(`SELECT COUNT(*) AS count
       FROM content_documents
      WHERE status = 'pending'`))[0]?.count??0}async function We(e){let t=(await b.db.exec(`SELECT status, media_type, page_count, detail
       FROM content_documents
      WHERE topping_id = ?`,[e]))[0];return t?{status:t.status,mediaType:t.media_type,pageCount:t.page_count,detail:t.detail}:null}function Ge(e){let t=e.replace(/[\u0000-\u001f\u007f]/g,` `).split(/\s+/).filter(Boolean);return t.length===0?null:t.map(e=>`"${e.replaceAll(`"`,`""`)}"*`).join(` `)}function $(e,t){for(let n of e){if(n.id===t)return n;let e=$(n.children,t);if(e)return e}return null}function Ke(e,t){let n=$(e,t);if(!n)return[t];let r=[],i=e=>{r.push(e.id),e.children.forEach(i)};return i(n),r}async function qe(e,t){let n=Ge(e);if(n===null||t!==null&&t.length===0)return{results:[],truncated:!1};let r=[],i=``;t!==null&&(i=`AND t.folder_id IN (${t.map(()=>`?`).join(`,`)})`,r.push(...t));let a=[n,...r,n,...r],o=await b.db.exec(`WITH topping_matches AS (
       SELECT 'topping:' || t.id AS result_key,
              t.id, t.type, t.title, t.content_ref, t.source, t.folder_id,
              f.name AS folder_name,
              highlight(toppings_fts, 1, char(1), char(2)) AS title_marked,
              snippet(toppings_fts, 2, char(1), char(2), '…', 12) AS body_snippet,
              NULL AS anchor_page,
              bm25(toppings_fts, 0.0, 10.0, 1.0, 5.0) AS rank
         FROM toppings_fts
         JOIN toppings t ON t.id = toppings_fts.topping_id
         JOIN folders f ON f.id = t.folder_id
        WHERE toppings_fts MATCH ? AND t.deleted_at IS NULL ${i}
     ),
     content_hits AS (
       SELECT 'pdf:' || t.id || ':' || content_chunks_fts.anchor_page AS result_key,
              t.id, t.type, t.title, t.content_ref, t.source, t.folder_id,
              f.name AS folder_name,
              t.title AS title_marked,
              snippet(content_chunks_fts, 3, char(1), char(2), '…', 18) AS body_snippet,
              CAST(content_chunks_fts.anchor_page AS INTEGER) AS anchor_page,
              CAST(content_chunks_fts.ordinal AS INTEGER) AS ordinal,
              bm25(content_chunks_fts, 0.0, 0.0, 0.0, 1.0) AS rank
         FROM content_chunks_fts
         JOIN toppings t ON t.id = content_chunks_fts.topping_id
         JOIN folders f ON f.id = t.folder_id
        WHERE content_chunks_fts MATCH ? AND t.deleted_at IS NULL ${i}
     ),
     content_ranked AS (
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY id, anchor_page
                ORDER BY rank ASC, ordinal ASC
              ) AS page_match
         FROM content_hits
     ),
     matches AS (
       SELECT * FROM topping_matches
       UNION ALL
       SELECT result_key, id, type, title, content_ref, source, folder_id,
              folder_name, title_marked, body_snippet, anchor_page, rank
         FROM content_ranked
        WHERE page_match = 1
     )
     SELECT *
       FROM matches
      ORDER BY rank ASC, result_key ASC
      LIMIT 101`,a),s=o.length>100;return{results:o.slice(0,100).map(e=>({resultKey:e.result_key,id:e.id,type:e.type,title:e.title,titleMarked:e.title_marked,snippet:e.body_snippet,contentRef:e.source===`vault`?e.content_ref:null,folderId:e.folder_id,folderName:e.folder_name,anchor:e.anchor_page===null?null:{kind:`page`,page:e.anchor_page}})),truncated:s}}async function Je(e){if(e===null)return``;let t=await b.db.exec(`SELECT path, home FROM folders WHERE id = ?`,[e]);return t[0]?D(t[0]):null}export{qe as A,T as B,q as C,Ce as D,ye as E,ce as F,y as H,se as I,w as L,Je as M,Te as N,Se as O,le as P,b as R,He as S,pe as T,v as V,Ie as _,V as a,Re as b,L as c,Fe as d,ke as f,Le as g,De as h,be as i,xe as j,Ee as k,We as l,Pe as m,_e as n,$ as o,k as p,ve as r,G as s,Ke as t,Be as u,Ue as v,Ae as w,Ve as x,ze as y,E as z};