import{C as e,S as t,a as n,c as r,o as i,v as a}from"./src-DxOnXMPQ.js";import{a as o}from"./instance-CQn6uUsC.js";import{C as s,Gt as c,S as l,T as u,lt as d}from"./handleFs-DGI7WMkN.js";import{c as f,l as p,u as m}from"./propertyQueries-YxYbNIQ-.js";var h=`Xenova/multilingual-e5-small`,g=`761b726dd34fb83930e26aab4e9ac3899aa1fa78`,ee=140461908,te=512*1024*1024,ne=`local-e5-model`,re=`local-e5-embedding`,_=`query: `,v=`passage: `,ie=2048,ae=1176;function y(e){return e.replace(/\s+/gu,` `).trim()}function b(e){let t=y(e);return t.length<=2048?t:t.slice(0,ie).trimEnd()}function oe(e,t){return(e===`query`?_:v)+b(t)}function se(e){let t=y(e);return t.length<=280?t:`${t.slice(0,279).trimEnd()}…`}function ce(e){return JSON.stringify({model:h,revision:g,version:1,segments:e.map(e=>({kind:e.kind,anchorPage:e.anchorPage,ordinal:e.ordinal,text:b(e.text)}))})}async function x(e){let t=new TextEncoder().encode(ce(e));return[...new Uint8Array(await crypto.subtle.digest(`SHA-256`,t))].map(e=>e.toString(16).padStart(2,`0`)).join(``)}function le(e){return x([{kind:`topping`,anchorPage:null,ordinal:0,text:b(e)}])}function ue(e){if(e.length!==384)throw Error(`Expected 384 embedding dimensions, got ${e.length}`);let t=new Uint8Array(e.length*Float32Array.BYTES_PER_ELEMENT),n=new DataView(t.buffer);for(let t=0;t<e.length;t++){let r=e[t];if(!Number.isFinite(r))throw Error(`Embedding vectors must contain only finite values`);n.setFloat32(t*Float32Array.BYTES_PER_ELEMENT,r,!0)}return t}function S(e){let t=e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):null,n=384*Float32Array.BYTES_PER_ELEMENT;if(!t||t.byteLength!==n)throw Error(`Embedding BLOB must contain exactly ${n} bytes`);let r=new DataView(t.buffer,t.byteOffset,t.byteLength),i=new Float32Array(384);for(let e=0;e<i.length;e++){let t=r.getFloat32(e*Float32Array.BYTES_PER_ELEMENT,!0);if(!Number.isFinite(t))throw Error(`Embedding BLOB contains a non-finite value`);i[e]=t}return i}function C(e,t){if(e.length!==384||t.length!==384)throw Error(`Semantic similarity requires the shared E5 vector space`);let n=0;for(let r=0;r<384;r++)n+=e[r]*t[r];return n}var w=`\0`;function T(e,t){let n=e.byFolder.get(t)??0;return n>=3&&e.total>0&&n/e.total>=.7}function de(e){let t=null;for(let n of e.byFolder.keys())if(T(e,n)){if(t!==null)return null;t=n}return t}function fe(e){let t=new Map;for(let[n,r]of e.tallies){let e=de(r);e!==null&&t.set(n,e)}let n=new Map;for(let r of e.items){let i=null,a=null,o=!1;for(let n of r.signals){let s=e.tallies.get(n),c=t.get(n);if(!(!s||c===void 0||c===r.folderId)&&!T(s,r.folderId)){if(i!==null&&i!==c){o=!0;break}i=c,a??=n}}if(o||i===null||a===null)continue;let s=[i,a].join(w);n.set(s,[...n.get(s)??[],r.toppingId])}let r=[];for(let[t,i]of n){let[n,a]=t.split(w),o=e.tallies.get(a),s=o.byFolder.get(n)??0;i.sort(),r.push({targetFolderId:n,signal:a,toppingIds:i,reason:`${s} of your ${o.total} ${o.label} are here`,fingerprint:[a,...i].join(w)})}return r.sort((e,t)=>t.toppingIds.length-e.toppingIds.length||e.targetFolderId.localeCompare(t.targetFolderId)||e.signal.localeCompare(t.signal)),r}function E(e){return e.home!==`local`||e.path===null?null:e.path===`/`?``:e.path.replace(/^\//,``)}function pe(e,t){return t!==``&&e.startsWith(`${t}/`)}async function D(){let e=await o.db.exec(`
    SELECT f.id, f.parent_id, f.name, f.path, f.home,
      (SELECT COUNT(*) FROM toppings t
        WHERE t.folder_id = f.id
          AND t.deleted_at IS NULL
          AND ${m(`t`)}) AS count
    FROM folders f`),t=new Map(e.map(e=>[e.id,{id:e.id,parentId:e.parent_id,name:e.name,count:e.count,vaultPath:E(e),children:[]}])),n=[];for(let e of t.values()){let r=e.parentId?t.get(e.parentId):void 0;r?r.children.push(e):n.push(e)}let r=e=>{e.sort((e,t)=>f.compare(e.name,t.name)),e.forEach(e=>r(e.children))};return r(n),n}function me(e){let t=new Map;for(let n of e)!n.thumb_ref||t.has(n.folder_id)||t.set(n.folder_id,{thumbRef:n.thumb_ref,thumbColor:n.thumb_color,...n.updated_at?{updatedAt:n.updated_at}:{}});return t}async function he(e){let t=[...new Set(e)];if(t.length===0)return new Map;let n=t.map(()=>`?`).join(`,`);return me(await o.db.exec(`WITH ranked AS (
       SELECT folder_id, thumb_ref, thumb_color, updated_at,
              ROW_NUMBER() OVER (
                PARTITION BY folder_id
                ORDER BY updated_at DESC, id ASC
              ) AS recency_rank
         FROM toppings t
        WHERE t.folder_id IN (${n})
          AND t.deleted_at IS NULL
          AND ${m(`t`)}
          AND NULLIF(thumb_ref, '') IS NOT NULL
     )
     SELECT folder_id, thumb_ref, thumb_color, updated_at
       FROM ranked
      WHERE recency_rank = 1`,t))}async function ge(e){let t=await o.db.exec(`SELECT t.type, COUNT(*) AS count
       FROM toppings t
      WHERE t.folder_id = ? AND t.deleted_at IS NULL
        AND ${m(`t`)}
      GROUP BY t.type
      ORDER BY type`,[e]);return Object.fromEntries(t.map(e=>[e.type,e.count]))}function O(e,t){for(let n of e){if(n.id===t)return n;let e=O(n.children,t);if(e)return e}return null}function _e(e,t){let n=O(e,t);if(!n)return[t];let r=[],i=e=>{r.push(e.id),e.children.forEach(i)};return i(n),r}async function ve(e){if(e===null)return``;let t=await o.db.exec(`SELECT path, home FROM folders WHERE id = ?`,[e]);return t[0]?E(t[0]):null}async function ye(e){let t=(await o.db.exec(`SELECT path, home, name FROM folders WHERE id = ?`,[e]))[0];if(!t)return null;let n=E(t);return n===null?null:{vaultPath:n,name:t.name}}var k={key:`$updated`,dir:`desc`},A={sorts:[k],filters:null,groupBy:null};function be({total:e,thumbs:t,docs:n}){return e<4||t/e>=.5?`masonry`:n/e>=.6?`list`:`masonry`}function xe(t){if(!Array.isArray(t))return;let n=new Set,r=[];for(let i of t){let t=typeof i==`string`?i:i&&typeof i==`object`&&typeof i.key==`string`?i.key:``;if(!t||t.startsWith(`$`)||n.has(t))continue;n.add(t);let a=i&&typeof i==`object`?e(i.width):160;r.push({key:t,width:a})}return r}function Se(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let t=Object.create(null);for(let[n,r]of Object.entries(e))n&&typeof r==`string`&&r.trim()&&(t[n]=r.trim());return Object.keys(t).length>0?t:void 0}function j(e){let t=(Array.isArray(e)?e:[e]).flatMap(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return[];let t=e;return typeof t.key!=`string`||!t.key?[]:[{key:t.key,dir:t.dir===`asc`?`asc`:`desc`}]});if(t.find(e=>e.key===`$manual`))return[{key:`$manual`,dir:`asc`}];let n=new Set,r=t.filter(e=>n.has(e.key)?!1:(n.add(e.key),!0));return r.length>0?r:[k]}function Ce(e){if(typeof e==`string`)return e?{key:e,dir:`asc`}:null;if(!e||typeof e!=`object`)return null;let t=e;return typeof t.key!=`string`||!t.key?null:{key:t.key,dir:t.dir===`desc`?`desc`:`asc`}}function we(e){let t=JSON.parse(e),n={sorts:j(t.sorts??t.sort),filters:t.filters??null,groupBy:Ce(t.groupBy)},r=xe(t.columns);r&&(n.columns=r);let i=Se(t.propertyLabels);if(i&&(n.propertyLabels=i),t.roles&&typeof t.roles==`object`&&!Array.isArray(t.roles)){let e={};for(let[n,r]of Object.entries(t.roles))typeof r==`string`&&r&&(e[n]=r);Object.keys(e).length>0&&(n.roles=e)}if(Array.isArray(t.hidden)){let e=t.hidden.filter(e=>typeof e==`string`&&e!==``);e.length>0&&(n.hidden=e)}return t.home&&typeof t.home.file==`string`&&typeof t.home.node==`string`&&(n.home={file:t.home.file,node:t.home.node}),(t.custody===`home`||t.custody===`foreign`)&&(n.custody=t.custody),typeof t.writeFreeze==`string`&&t.writeFreeze.trim()&&(n.writeFreeze=t.writeFreeze.trim()),n}async function M(e,t){return(await e.exec(`SELECT id, name, layout, config, is_default, position FROM views WHERE folder_id IS ? ORDER BY position, name`,[t])).map(e=>({id:e.id,name:e.name,layout:e.layout,isDefault:e.is_default===1,position:e.position,cfg:we(e.config)}))}async function Te(e,t){let r=`masonry`;if(t!==null){let n=(await e.exec(`SELECT COUNT(*) AS total,
              COUNT(NULLIF(thumb_ref, '')) AS thumbs,
              SUM(CASE WHEN type IN ('note','link') THEN 1 ELSE 0 END) AS docs
         FROM toppings t
        WHERE t.folder_id = ? AND t.deleted_at IS NULL
          AND ${m(`t`)}`,[t]))[0];r=be({total:n?.total??0,thumbs:n?.thumbs??0,docs:n?.docs??0})}return{id:i(t),name:n,layout:r,position:0,isDefault:!0,cfg:{...A,sorts:[...A.sorts]}}}function N(e,t){if(e.id!==`v_${t??`root`}`||e.name!==`Default`||e.layout!==`masonry`&&e.layout!==`list`)return!1;let n=e.cfg,r=n.sorts[0];return Object.keys(n).length===3&&n.filters===null&&n.groupBy===null&&n.sorts.length===1&&r?.key===k.key&&r.dir===k.dir}async function Ee(e){let t=await M(o.db,e);return r(await Te(o.db,e),t.filter(t=>!N(t,e)))}async function P(e,t,n,r=`v_${crypto.randomUUID()}`){let i=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[t]),a={id:r,name:n.name,layout:n.layout,isDefault:!1,position:(i[0]?.maxpos??0)+1,cfg:n.cfg};return await e.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[a.id,t,a.name,a.layout,JSON.stringify(a.cfg),a.position]),a}function De(e,t,n){return P(o.db,e,t,n)}async function Oe(e){return(await o.db.exec(`SELECT id FROM views WHERE folder_id IS ? AND is_default = 1 LIMIT 1`,[e])).length>0}async function ke(e){let t=await o.db.exec(`SELECT name FROM views WHERE folder_id IS ?`,[e]);return new Set(t.map(e=>e.name.trim().toLowerCase()))}function Ae(e,t,n,r){return o.db.transaction(async i=>{let a=await P(i,e,{name:t.name,layout:t.layout,cfg:t.cfg},n);return r?(await i.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[a.id]),{...a,isDefault:!0}):a})}async function je(e,t){return t.length===0?[]:o.db.transaction(async n=>{let r=await n.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[e]),i=[],a=r[0]?.maxpos??0;for(let r of t){let t={id:r.id,name:r.name,layout:r.layout,isDefault:!1,position:++a,cfg:r.cfg};await n.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[t.id,e,t.name,t.layout,JSON.stringify(t.cfg),t.position]),i.push(t)}return i})}async function F(e,t,n){await e.exec(`UPDATE views SET name = ? WHERE id = ?`,[n,t])}function Me(e,t){return F(o.db,e,t)}async function I(e,t){await e.exec(`DELETE FROM view_order WHERE view_id = ?`,[t]),await e.exec(`DELETE FROM views WHERE id = ?`,[t])}function Ne(e){return I(o.db,e)}async function L(e,t,n){await e.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[t]),await e.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[n])}function Pe(e,t){return L(o.db,e,t)}async function R(e,t){await e.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[t])}function Fe(e){return R(o.db,e)}async function z(e,t,n,r){await e.exec(`UPDATE views SET layout = ?, config = ? WHERE id = ?`,[n,JSON.stringify(r),t])}function Ie(e,t,n){return z(o.db,e,t,n)}async function Le(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[n]);await e.exec(`UPDATE views SET folder_id = ?, is_default = 0, position = ? WHERE id = ?`,[n,(r[0]?.maxpos??0)+1,t])}function Re(e){return{list:t=>M(e,t),create:(t,n,r)=>P(e,t,n,r),delete:t=>I(e,t),moveToFolder:(t,n)=>Le(e,t,n),saveState:(t,n,r)=>z(e,t,n,r),setDefault:(t,n)=>L(e,t,n),rename:(t,n)=>F(e,t,n),clearDefault:t=>R(e,t)}}function B(e){return e.asserted??e.evidence??e.derived}function ze(e,t){return!e||!t||e===t?null:{message:`You set ${e}; this URL derives ${t}`,actionLabel:`Use ${t}`,acceptType:t}}async function Be(e){if(e.length===0)return new Map;let t=e.length<=900,n=await o.db.exec(`SELECT p.topping_id, p.value_text
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE p.key = 'url' AND ${p(`t`)}
       ${t?`AND p.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}`,t?e:[]),r=new Set(e),i=new Map;for(let e of n)!e.value_text||!r.has(e.topping_id)||i.set(e.topping_id,e.value_text);return i}async function Ve(e){let t=(await o.db.exec(`SELECT t.id, t.asserted_schema_type, t.thumb_display_ref, p.value_text AS url
       FROM toppings t
       LEFT JOIN properties p ON p.topping_id = t.id AND p.key = 'url'
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref = ?
      LIMIT 1`,[e]))[0];return t?.asserted_schema_type?{toppingId:t.id,assertedSchemaType:t.asserted_schema_type,url:t.url,thumbDisplayRef:t.thumb_display_ref??null}:null}async function He(e){return(await o.db.exec(`SELECT value_text FROM properties WHERE topping_id = ? AND key = 'url'`,[e]))[0]?.value_text??null}var V={eq:`=`,ne:`!=`,lt:`<`,lte:`<=`,gt:`>`,gte:`>=`},H=e=>e.replace(/[\\%_]/g,`\\$&`);function U(e,t){if(e.op!==`cmp`){if(e.children.length===0)return`1`;let n=e.op===`not`?` OR `:` ${e.op.toUpperCase()} `,r=`(`+e.children.map(e=>U(e,t)).join(n)+`)`;return e.op===`not`?`NOT ${r}`:r}if(e.key===`$title`||e.key===`$basename`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.title, ?) > 0`:`t.title ${V[e.cmp]??`=`} ?`;if(e.key===`$name`){let n=String(e.value);t.push(n,`%/${H(n)}`);let r=`(t.content_ref = ? OR t.content_ref LIKE ? ESCAPE '\\')`;return e.cmp===`ne`?`NOT ${r}`:r}if(e.key===`$path`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.content_ref, ?) > 0`:`t.content_ref ${V[e.cmp]??`=`} ?`;if(e.key===`$folder`){let n=`CASE WHEN f.path = '/' THEN '' ELSE SUBSTR(f.path, 2) END`;if(e.cmp===`inFolder`){let r=String(e.value).replace(/^\/+|\/+$/g,``);return t.push(r,`${H(r)}/%`),`(${n} = ? OR ${n} LIKE ? ESCAPE '\\')`}return e.cmp===`startsWith`?(t.push(String(e.value)),`INSTR(${n}, ?) = 1`):(t.push(String(e.value)),e.cmp===`contains`?`INSTR(${n}, ?) > 0`:`${n} ${V[e.cmp]??`=`} ?`)}if(e.key===`$ext`){let n=`%.${H(String(e.value).replace(/^[.]/,``).toLowerCase())}`;return t.push(n),e.cmp===`ne`?`LOWER(t.content_ref) NOT LIKE ? ESCAPE '\\'`:`LOWER(t.content_ref) LIKE ? ESCAPE '\\'`}if(e.key===`$updated`)return t.push(Number(e.value)),`(unixepoch(t.updated_at) * 1000) ${V[e.cmp]??`=`} ?`;if(e.key===`$type`)return t.push(String(e.value)),`t.type = ?`;if(e.key===`$interaction.status`)return t.push(String(e.value)),e.cmp===`ne`?`EXISTS (
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
        AND i.rating ${V[e.cmp]??`=`} ?
    )`;if(e.cmp===`tagged`){let n=String(e.value).replace(/^#/,``).toLowerCase();return t.push(n,`${H(n)}/%`),`EXISTS (
      SELECT 1 FROM topping_tags tt JOIN tags g ON g.id = tt.tag_id
      WHERE tt.topping_id = t.id AND (g.name = ? OR g.name LIKE ? ESCAPE '\\')
    )`}return typeof e.value==`number`||typeof e.value==`boolean`?(t.push(e.key,typeof e.value==`boolean`?+!!e.value:e.value),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_num ${V[e.cmp]??`=`} ?)`):e.cmp===`contains`?(t.push(e.key,String(e.value),String(e.value)),`EXISTS (
      SELECT 1 FROM properties p
      WHERE p.topping_id = t.id AND p.key = ?
        AND (
          (p.kind = 'list' AND EXISTS (SELECT 1 FROM json_each(p.value_text) j WHERE CAST(j.value AS TEXT) = ?))
          OR (p.kind != 'list' AND INSTR(p.value_text, ?) > 0)
        )
    )`):(t.push(e.key,String(e.value)),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_text ${V[e.cmp]??`=`} ?)`)}function W(e){if(!e||e.op===`not`||e.op===`or`)return null;if(e.op===`cmp`)return e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`eq`)?String(e.value):null;for(let t of e.children){let e=W(t);if(e!==null)return e}return null}function G(e){return!e||e.op===`not`||e.op===`or`?!1:e.op===`cmp`?e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`startsWith`):e.children.some(G)}function Ue(e,t){return e===null||G(t)}async function We(e,t,n){let r=[],i=``,a,s=t.sorts.length>0?t.sorts:[k],c=s[0]?.key===`$manual`;if(c)i=`LEFT JOIN view_order vo ON vo.topping_id = t.id AND vo.view_id = ?`,r.push(n??``),a=`(vo.order_key IS NULL) ASC, vo.order_key ASC, t.updated_at DESC`;else{let e=[],t=[];for(let[n,i]of s.entries()){let a=i.dir===`asc`?`ASC`:`DESC`;if(i.key===`$updated`)t.push(`t.updated_at ${a}`);else if(i.key===`$created`)t.push(`t.created_at ${a}`);else if(i.key===`$title`||i.key===`$basename`||i.key===`$name`)t.push(`t.title COLLATE NOCASE ${a}`);else if(i.key===`$path`)t.push(`t.content_ref COLLATE NOCASE ${a}`);else if(i.key===`$folder`)t.push(`f.path COLLATE NOCASE ${a}`);else{let o=`s${n}`;e.push(`LEFT JOIN properties ${o} ON ${o}.topping_id = t.id AND ${o}.key = ?`),r.push(i.key),t.push(`(${o}.topping_id IS NULL) ASC`,`${o}.value_num ${a}`,`${o}.value_text COLLATE NOCASE ${a}`)}}i=e.join(` `),a=[...t,`t.id ASC`].join(`, `)}let l=``;e&&!G(t.filters)&&(l+=` AND t.folder_id = ?`,r.push(e)),t.filters&&(l+=` AND ${U(t.filters,r)}`);let u=(await o.db.exec(`SELECT t.id, t.type, t.title, t.content_ref, t.source, f.name AS folder, t.updated_at, t.thumb_ref, t.thumb_color, t.thumb_aspect, t.asserted_schema_type${c?`, vo.order_key`:``}
     FROM toppings t JOIN folders f ON f.id = t.folder_id ${i}
     WHERE t.deleted_at IS NULL AND ${m(`t`)} ${l}
     ORDER BY ${a}`,r)).map(e=>({id:e.id,type:e.type,title:e.title,subtitle:e.folder,contentRef:e.source===`vault`?e.content_ref:null,assertedSchemaType:e.asserted_schema_type,updatedAt:e.updated_at,thumbRef:e.thumb_ref,thumbColor:e.thumb_color,aspect:e.thumb_aspect,...c?{orderKey:e.order_key??null}:{}})),d=await Ke(u.map(e=>e.id));for(let e of u){let t=d.get(e.id);t&&(e.interactionMarks=t)}return await Ge(u),u}async function K(){let[e,t]=await Promise.all([o.db.exec(`SELECT id, name, labels FROM status_sets`),o.db.exec(`SELECT match_value, set_id FROM status_set_bindings
        WHERE match_kind = 'schema_type'
        ORDER BY match_value, set_id`)]);return{sets:new Map(e.map(e=>[e.id,{id:e.id,name:e.name,labels:J(e.labels)}])),bindings:t.map(e=>({schemaType:e.match_value,setId:e.set_id}))}}async function Ge(e){let n=e.filter(t);if(n.length===0)return;let[r,i]=await Promise.all([Be(n.map(e=>e.id)),K()]);for(let e of n){let t=e.interactionMarks?.[0]?.setId??null,n=e.assertedSchemaType??null,a=t||n?null:r.get(e.id),o=i.sets.get(s({pinnedSetId:t,schemaType:B({asserted:n,evidence:null,derived:a?l(a)?.type??null:null}),bindings:i.bindings}));o&&(e.statusSet=o)}}var q=new Set([`queued`,`active`,`done`,`dropped`]);async function Ke(e){if(e.length===0)return new Map;let t=e.length<=900,n=await o.db.exec(`SELECT i.topping_id, i.set_id, s.name AS set_name, s.labels, i.slot, i.rating
     FROM private_entity_effective_marks i
     JOIN status_sets s ON s.id = i.set_id
     WHERE (i.slot IS NOT NULL OR i.rating IS NOT NULL)
       ${t?`AND i.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}
     ORDER BY i.updated_at DESC, i.set_id`,t?e:[]),r=new Set(e),i=new Map;for(let e of n){if(!r.has(e.topping_id))continue;let t=e.slot&&q.has(e.slot)?e.slot:null,n=J(e.labels),a={setId:e.set_id,setName:e.set_name,slot:t,statusLabel:t?n[t]??t:null,rating:e.rating},o=i.get(e.topping_id)??[];o.push(a),i.set(e.topping_id,o)}return i}function J(e){try{let t=JSON.parse(e),n={};for(let e of q)typeof t[e]==`string`&&(n[e]=t[e]);return n}catch{return{}}}function qe(e,t){switch(e.kind){case`number`:return e.value;case`money`:return e.amount;case`duration`:return e.seconds;case`checkbox`:return+!!e.value;case`date`:return Date.parse(e.iso)||0;default:return t.toLowerCase()}}async function Je(e,t,n){let r=t.key,i=new Map;if(!r.startsWith(`$`)&&n.length>0){let e=JSON.stringify([...new Set(n.map(e=>e.id))]),t=await o.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
       FROM json_each(?) scope
       CROSS JOIN properties p ON p.topping_id = scope.value
       WHERE p.key = ?`,[e,r]),s=new Map;for(let e of t){let t=JSON.stringify([e.kind,e.value_text,e.value_num,e.value_aux]),n=s.get(t);if(n===void 0){let r=c(e.kind,e.value_text,e.value_num,e.value_aux);if(r===null)n=null;else{let e=a(r);n={label:e,order:qe(r,e)}}s.set(t,n)}n&&i.set(e.topping_id,n)}}let s=new Map;for(let e of n){let t=i.get(e.id),n=r===`$title`||r===`$basename`?e.title:r===`$name`?e.contentRef?.split(`/`).pop()??null:r===`$path`?e.contentRef??null:r===`$folder`?e.contentRef?.split(`/`).slice(0,-1).join(`/`)??null:r===`$ext`?e.contentRef?.split(`.`).pop()?.toLowerCase()??null:r===`$updated`?e.updatedAt??null:r===`$type`?e.type:null,a=t?t.label:n||`No ${r}`,o=t?t.order:n?r===`$updated`?Date.parse(n):n.toLowerCase():null,c=s.get(a)??{order:o,items:[]};c.items.push(e),s.set(a,c)}let l=t.dir===`desc`?-1:1,u=[...s.entries()].sort(([,e],[,t])=>e.order===null?1:t.order===null?-1:typeof e.order==`number`&&typeof t.order==`number`?(e.order-t.order)*l:f.compare(String(e.order),String(t.order))*l);return{items:u.flatMap(([,e])=>e.items),groups:u.map(([e,t])=>({label:e,count:t.items.length}))}}function Ye(e){let t={total:0,byType:{},bytes:0,unsized:0};for(let n of e)t.total+=n.item_count,t.byType[n.type]=(t.byType[n.type]??0)+n.item_count,t.bytes+=n.size_bytes??0,t.unsized+=n.unsized_count;return t}async function Xe(){return Ye(await o.db.exec(`SELECT t.type,
            SUM(CASE WHEN ${m(`t`)} THEN 1 ELSE 0 END) AS item_count,
            SUM(t.stat_size) AS size_bytes,
            SUM(CASE WHEN t.stat_size IS NULL THEN 1 ELSE 0 END) AS unsized_count
       FROM toppings t
      WHERE t.source = 'vault'
        AND t.deleted_at IS NULL
      GROUP BY t.type
      ORDER BY t.type`))}async function Ze(){return(await o.db.exec(`SELECT COUNT(*) AS count
       FROM content_documents
      WHERE status = 'pending'`))[0]?.count??0}async function Qe(e){let t=(await o.db.exec(`SELECT status, media_type, page_count, detail
       FROM content_documents
      WHERE topping_id = ?`,[e]))[0];return t?{status:t.status,mediaType:t.media_type,pageCount:t.page_count,detail:t.detail}:null}function Y(e){let t=e.replace(/[\u0000-\u001f\u007f]/g,` `).split(/\s+/).filter(Boolean);return t.length===0?null:t.map(e=>`"${e.replaceAll(`"`,`""`)}"*`).join(` `)}async function $e(e,t){let n=Y(e);if(n===null||t!==null&&t.length===0)return{results:[],truncated:!1};let r=[],i=``;t!==null&&(i=`AND t.folder_id IN (${t.map(()=>`?`).join(`,`)})`,r.push(...t));let a=[n,...r,n,...r],s=await o.db.exec(`WITH topping_matches AS (
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
      LIMIT 101`,a),c=s.length>100;return{results:s.slice(0,100).map(e=>({resultKey:e.result_key,id:e.id,type:e.type,title:e.title,titleMarked:e.title_marked,snippet:e.body_snippet,contentRef:e.source===`vault`?e.content_ref:null,folderId:e.folder_id,folderName:e.folder_name,anchor:e.anchor_page===null?null:{kind:`page`,page:e.anchor_page}})),truncated:c}}function et(e,n,r,i){let a=new Map;for(let e of n)a.set(e.topping_id,[...a.get(e.topping_id)??[],e]);let o=new Map;for(let e of r)o.set(e.topping_id,[...o.get(e.topping_id)??[],e.name]);let s=new Map,c=e.map(e=>{let n=new Set;if(t({type:e.type,assertedSchemaType:e.asserted_schema_type})){let t=a.get(e.id)?.find(e=>e.key===`url`)?.value_text??null,r=d(t);if(r){let e=`host:${r}`;n.add(e),s.set(e,`${r} links`)}let i=e.asserted_schema_type??(t?l(t)?.type??null:null);if(i){let e=`schema:${i}`;n.add(e),s.set(e,`${u(i)} links`)}}else{for(let t of a.get(e.id)??[]){let e=`property:${t.key}`;n.add(e),s.set(e,`notes with “${t.key}”`)}for(let t of o.get(e.id)??[]){let e=`tag:${t}`;n.add(e),s.set(e,`#${t} notes`)}}return{toppingId:e.id,folderId:e.folder_id,signals:[...n].sort()}}),f=new Map;for(let e of c)for(let t of e.signals){let n=f.get(t)??{label:s.get(t)??t,byFolder:new Map,total:0};n.byFolder.set(e.folderId,(n.byFolder.get(e.folderId)??0)+1),n.total+=1,f.set(t,n)}let p=new Map(f),m=new Map(e.map(e=>[e.id,e])),h=new Map;for(let e of fe({items:c,tallies:p})){let t=i.get(e.targetFolderId);if(!t)continue;let n=h.get(e.targetFolderId)??{target:t,reasons:new Set,fingerprints:[],items:new Map};n.reasons.add(e.reason),n.fingerprints.push(e.fingerprint);for(let t of e.toppingIds){let e=m.get(t);e&&n.items.set(t,{id:t,title:e.title,path:e.content_ref,sourceFolderName:e.folder_name})}h.set(e.targetFolderId,n)}return[...h].flatMap(([e,t])=>{let n=[...t.items.values()].sort((e,t)=>e.id.localeCompare(t.id));return n.length===0?[]:[{basis:`signals`,targetFolderId:e,targetFolderName:t.target.name,targetFolderPath:t.target.path,reason:[...t.reasons].join(` · `),fingerprint:JSON.stringify(t.fingerprints.sort()),items:n}]}).sort((e,t)=>t.items.length-e.items.length||e.targetFolderId.localeCompare(t.targetFolderId))}function X(e){let t=0;for(let n of e)t+=n*n;if(!Number.isFinite(t)||t<=2**-52)return null;let n=Math.sqrt(t),r=new Float32Array(384);for(let t=0;t<r.length;t++)r[t]=e[t]/n;return r}function tt(e){if(e.length===0)return null;let t=new Float64Array(384);for(let n of e){if(n.length!==384)return null;for(let e=0;e<n.length;e++){let r=n[e];if(!Number.isFinite(r))return null;t[e]=t[e]+r}}return X(t)}function Z(e,t){if(e.count<=1)return null;let n=new Float64Array(384);for(let r=0;r<n.length;r++)n[r]=e.sum[r]-t.vector[r];return X(n)}function nt(e){let t=new Map;for(let n of e)t.set(n.folderId,[...t.get(n.folderId)??[],n]);let n=new Map;for(let[e,r]of t){if(r.length<3)continue;let t=new Float64Array(384);for(let e of r)for(let n=0;n<e.vector.length;n++)t[n]=t[n]+e.vector[n];let i=X(t);if(!i)continue;let a={folderId:e,count:r.length,sum:t,centroid:i,coherence:0},o=0,s=0;for(let e of r){let t=Z(a,e);t&&(o+=C(e.vector,t),s+=1)}a.coherence=s===r.length?o/s:-1/0,n.set(e,a)}return n}function Q(e){return e.toFixed(2)}function rt(e,t,n=new Set){let r=e.flatMap(e=>{let t=tt(e.vectors);return t?[{...e,vector:t}]:[]}),i=nt(r),a=[...i.values()].filter(e=>e.coherence>=.93&&t.has(e.folderId));if(a.length===0||r.length*a.length>5e5)return[];let o=[];for(let e of r){if(n.has(e.id))continue;let t=i.get(e.folderId);if(t&&t.coherence>=.93){let n=Z(t,e);if(n&&t.count-1>=3&&C(e.vector,n)>=.86)continue}let r=null,s=-1/0,c=-1/0;for(let t of a){if(t.folderId===e.folderId)continue;let n=C(e.vector,t.centroid);n>s?(c=s,r=t,s=n):n>c&&(c=n)}if(!r||s<.86)continue;let l=t?Z(t,e):null;l&&(c=Math.max(c,C(e.vector,l)));let u=c===-1/0?1+s:s-c;u<.05||o.push({item:e,target:r,score:s,margin:u})}let s=new Map;for(let e of o)s.set(e.target.folderId,[...s.get(e.target.folderId)??[],e]);return[...s].flatMap(([e,n])=>{let r=t.get(e);if(!r||n.length===0)return[];n.sort((e,t)=>e.item.id.localeCompare(t.item.id));let i=n[0].target.count,a=Math.min(...n.map(e=>e.score)),o=Math.min(...n.map(e=>e.margin)),s=n.map(({item:e})=>({id:e.id,title:e.title,path:e.path,sourceFolderName:e.folderName}));return[{basis:`semantic`,targetFolderId:e,targetFolderName:r.name,targetFolderPath:r.path,reason:`Each local content vector matches this folder's ${i}-item profile (coherence ${Q(n[0].target.coherence)}) at ${Q(a)} or better, at least ${Q(o)} beyond every alternative`,fingerprint:[`semantic`,h,g,1,...s.map(e=>e.id)].join(`\0`),items:s}]}).sort((e,t)=>t.items.length-e.items.length||e.targetFolderId.localeCompare(t.targetFolderId))}async function it(e,t){let n=d(e),[r,i]=await Promise.all([n===null?Promise.resolve([]):o.db.exec(`SELECT t.folder_id, p.value_text
       FROM properties p JOIN toppings t ON t.id = p.topping_id
       WHERE p.key = 'url' AND ${p(`t`)} AND t.deleted_at IS NULL`),o.db.exec(`SELECT folder_id FROM toppings
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 50`)]),a=e===null?null:l(e),s=new Map,c=new Map;for(let e of r)e.value_text&&(d(e.value_text)===n&&s.set(e.folder_id,(s.get(e.folder_id)??0)+1),a&&l(e.value_text)?.type===a.type&&c.set(e.folder_id,(c.get(e.folder_id)??0)+1));let f=[];for(let e of i)f.includes(e.folder_id)||f.push(e.folder_id);return{...a?{type:{value:a.type,label:u(a.type),tallies:$(c)}}:{},...n?{domain:{value:n,label:n,tallies:$(s)}}:{},recent:f,currentFolderId:t}}function $(e){return[...e].map(([e,t])=>({folderId:e,count:t}))}async function at(){let[e,t,n,r]=await Promise.all([o.db.exec(`SELECT t.id, t.type, t.title, t.folder_id, f.name AS folder_name,
              t.content_ref, t.asserted_schema_type
         FROM toppings t
         JOIN folders f ON f.id = t.folder_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND t.content_ref IS NOT NULL
          AND t.type IN ('note', 'link')
        ORDER BY t.id`),o.db.exec(`SELECT p.topping_id, p.key, p.value_text
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND (
            (NOT ${p(`t`)} AND t.type = 'note')
            OR (${p(`t`)} AND p.key = 'url')
          )
        ORDER BY p.topping_id, p.key`),o.db.exec(`SELECT tt.topping_id, tags.name
         FROM topping_tags tt
         JOIN tags ON tags.id = tt.tag_id
         JOIN toppings t ON t.id = tt.topping_id
        WHERE t.source = 'vault'
          AND t.type = 'note'
          AND NOT ${p(`t`)}
          AND t.deleted_at IS NULL
        ORDER BY tt.topping_id, tags.name`),D()]),i=new Map,a=e=>{e.vaultPath!==null&&i.set(e.id,{name:e.vaultPath===``?`Vault`:e.vaultPath,path:e.vaultPath}),e.children.forEach(a)};return r.forEach(a),et(e,t,n,i)}async function ot(e=new Set){let t=(await o.db.exec(`SELECT COUNT(*) AS total,
            SUM(CASE WHEN document.status = 'indexed'
                      AND document.model_id = ?
                      AND document.model_revision = ?
                      AND document.processor_version = ?
                     THEN 1 ELSE 0 END) AS indexed
       FROM toppings t
       JOIN toppings_fts_rows fts ON fts.topping_id = t.id
       LEFT JOIN semantic_embedding_documents document
         ON document.topping_id = t.id
      WHERE t.source = 'vault'
        AND t.deleted_at IS NULL
        AND t.content_ref IS NOT NULL
        AND t.content_ref NOT LIKE '.trash/%'
        AND ${m(`t`)}`,[h,g,1]))[0];if(!t||t.total===0||t.indexed!==t.total)return[];let n=await D(),r=new Map,i=0,a=e=>{e.vaultPath!==null&&(r.set(e.id,{name:e.vaultPath===``?`Vault`:e.vaultPath,path:e.vaultPath}),e.count>=3&&(i+=1)),e.children.forEach(a)};if(n.forEach(a),i===0||t.total*i>5e5)return[];let s=await o.db.exec(`SELECT t.id, t.title, t.folder_id, folder.name AS folder_name,
              t.content_ref, embedding.vector
         FROM semantic_embeddings embedding
         JOIN semantic_embedding_documents document
           ON document.topping_id = embedding.topping_id
          AND document.source_revision = embedding.source_revision
          AND document.model_id = embedding.model_id
          AND document.model_revision = embedding.model_revision
          AND document.processor_version = embedding.processor_version
          AND document.status = 'indexed'
         JOIN toppings t ON t.id = embedding.topping_id
         JOIN toppings_fts_rows fts ON fts.topping_id = t.id
         JOIN folders folder ON folder.id = t.folder_id
        WHERE embedding.model_id = ?
          AND embedding.model_revision = ?
          AND embedding.processor_version = ?
          AND embedding.dimensions = ?
          AND t.source = 'vault'
          AND t.deleted_at IS NULL
          AND t.content_ref IS NOT NULL
          AND t.content_ref NOT LIKE '.trash/%'
          AND ${m(`t`)}
        ORDER BY t.id, embedding.segment_kind,
                 embedding.anchor_page, embedding.ordinal`,[h,g,1,384]),c=new Map;for(let e of s){let t=c.get(e.id);t||(t={id:e.id,title:e.title,folderId:e.folder_id,folderName:e.folder_name,path:e.content_ref,vectors:[]},c.set(e.id,t)),t.vectors.push(S(e.vector))}return c.size===t.total?rt([...c.values()],r,e):[]}function st(e){return!Number.isFinite(e)||e<0?`Unknown`:e<1024?`${e} B`:e<1024**2?`${(e/1024).toFixed(1)} KB`:e<1024**3?`${(e/1024**2).toFixed(1)} MB`:`${(e/1024**3).toFixed(1)} GB`}export{se as $,Re as A,_ as B,N as C,Me as D,ke as E,D as F,ne as G,ee as H,he as I,b as J,g as K,ve as L,O as M,ye as N,Ie as O,ge as P,le as Q,pe as R,Oe as S,Ae as T,h as U,re as V,te as W,S as X,ue as Y,oe as Z,B as _,Qe as a,je as b,Xe as c,We as d,C as et,K as f,ze as g,Ve as h,at as i,_e as j,Pe as k,W as l,He as m,it as n,Ze as o,Ue as p,ae as q,ot as r,$e as s,st as t,x as tt,Je as u,Fe as v,Ee as w,Ne as x,De as y,v as z};