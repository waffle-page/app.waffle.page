import{p as e}from"./src-Dfy0bT-_.js";import{L as t,i as n,w as r}from"./instance-Bam1Oon8.js";var i={id:`waffle-local-capture`,version:1},a=300,o=2e3,s=160,c=500,l=80,u=/^\.waffle\/previews\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/,d=new Set([`image/avif`,`image/gif`,`image/jpeg`,`image/png`,`image/webp`]),f=new Set([`share-target`,`rich-paste`,`manual`,`extension-dom`,`native-fetch`]),p=new Set([`ready`,`denied`,`malformed`]);function m(e,t){let n=e.replace(/\s+/g,` `).trim();return n?n.slice(0,t):null}function h(e,t,n){let r=e===null?null:m(e,n),i=t===null?null:m(t,l);return r&&i?{value:r,provenance:i}:null}function g(e,t,n,r){let i=n===null?null:m(n,l);if(e===null||t===null||!u.test(e)||!d.has(t)||!i)return null;let a=r==null?null:m(r,c);return{ref:e,mediaType:t,provenance:i,...a?{alt:a}:{}}}function _(e){try{let t=new URL(e);return(t.protocol===`http:`||t.protocol===`https:`)&&!!t.hostname}catch{return!1}}function v(e,t,n){if(!t||!_(n)||!f.has(e.transport)||!p.has(e.status??`ready`)||!Number.isInteger(e.collectorVersion??i.version)||(e.collectorVersion??i.version)<1)return null;let r=e.observedAt??new Date().toISOString(),c=m(e.collectorId??i.id,l);if(!c||!Number.isFinite(Date.parse(r)))return null;let u=e.title?h(e.title.value,e.title.provenance,a):null,d=e.description?h(e.description.value,e.description.provenance,o):null,v=e.siteName?h(e.siteName.value,e.siteName.provenance,s):null,y=e.hero?g(e.hero.ref,e.hero.mediaType,e.hero.provenance,e.hero.alt):null,b=e.favicon?g(e.favicon.ref,e.favicon.mediaType,e.favicon.provenance):null,x=e.status??`ready`;return{source_hash:t,source_url:n,transport:e.transport,status:x,observed_at:r,collector_id:c,collector_version:e.collectorVersion??i.version,title_text:u?.value??null,title_provenance:u?.provenance??null,description_text:d?.value??null,description_provenance:d?.provenance??null,site_name_text:v?.value??null,site_name_provenance:v?.provenance??null,hero_ref:y?.ref??null,hero_media_type:y?.mediaType??null,hero_alt:y?.alt??null,hero_provenance:y?.provenance??null,favicon_ref:b?.ref??null,favicon_media_type:b?.mediaType??null,favicon_provenance:b?.provenance??null}}function y(e,t,n){if(e===null||e.source_hash!==t||e.source_url!==n||e.status!==`ready`||!f.has(e.transport)||!Number.isInteger(e.collector_version)||e.collector_version<1||!m(e.collector_id,l)||!Number.isFinite(Date.parse(e.observed_at)))return null;let r=h(e.title_text,e.title_provenance,a),i=h(e.description_text,e.description_provenance,o),c=h(e.site_name_text,e.site_name_provenance,s),u=g(e.hero_ref,e.hero_media_type,e.hero_provenance,e.hero_alt),d=g(e.favicon_ref,e.favicon_media_type,e.favicon_provenance);return!r&&!i&&!c&&!u&&!d?null:{transport:e.transport,observedAt:e.observed_at,collector:{id:e.collector_id,version:e.collector_version},title:r,description:i,siteName:c,hero:u,favicon:d}}async function b(e,t){if(!g(t.ref,t.mediaType,t.provenance,t.alt))return null;try{let n=await e.statFile(t.ref);if(n.size<=0||n.size>8388608)return null;let r=await e.read(t.ref);return r.byteLength<=0||r.byteLength>8388608?null:{bytes:r,mediaType:t.mediaType}}catch{return null}}function x(e){switch(e){case`share-target`:return`Shared page details`;case`rich-paste`:return`From pasted link`;case`manual`:return`Added by you`;case`extension-dom`:return`Saved from browser`;case`native-fetch`:return`Saved on this device`}}var S=`
  source_hash, source_url, transport, status, observed_at,
  collector_id, collector_version, title_text, title_provenance,
  description_text, description_provenance, site_name_text,
  site_name_provenance, hero_ref, hero_media_type, hero_alt,
  hero_provenance, favicon_ref, favicon_media_type, favicon_provenance
`,C=e=>[e.source_hash,e.source_url,e.transport,e.status,e.observed_at,e.collector_id,e.collector_version,e.title_text,e.title_provenance,e.description_text,e.description_provenance,e.site_name_text,e.site_name_provenance,e.hero_ref,e.hero_media_type,e.hero_alt,e.hero_provenance,e.favicon_ref,e.favicon_media_type,e.favicon_provenance];async function w(e,t){return(await n.db.exec(`SELECT t.id, t.content_hash, p.value_text AS source_url
       FROM toppings t
       JOIN properties p ON p.topping_id = t.id AND p.key = 'url'
      WHERE ${e} = ? AND t.type = 'link' AND t.deleted_at IS NULL`,[t]))[0]??null}async function T(e,t){let r=await w(`t.content_ref`,e);if(!r?.content_hash||!r.source_url)return!1;let i=v(t,r.content_hash,r.source_url);return i?(await n.db.exec(`INSERT INTO link_preview_evidence (topping_id, ${S})
     VALUES (?, ${Array.from({length:20},()=>`?`).join(`, `)})
     ON CONFLICT(topping_id) DO UPDATE SET
       source_hash = excluded.source_hash,
       source_url = excluded.source_url,
       transport = excluded.transport,
       status = excluded.status,
       observed_at = excluded.observed_at,
       collector_id = excluded.collector_id,
       collector_version = excluded.collector_version,
       title_text = excluded.title_text,
       title_provenance = excluded.title_provenance,
       description_text = excluded.description_text,
       description_provenance = excluded.description_provenance,
       site_name_text = excluded.site_name_text,
       site_name_provenance = excluded.site_name_provenance,
       hero_ref = excluded.hero_ref,
       hero_media_type = excluded.hero_media_type,
       hero_alt = excluded.hero_alt,
       hero_provenance = excluded.hero_provenance,
       favicon_ref = excluded.favicon_ref,
       favicon_media_type = excluded.favicon_media_type,
       favicon_provenance = excluded.favicon_provenance`,[r.id,...C(i)]),!0):!1}async function E(e,t){let r=await w(`t.id`,e);return!r?.content_hash||r.source_url!==t?null:y((await n.db.exec(`SELECT ${S}
       FROM link_preview_evidence
      WHERE topping_id = ?`,[e]))[0]??null,r.content_hash,t)}async function D(e){let t=(await n.db.exec(e?`SELECT s.id, s.name, s.labels FROM status_set_bindings b JOIN status_sets s ON s.id = b.set_id
         WHERE b.match_kind = 'schema_type' AND b.match_value = ? LIMIT 1`:`SELECT id, name, labels FROM status_sets WHERE id = 'do'`,e?[e]:[]))[0]??{id:`do`,name:`Tasks`,labels:`{}`};return{id:t.id,name:t.name,labels:JSON.parse(t.labels)}}async function O(e,t,i){let a=(await n.db.exec(`SELECT entity_key FROM topping_entities
      WHERE topping_id = ? AND entity_kind = 'url'`,[e]))[0]?.entity_key??await r(t),o=await D(i),s=await n.db.exec(`SELECT slot, rating FROM interactions WHERE owner_id = 'local' AND entity_kind = 'url' AND entity_key = ? AND set_id = ?`,[a,o.id]);return{entityKey:a,set:o,slot:s[0]?.slot??null,rating:s[0]?.rating??null}}async function k(e,t,r,i){let a=new Date().toISOString();await n.db.exec(`INSERT INTO interactions (owner_id, entity_kind, entity_key, set_id, slot, rating, status_at, rated_at, updated_at)
     VALUES ('local', 'url', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(owner_id, entity_kind, entity_key, set_id)
     DO UPDATE SET slot = excluded.slot, rating = excluded.rating,
       status_at = CASE WHEN excluded.slot IS NOT interactions.slot THEN excluded.status_at ELSE interactions.status_at END,
       rated_at = CASE WHEN excluded.rating IS NOT interactions.rating THEN excluded.rated_at ELSE interactions.rated_at END,
       updated_at = excluded.updated_at`,[e,t,r,i,a,a,a])}async function A(r){return(await n.db.exec(`SELECT key, kind, value_text, value_num, value_aux FROM properties WHERE topping_id = ? ORDER BY key`,[r])).flatMap(n=>{let r=t(n.kind,n.value_text,n.value_num,n.value_aux);return r?[{key:n.key,value:e(r)}]:[]})}export{T as a,E as i,A as n,b as o,k as r,x as s,O as t};