import{a as e}from"./instance-ClO57FH2.js";import{Bn as t}from"./src-CtugEJLq.js";function n(e){return`COALESCE(LOWER(${e}.content_ref), '') NOT LIKE '%.base'`}function r(e=`t`){return`(
    ${n(e)}
    AND (
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
    )
  )`}function i(e=`t`){return`(${e}.type = 'link' OR ${e}.asserted_schema_type IS NOT NULL)`}var a=new Intl.Collator,o=()=>Object.create(null),s=500;async function c(e,t){let n=[...new Set(t)].sort(),r=new Set;for(let t=0;t<n.length;t+=s){let i=n.slice(t,t+s),a=await e.exec(`SELECT DISTINCT t.content_ref
         FROM properties p JOIN toppings t ON t.id = p.topping_id
        WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref IS NOT NULL
          AND p.key IN (${i.map(()=>`?`).join(`,`)})`,i);for(let e of a)r.add(e.content_ref)}return[...r].sort()}function l(t){return c(e.db,t)}async function u(t){let n=t?`AND t.folder_id = ?`:``;return d(await e.db.exec(`SELECT p.key, p.kind, COUNT(*) AS item_count
       FROM properties p JOIN toppings t ON t.id = p.topping_id
      WHERE t.deleted_at IS NULL AND ${r(`t`)} ${n}
      GROUP BY p.key, p.kind
      ORDER BY p.key, item_count DESC, p.kind`,t?[t]:[])).map(({key:e,kind:t})=>({key:e,kind:t}))}function d(e){let t=new Map;for(let n of e){let e=t.get(n.key);(!e||n.item_count>e.item_count||n.item_count===e.item_count&&n.kind.localeCompare(e.kind)<0)&&t.set(n.key,n)}return[...t.values()].sort((e,t)=>e.key.localeCompare(t.key)).map(({key:e,kind:t,item_count:n})=>({key:e,kind:t,itemCount:n}))}async function f(t){let n=t===null?``:`AND t.folder_id = ?`,i=t===null?[]:[t],[a,o]=await Promise.all([e.db.exec(`SELECT COUNT(*) AS live_item_count
         FROM toppings t
        WHERE t.deleted_at IS NULL
          AND ${r(`t`)} ${n}`,i),e.db.exec(`SELECT p.key, p.kind, COUNT(DISTINCT t.id) AS item_count
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.deleted_at IS NULL
          AND ${r(`t`)} ${n}
        GROUP BY p.key, p.kind
        ORDER BY p.key, item_count DESC, p.kind`,i)]);return{liveItemCount:a[0]?.live_item_count??0,fields:d(o)}}async function p(t){let n=t?`AND t.folder_id = ?`:``,i=await e.db.exec(`SELECT p.key,
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
       AND ${r(`t`)}
       AND p.kind IN ('text', 'select') ${n}
     GROUP BY p.key ORDER BY p.key`,t?[t]:[]),a=typeof Intl.supportedValuesOf==`function`?new Set(Intl.supportedValuesOf(`currency`)):null;return i.filter(e=>e.invalid>0||!e.codes?!1:e.codes.split(`,`).every(e=>{if(a)return a.has(e);try{return new Intl.NumberFormat(`en`,{style:`currency`,currency:e}),!0}catch{return!1}})).map(e=>e.key)}async function m(n,i={}){if(i.itemIds?.length===0)return new Map;let a=[],s=[`t.deleted_at IS NULL`,r(`t`)];n&&(s.push(`t.folder_id = ?`),a.push(n)),i.kinds?.length&&(s.push(`p.kind IN (${i.kinds.map(()=>`?`).join(`,`)})`),a.push(...i.kinds)),i.itemIds!==void 0&&i.itemIds.length<=900&&(s.push(`p.topping_id IN (${i.itemIds.map(()=>`?`).join(`,`)})`),a.push(...i.itemIds));let c=await e.db.exec(`SELECT p.topping_id, p.key, p.kind, p.value_text, p.value_num, p.value_aux
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE ${s.join(` AND `)}`,a),l=i.itemIds?new Set(i.itemIds):null,u=new Map;for(let e of c){if(l&&!l.has(e.topping_id))continue;let n=t(e.kind,e.value_text,e.value_num,e.value_aux);if(!n)continue;let r=u.get(e.topping_id);r||u.set(e.topping_id,r=o()),r[e.key]=n}return u}async function h(n,r){let i=await e.db.exec(`SELECT t.id, t.title, t.content_ref, p.key, p.kind, p.value_text, p.value_num, p.value_aux
       FROM toppings t JOIN properties p ON p.topping_id = t.id AND p.key IN (?, ?)
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.type = 'note'`,[n,r]),a=new Map;for(let e of i){let n=t(e.kind,e.value_text,e.value_num,e.value_aux);if(!n)continue;let r=a.get(e.id);r||a.set(e.id,r={id:e.id,title:e.title,contentRef:e.content_ref,props:o()}),r.props[e.key]=n}return[...a.values()]}export{u as a,a as c,f as i,i as l,l as n,m as o,c as r,h as s,p as t,r as u};