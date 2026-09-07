import{D as e,E as t,S as n,f as r,l as i,s as a,u as o}from"./src-BhgN8yup.js";import{a as s}from"./instance-ClO57FH2.js";import{A as c,Bn as l,M as u,Sn as d,k as f}from"./src-CtugEJLq.js";import{c as p,l as m,u as h}from"./propertyQueries-CtmexpgD.js";var g=`Xenova/multilingual-e5-small`,_=`761b726dd34fb83930e26aab4e9ac3899aa1fa78`,ee=140461908,te=512*1024*1024,ne=`local-e5-model`,re=`local-e5-embedding`,v=`query: `,y=`passage: `,ie=2048,ae=1176;function b(e){return e.replace(/\s+/gu,` `).trim()}function x(e){let t=b(e);return t.length<=2048?t:t.slice(0,ie).trimEnd()}function oe(e,t){return(e===`query`?v:y)+x(t)}function se(e){let t=b(e);return t.length<=280?t:`${t.slice(0,279).trimEnd()}…`}function ce(e){return JSON.stringify({model:g,revision:_,version:1,segments:e.map(e=>({kind:e.kind,anchorPage:e.anchorPage,ordinal:e.ordinal,text:x(e.text)}))})}async function S(e){let t=new TextEncoder().encode(ce(e));return[...new Uint8Array(await crypto.subtle.digest(`SHA-256`,t))].map(e=>e.toString(16).padStart(2,`0`)).join(``)}function le(e){return S([{kind:`topping`,anchorPage:null,ordinal:0,text:x(e)}])}function ue(e){if(e.length!==384)throw Error(`Expected 384 embedding dimensions, got ${e.length}`);let t=new Uint8Array(e.length*Float32Array.BYTES_PER_ELEMENT),n=new DataView(t.buffer);for(let t=0;t<e.length;t++){let r=e[t];if(!Number.isFinite(r))throw Error(`Embedding vectors must contain only finite values`);n.setFloat32(t*Float32Array.BYTES_PER_ELEMENT,r,!0)}return t}function C(e){let t=e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):null,n=384*Float32Array.BYTES_PER_ELEMENT;if(!t||t.byteLength!==n)throw Error(`Embedding BLOB must contain exactly ${n} bytes`);let r=new DataView(t.buffer,t.byteOffset,t.byteLength),i=new Float32Array(384);for(let e=0;e<i.length;e++){let t=r.getFloat32(e*Float32Array.BYTES_PER_ELEMENT,!0);if(!Number.isFinite(t))throw Error(`Embedding BLOB contains a non-finite value`);i[e]=t}return i}function w(e,t){if(e.length!==384||t.length!==384)throw Error(`Semantic similarity requires the shared E5 vector space`);let n=0;for(let r=0;r<384;r++)n+=e[r]*t[r];return n}var T=`\0`;function E(e,t){let n=e.byFolder.get(t)??0;return n>=3&&e.total>0&&n/e.total>=.7}function de(e){let t=null;for(let n of e.byFolder.keys())if(E(e,n)){if(t!==null)return null;t=n}return t}function fe(e){let t=new Map;for(let[n,r]of e.tallies){let e=de(r);e!==null&&t.set(n,e)}let n=new Map;for(let r of e.items){let i=null,a=null,o=!1;for(let n of r.signals){let s=e.tallies.get(n),c=t.get(n);if(!(!s||c===void 0||c===r.folderId)&&!E(s,r.folderId)){if(i!==null&&i!==c){o=!0;break}i=c,a??=n}}if(o||i===null||a===null)continue;let s=[i,a].join(T);n.set(s,[...n.get(s)??[],r.toppingId])}let r=[];for(let[t,i]of n){let[n,a]=t.split(T),o=e.tallies.get(a),s=o.byFolder.get(n)??0;i.sort(),r.push({targetFolderId:n,signal:a,toppingIds:i,reason:`${s} of your ${o.total} ${o.label} are here`,fingerprint:[a,...i].join(T)})}return r.sort((e,t)=>t.toppingIds.length-e.toppingIds.length||e.targetFolderId.localeCompare(t.targetFolderId)||e.signal.localeCompare(t.signal)),r}function D(e){return e.home!==`local`||e.path===null?null:e.path===`/`?``:e.path.replace(/^\//,``)}function pe(e,t){return t!==``&&e.startsWith(`${t}/`)}async function O(){let e=await s.db.exec(`
    SELECT f.id, f.parent_id, f.name, f.path, f.home,
      (SELECT COUNT(*) FROM toppings t
        WHERE t.folder_id = f.id
          AND t.deleted_at IS NULL
          AND ${h(`t`)}) AS count
    FROM folders f`),t=new Map(e.map(e=>[e.id,{id:e.id,parentId:e.parent_id,name:e.name,count:e.count,vaultPath:D(e),children:[]}])),n=[];for(let e of t.values()){let r=e.parentId?t.get(e.parentId):void 0;r?r.children.push(e):n.push(e)}let r=e=>{e.sort((e,t)=>p.compare(e.name,t.name)),e.forEach(e=>r(e.children))};return r(n),n}function me(e){let t=new Map;for(let n of e)!n.thumb_ref||t.has(n.folder_id)||t.set(n.folder_id,{thumbRef:n.thumb_ref,thumbColor:n.thumb_color,...n.updated_at?{updatedAt:n.updated_at}:{}});return t}async function he(e){let t=[...new Set(e)];if(t.length===0)return new Map;let n=t.map(()=>`?`).join(`,`);return me(await s.db.exec(`WITH ranked AS (
       SELECT folder_id, thumb_ref, thumb_color, updated_at,
              ROW_NUMBER() OVER (
                PARTITION BY folder_id
                ORDER BY updated_at DESC, id ASC
              ) AS recency_rank
         FROM toppings t
        WHERE t.folder_id IN (${n})
          AND t.deleted_at IS NULL
          AND ${h(`t`)}
          AND NULLIF(thumb_ref, '') IS NOT NULL
     )
     SELECT folder_id, thumb_ref, thumb_color, updated_at
       FROM ranked
      WHERE recency_rank = 1`,t))}async function ge(e){let t=await s.db.exec(`SELECT t.type, COUNT(*) AS count
       FROM toppings t
      WHERE t.folder_id = ? AND t.deleted_at IS NULL
        AND ${h(`t`)}
      GROUP BY t.type
      ORDER BY type`,[e]);return Object.fromEntries(t.map(e=>[e.type,e.count]))}function _e(e){for(let t of e)if(t.vaultPath===``)return t.id;return null}function k(e,t){for(let n of e){if(n.id===t)return n;let e=k(n.children,t);if(e)return e}return null}function ve(e,t){let n=k(e,t);if(!n)return[t];let r=[],i=e=>{r.push(e.id),e.children.forEach(i)};return i(n),r}async function ye(e){if(e===null)return``;let t=await s.db.exec(`SELECT path, home FROM folders WHERE id = ?`,[e]);return t[0]?D(t[0]):null}async function be(e){let t=(await s.db.exec(`SELECT path, home, name FROM folders WHERE id = ?`,[e]))[0];if(!t)return null;let n=D(t);return n===null?null:{vaultPath:n,name:t.name}}var A={key:`$updated`,dir:`desc`},j={sorts:[A],filters:null,groupBy:null};function xe({total:e,thumbs:t,docs:n}){return e<4||t/e>=.5?`masonry`:n/e>=.6?`list`:`masonry`}function Se(t){if(!Array.isArray(t))return;let n=new Set,r=[];for(let i of t){let t=typeof i==`string`?i:i&&typeof i==`object`&&typeof i.key==`string`?i.key:``;if(!t||t.startsWith(`$`)||n.has(t))continue;n.add(t);let a=i&&typeof i==`object`?e(i.width):160;r.push({key:t,width:a})}return r}function Ce(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let t=Object.create(null);for(let[n,r]of Object.entries(e))n&&typeof r==`string`&&r.trim()&&(t[n]=r.trim());return Object.keys(t).length>0?t:void 0}function we(e){let t=(Array.isArray(e)?e:[e]).flatMap(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return[];let t=e;return typeof t.key!=`string`||!t.key?[]:[{key:t.key,dir:t.dir===`asc`?`asc`:`desc`}]});if(t.find(e=>e.key===`$manual`))return[{key:`$manual`,dir:`asc`}];let n=new Set,r=t.filter(e=>n.has(e.key)?!1:(n.add(e.key),!0));return r.length>0?r:[A]}function Te(e){if(typeof e==`string`)return e?{key:e,dir:`asc`}:null;if(!e||typeof e!=`object`)return null;let t=e;return typeof t.key!=`string`||!t.key?null:{key:t.key,dir:t.dir===`desc`?`desc`:`asc`}}function M(e){let t=JSON.parse(e),n={sorts:we(t.sorts??t.sort),filters:t.filters??null,groupBy:Te(t.groupBy)},r=Se(t.columns);r&&(n.columns=r);let i=Ce(t.propertyLabels);if(i&&(n.propertyLabels=i),t.roles&&typeof t.roles==`object`&&!Array.isArray(t.roles)){let e={};for(let[n,r]of Object.entries(t.roles))typeof r==`string`&&r&&(e[n]=r);Object.keys(e).length>0&&(n.roles=e)}if(Array.isArray(t.hidden)){let e=t.hidden.filter(e=>typeof e==`string`&&e!==``);e.length>0&&(n.hidden=e)}return a(t.aspect)&&(n.aspect=t.aspect),t.home&&typeof t.home.file==`string`&&typeof t.home.node==`string`&&(n.home={file:t.home.file,node:t.home.node}),(t.custody===`home`||t.custody===`foreign`)&&(n.custody=t.custody),typeof t.writeFreeze==`string`&&t.writeFreeze.trim()&&(n.writeFreeze=t.writeFreeze.trim()),n}function Ee(e){return M(JSON.stringify(e))}async function De(e){let t=(await s.db.exec(`SELECT id, name, layout, config, is_default, position FROM views WHERE id = ?`,[e]))[0];return t?{id:t.id,name:t.name,layout:t.layout,isDefault:t.is_default===1,position:t.position,cfg:M(t.config)}:null}async function N(e,t){return(await e.exec(`SELECT id, name, layout, config, is_default, position FROM views WHERE folder_id IS ? ORDER BY position, name`,[t])).map(e=>({id:e.id,name:e.name,layout:e.layout,isDefault:e.is_default===1,position:e.position,cfg:M(e.config)}))}async function Oe(e,t){let n=`masonry`;if(t!==null){let r=(await e.exec(`SELECT COUNT(*) AS total,
              COUNT(NULLIF(thumb_ref, '')) AS thumbs,
              SUM(CASE WHEN type IN ('note','link') THEN 1 ELSE 0 END) AS docs
         FROM toppings t
        WHERE t.folder_id = ? AND t.deleted_at IS NULL
          AND ${h(`t`)}`,[t]))[0];n=xe({total:r?.total??0,thumbs:r?.thumbs??0,docs:r?.docs??0})}return{id:o(t),name:i,layout:n,position:0,isDefault:!0,cfg:{...j,sorts:[...j.sorts]}}}function P(e,t){if(e.id!==`v_${t??`root`}`||e.name!==`Default`||e.layout!==`masonry`&&e.layout!==`list`)return!1;let n=e.cfg,r=n.sorts[0];return Object.keys(n).length===3&&n.filters===null&&n.groupBy===null&&n.sorts.length===1&&r?.key===A.key&&r.dir===A.dir}async function ke(e){let t=await N(s.db,e);return r(await Oe(s.db,e),t.filter(t=>!P(t,e)))}async function F(e,t,n,r=`v_${crypto.randomUUID()}`){let i=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[t]),a={id:r,name:n.name,layout:n.layout,isDefault:!1,position:(i[0]?.maxpos??0)+1,cfg:n.cfg};return await e.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[a.id,t,a.name,a.layout,JSON.stringify(a.cfg),a.position]),a}function Ae(e,t,n){return F(s.db,e,t,n)}async function je(e){return(await s.db.exec(`SELECT id FROM views WHERE folder_id IS ? AND is_default = 1 LIMIT 1`,[e])).length>0}async function Me(e){let t=await s.db.exec(`SELECT name FROM views WHERE folder_id IS ?`,[e]);return new Set(t.map(e=>e.name.trim().toLowerCase()))}function Ne(e,t,n,r){return s.db.transaction(async i=>{let a=await F(i,e,{name:t.name,layout:t.layout,cfg:t.cfg},n);return r?(await i.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[a.id]),{...a,isDefault:!0}):a})}async function Pe(e,t){return t.length===0?[]:s.db.transaction(async n=>{let r=await n.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[e]),i=[],a=r[0]?.maxpos??0;for(let r of t){let t={id:r.id,name:r.name,layout:r.layout,isDefault:!1,position:++a,cfg:r.cfg};await n.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[t.id,e,t.name,t.layout,JSON.stringify(t.cfg),t.position]),i.push(t)}return i})}async function I(e,t,n){await e.exec(`UPDATE views SET name = ? WHERE id = ?`,[n,t])}function Fe(e,t){return I(s.db,e,t)}async function L(e,t){await e.exec(`DELETE FROM view_order WHERE view_id = ?`,[t]),await e.exec(`DELETE FROM views WHERE id = ?`,[t])}function Ie(e){return L(s.db,e)}async function R(e,t,n){await e.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[t]),await e.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[n])}function Le(e,t){return R(s.db,e,t)}async function z(e,t){await e.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[t])}function Re(e){return z(s.db,e)}async function B(e,t,n,r){await e.exec(`UPDATE views SET layout = ?, config = ? WHERE id = ?`,[n,JSON.stringify(r),t])}function ze(e,t,n){return B(s.db,e,t,n)}async function Be(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[n]);await e.exec(`UPDATE views SET folder_id = ?, is_default = 0, position = ? WHERE id = ?`,[n,(r[0]?.maxpos??0)+1,t])}function Ve(e){return{list:t=>N(e,t),create:(t,n,r)=>F(e,t,n,r),delete:t=>L(e,t),moveToFolder:(t,n)=>Be(e,t,n),saveState:(t,n,r)=>B(e,t,n,r),setDefault:(t,n)=>R(e,t,n),rename:(t,n)=>I(e,t,n),clearDefault:t=>z(e,t)}}function V(e){return e.asserted??e.evidence??e.derived}function He(e,t){return!e||!t||e===t?null:{message:`You set ${e}; this URL derives ${t}`,actionLabel:`Use ${t}`,acceptType:t}}async function Ue(e){if(e.length===0)return new Map;let t=e.length<=900,n=await s.db.exec(`SELECT p.topping_id, p.value_text
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE p.key = 'url' AND ${m(`t`)}
       ${t?`AND p.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}`,t?e:[]),r=new Set(e),i=new Map;for(let e of n)!e.value_text||!r.has(e.topping_id)||i.set(e.topping_id,e.value_text);return i}async function We(e){let t=(await s.db.exec(`SELECT t.id, t.asserted_schema_type, t.thumb_display_ref, t.thumb_color,
            p.value_text AS url
       FROM toppings t
       LEFT JOIN properties p ON p.topping_id = t.id AND p.key = 'url'
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref = ?
      LIMIT 1`,[e]))[0];return t?.asserted_schema_type?{toppingId:t.id,assertedSchemaType:t.asserted_schema_type,url:t.url,thumbDisplayRef:t.thumb_display_ref??null,thumbColor:t.thumb_color??null}:null}async function Ge(e){return(await s.db.exec(`SELECT value_text FROM properties WHERE topping_id = ? AND key = 'url'`,[e]))[0]?.value_text??null}async function Ke(e){let t=(await s.db.exec(`SELECT t.id, t.type, t.title, t.content_ref,
            f.name AS folder, t.updated_at
       FROM toppings t
       JOIN folders f ON f.id = t.folder_id
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref = ?
      LIMIT 1`,[e]))[0];return t?{id:t.id,type:t.type,title:t.title,subtitle:t.folder,contentRef:t.content_ref,updatedAt:t.updated_at}:null}var H={eq:`=`,ne:`!=`,lt:`<`,lte:`<=`,gt:`>`,gte:`>=`},U=e=>e.replace(/[\\%_]/g,`\\$&`);function W(e,t){if(e.op!==`cmp`){if(e.children.length===0)return`1`;let n=e.op===`not`?` OR `:` ${e.op.toUpperCase()} `,r=`(`+e.children.map(e=>W(e,t)).join(n)+`)`;return e.op===`not`?`NOT ${r}`:r}if(e.key===`$title`||e.key===`$basename`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.title, ?) > 0`:`t.title ${H[e.cmp]??`=`} ?`;if(e.key===`$name`){let n=String(e.value);t.push(n,`%/${U(n)}`);let r=`(t.content_ref = ? OR t.content_ref LIKE ? ESCAPE '\\')`;return e.cmp===`ne`?`NOT ${r}`:r}if(e.key===`$path`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.content_ref, ?) > 0`:`t.content_ref ${H[e.cmp]??`=`} ?`;if(e.key===`$folder`){let n=`CASE WHEN f.path = '/' THEN '' ELSE SUBSTR(f.path, 2) END`;if(e.cmp===`inFolder`){let r=String(e.value).replace(/^\/+|\/+$/g,``);return t.push(r,`${U(r)}/%`),`(${n} = ? OR ${n} LIKE ? ESCAPE '\\')`}return e.cmp===`startsWith`?(t.push(String(e.value)),`INSTR(${n}, ?) = 1`):(t.push(String(e.value)),e.cmp===`contains`?`INSTR(${n}, ?) > 0`:`${n} ${H[e.cmp]??`=`} ?`)}if(e.key===`$ext`){let n=`%.${U(String(e.value).replace(/^[.]/,``).toLowerCase())}`;return t.push(n),e.cmp===`ne`?`LOWER(t.content_ref) NOT LIKE ? ESCAPE '\\'`:`LOWER(t.content_ref) LIKE ? ESCAPE '\\'`}if(e.key===`$updated`)return t.push(Number(e.value)),`(unixepoch(t.updated_at) * 1000) ${H[e.cmp]??`=`} ?`;if(e.key===`$type`)return t.push(String(e.value)),`t.type = ?`;if(e.key===`$interaction.status`)return t.push(String(e.value)),e.cmp===`ne`?`EXISTS (
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
    )`):(t.push(e.key,String(e.value)),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_text ${H[e.cmp]??`=`} ?)`)}function G(e){if(!e||e.op===`not`||e.op===`or`)return null;if(e.op===`cmp`)return e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`eq`)?String(e.value):null;for(let t of e.children){let e=G(t);if(e!==null)return e}return null}function K(e){return!e||e.op===`not`||e.op===`or`?!1:e.op===`cmp`?e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`startsWith`):e.children.some(K)}function qe(e,t){return e===null||K(t)}async function Je(e,t,n){let r=[],i=``,a,o=t.sorts.length>0?t.sorts:[A],c=o[0]?.key===`$manual`;if(c)i=`LEFT JOIN view_order vo ON vo.topping_id = t.id AND vo.view_id = ?`,r.push(n??``),a=`(vo.order_key IS NULL) ASC, vo.order_key ASC, t.updated_at DESC`;else{let e=[],t=[];for(let[n,i]of o.entries()){let a=i.dir===`asc`?`ASC`:`DESC`;if(i.key===`$updated`)t.push(`t.updated_at ${a}`);else if(i.key===`$created`)t.push(`t.created_at ${a}`);else if(i.key===`$title`||i.key===`$basename`||i.key===`$name`)t.push(`t.title COLLATE NOCASE ${a}`);else if(i.key===`$path`)t.push(`t.content_ref COLLATE NOCASE ${a}`);else if(i.key===`$folder`)t.push(`f.path COLLATE NOCASE ${a}`);else{let o=`s${n}`;e.push(`LEFT JOIN properties ${o} ON ${o}.topping_id = t.id AND ${o}.key = ?`),r.push(i.key),t.push(`(${o}.topping_id IS NULL) ASC`,`${o}.value_num ${a}`,`${o}.value_text COLLATE NOCASE ${a}`)}}i=e.join(` `),a=[...t,`t.id ASC`].join(`, `)}let l=``;e&&!K(t.filters)&&(l+=` AND t.folder_id = ?`,r.push(e)),t.filters&&(l+=` AND ${W(t.filters,r)}`);let u=(await s.db.exec(`SELECT t.id, t.type, t.title, t.content_ref, t.source, f.name AS folder, t.updated_at, t.thumb_ref, t.thumb_color, t.thumb_aspect, t.asserted_schema_type${c?`, vo.order_key`:``}
     FROM toppings t JOIN folders f ON f.id = t.folder_id ${i}
     WHERE t.deleted_at IS NULL AND ${h(`t`)} ${l}
     ORDER BY ${a}`,r)).map(e=>({id:e.id,type:e.type,title:e.title,subtitle:e.folder,contentRef:e.source===`vault`?e.content_ref:null,assertedSchemaType:e.asserted_schema_type,updatedAt:e.updated_at,thumbRef:e.thumb_ref,thumbColor:e.thumb_color,aspect:e.thumb_aspect,...c?{orderKey:e.order_key??null}:{}})),d=await Xe(u.map(e=>e.id));for(let e of u){let t=d.get(e.id);t&&(e.interactionMarks=t)}return await Ye(u),u}async function q(){let[e,t]=await Promise.all([s.db.exec(`SELECT id, name, labels FROM status_sets`),s.db.exec(`SELECT match_value, set_id FROM status_set_bindings
        WHERE match_kind = 'schema_type'
        ORDER BY match_value, set_id`)]);return{sets:new Map(e.map(e=>[e.id,{id:e.id,name:e.name,labels:Y(e.labels)}])),bindings:t.map(e=>({schemaType:e.match_value,setId:e.set_id}))}}async function Ye(e){let n=e.filter(t);if(n.length===0)return;let[r,i]=await Promise.all([Ue(n.map(e=>e.id)),q()]);for(let e of n){let t=e.interactionMarks?.[0]?.setId??null,n=e.assertedSchemaType??null,a=t||n?null:r.get(e.id),o=i.sets.get(c({pinnedSetId:t,schemaType:V({asserted:n,evidence:null,derived:a?f(a)?.type??null:null}),bindings:i.bindings}));o&&(e.statusSet=o)}}var J=new Set([`queued`,`active`,`done`,`dropped`]);async function Xe(e){if(e.length===0)return new Map;let t=e.length<=900,n=await s.db.exec(`SELECT i.topping_id, i.set_id, s.name AS set_name, s.labels, i.slot, i.rating
     FROM private_entity_effective_marks i
     JOIN status_sets s ON s.id = i.set_id
     WHERE (i.slot IS NOT NULL OR i.rating IS NOT NULL)
       ${t?`AND i.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}
     ORDER BY i.updated_at DESC, i.set_id`,t?e:[]),r=new Set(e),i=new Map;for(let e of n){if(!r.has(e.topping_id))continue;let t=e.slot&&J.has(e.slot)?e.slot:null,n=Y(e.labels),a={setId:e.set_id,setName:e.set_name,slot:t,statusLabel:t?n[t]??t:null,rating:e.rating},o=i.get(e.topping_id)??[];o.push(a),i.set(e.topping_id,o)}return i}function Y(e){try{let t=JSON.parse(e),n={};for(let e of J)typeof t[e]==`string`&&(n[e]=t[e]);return n}catch{return{}}}function Ze(e,t){switch(e.kind){case`number`:return e.value;case`money`:return e.amount;case`duration`:return e.seconds;case`checkbox`:return+!!e.value;case`date`:return Date.parse(e.iso)||0;default:return t.toLowerCase()}}async function Qe(e,t,r){let i=t.key,a=new Map;if(!i.startsWith(`$`)&&r.length>0){let e=JSON.stringify([...new Set(r.map(e=>e.id))]),t=await s.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
       FROM json_each(?) scope
       CROSS JOIN properties p ON p.topping_id = scope.value
       WHERE p.key = ?`,[e,i]),o=new Map;for(let e of t){let t=JSON.stringify([e.kind,e.value_text,e.value_num,e.value_aux]),r=o.get(t);if(r===void 0){let i=l(e.kind,e.value_text,e.value_num,e.value_aux);if(i===null)r=null;else{let e=n(i);r={label:e,order:Ze(i,e)}}o.set(t,r)}r&&a.set(e.topping_id,r)}}let o=new Map;for(let e of r){let t=a.get(e.id),n=i===`$title`||i===`$basename`?e.title:i===`$name`?e.contentRef?.split(`/`).pop()??null:i===`$path`?e.contentRef??null:i===`$folder`?e.contentRef?.split(`/`).slice(0,-1).join(`/`)??null:i===`$ext`?e.contentRef?.split(`.`).pop()?.toLowerCase()??null:i===`$updated`?e.updatedAt??null:i===`$type`?e.type:null,r=t?t.label:n||`No ${i}`,s=t?t.order:n?i===`$updated`?Date.parse(n):n.toLowerCase():null,c=o.get(r)??{order:s,items:[]};c.items.push(e),o.set(r,c)}let c=t.dir===`desc`?-1:1,u=[...o.entries()].sort(([,e],[,t])=>e.order===null?1:t.order===null?-1:typeof e.order==`number`&&typeof t.order==`number`?(e.order-t.order)*c:p.compare(String(e.order),String(t.order))*c);return{items:u.flatMap(([,e])=>e.items),groups:u.map(([e,t])=>({label:e,count:t.items.length}))}}function $e(e){let t={total:0,byType:{},bytes:0,unsized:0};for(let n of e)t.total+=n.item_count,t.byType[n.type]=(t.byType[n.type]??0)+n.item_count,t.bytes+=n.size_bytes??0,t.unsized+=n.unsized_count;return t}async function et(){return $e(await s.db.exec(`SELECT t.type,
            SUM(CASE WHEN ${h(`t`)} THEN 1 ELSE 0 END) AS item_count,
            SUM(t.stat_size) AS size_bytes,
            SUM(CASE WHEN t.stat_size IS NULL THEN 1 ELSE 0 END) AS unsized_count
       FROM toppings t
      WHERE t.source = 'vault'
        AND t.deleted_at IS NULL
      GROUP BY t.type
      ORDER BY t.type`))}async function tt(){return(await s.db.exec(`SELECT COUNT(*) AS count
       FROM content_documents
      WHERE status = 'pending'`))[0]?.count??0}async function nt(e){let t=(await s.db.exec(`SELECT status, media_type, page_count, detail
       FROM content_documents
      WHERE topping_id = ?`,[e]))[0];return t?{status:t.status,mediaType:t.media_type,pageCount:t.page_count,detail:t.detail}:null}function rt(e){let t=e.replace(/[\u0000-\u001f\u007f]/g,` `).split(/\s+/).filter(Boolean);return t.length===0?null:t.map(e=>`"${e.replaceAll(`"`,`""`)}"*`).join(` `)}async function it(e,t){let n=rt(e);if(n===null||t!==null&&t.length===0)return{results:[],truncated:!1};let r=[],i=``;t!==null&&(i=`AND t.folder_id IN (${t.map(()=>`?`).join(`,`)})`,r.push(...t));let a=[n,...r,n,...r],o=await s.db.exec(`WITH topping_matches AS (
       SELECT 'topping:' || t.id AS result_key,
              t.id, t.type, t.title, t.content_ref, t.source, t.folder_id,
              f.name AS folder_name,
              highlight(toppings_fts, 1, char(1), char(2)) AS title_marked,
              snippet(toppings_fts, 2, char(1), char(2), '…', 12) AS body_snippet,
              NULL AS anchor_page,
              NULL AS anchor_start_ms,
              NULL AS anchor_end_ms,
              bm25(toppings_fts, 0.0, 10.0, 1.0, 5.0) AS rank
         FROM toppings_fts
         JOIN toppings t ON t.id = toppings_fts.topping_id
         JOIN folders f ON f.id = t.folder_id
        WHERE toppings_fts MATCH ? AND t.deleted_at IS NULL ${i}
     ),
     content_hits AS (
       SELECT CASE
                WHEN content_chunks_fts.anchor_page IS NOT NULL
                  THEN 'pdf:' || t.id || ':' || content_chunks_fts.anchor_page
                ELSE 'audio:' || t.id || ':' || content_chunks_fts.anchor_start_ms
              END AS result_key,
              t.id, t.type, t.title, t.content_ref, t.source, t.folder_id,
              f.name AS folder_name,
              t.title AS title_marked,
              snippet(content_chunks_fts, 5, char(1), char(2), '…', 18) AS body_snippet,
              CAST(content_chunks_fts.anchor_page AS INTEGER) AS anchor_page,
              CAST(content_chunks_fts.anchor_start_ms AS INTEGER) AS anchor_start_ms,
              CAST(content_chunks_fts.anchor_end_ms AS INTEGER) AS anchor_end_ms,
              CAST(content_chunks_fts.ordinal AS INTEGER) AS ordinal,
              bm25(content_chunks_fts, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0) AS rank
         FROM content_chunks_fts
         JOIN toppings t ON t.id = content_chunks_fts.topping_id
         JOIN folders f ON f.id = t.folder_id
        WHERE content_chunks_fts MATCH ? AND t.deleted_at IS NULL ${i}
     ),
     content_ranked AS (
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY id, anchor_page, anchor_start_ms
                ORDER BY rank ASC, ordinal ASC
              ) AS page_match
         FROM content_hits
     ),
     matches AS (
       SELECT * FROM topping_matches
       UNION ALL
       SELECT result_key, id, type, title, content_ref, source, folder_id,
              folder_name, title_marked, body_snippet, anchor_page,
              anchor_start_ms, anchor_end_ms, rank
         FROM content_ranked
        WHERE page_match = 1
     )
     SELECT *
       FROM matches
      ORDER BY rank ASC, result_key ASC
      LIMIT 101`,a),c=o.length>100;return{results:o.slice(0,100).map(e=>({resultKey:e.result_key,id:e.id,type:e.type,title:e.title,titleMarked:e.title_marked,snippet:e.body_snippet,contentRef:e.source===`vault`?e.content_ref:null,folderId:e.folder_id,folderName:e.folder_name,anchor:e.anchor_page===null?e.anchor_start_ms!==null&&e.anchor_end_ms!==null?{kind:`timestamp`,startMs:e.anchor_start_ms,endMs:e.anchor_end_ms}:null:{kind:`page`,page:e.anchor_page}})),truncated:c}}function at(e,n,r,i){let a=new Map;for(let e of n)a.set(e.topping_id,[...a.get(e.topping_id)??[],e]);let o=new Map;for(let e of r)o.set(e.topping_id,[...o.get(e.topping_id)??[],e.name]);let s=new Map,c=e.map(e=>{let n=new Set;if(t({type:e.type,assertedSchemaType:e.asserted_schema_type})){let t=a.get(e.id)?.find(e=>e.key===`url`)?.value_text??null,r=d(t);if(r){let e=`host:${r}`;n.add(e),s.set(e,`${r} links`)}let i=e.asserted_schema_type??(t?f(t)?.type??null:null);if(i){let e=`schema:${i}`;n.add(e),s.set(e,`${u(i)} links`)}}else{for(let t of a.get(e.id)??[]){let e=`property:${t.key}`;n.add(e),s.set(e,`notes with “${t.key}”`)}for(let t of o.get(e.id)??[]){let e=`tag:${t}`;n.add(e),s.set(e,`#${t} notes`)}}return{toppingId:e.id,folderId:e.folder_id,signals:[...n].sort()}}),l=new Map;for(let e of c)for(let t of e.signals){let n=l.get(t)??{label:s.get(t)??t,byFolder:new Map,total:0};n.byFolder.set(e.folderId,(n.byFolder.get(e.folderId)??0)+1),n.total+=1,l.set(t,n)}let p=new Map(l),m=new Map(e.map(e=>[e.id,e])),h=new Map;for(let e of fe({items:c,tallies:p})){let t=i.get(e.targetFolderId);if(!t)continue;let n=h.get(e.targetFolderId)??{target:t,reasons:new Set,fingerprints:[],items:new Map};n.reasons.add(e.reason),n.fingerprints.push(e.fingerprint);for(let t of e.toppingIds){let e=m.get(t);e&&n.items.set(t,{id:t,title:e.title,path:e.content_ref,sourceFolderName:e.folder_name})}h.set(e.targetFolderId,n)}return[...h].flatMap(([e,t])=>{let n=[...t.items.values()].sort((e,t)=>e.id.localeCompare(t.id));return n.length===0?[]:[{basis:`signals`,targetFolderId:e,targetFolderName:t.target.name,targetFolderPath:t.target.path,reason:[...t.reasons].join(` · `),fingerprint:JSON.stringify(t.fingerprints.sort()),items:n}]}).sort((e,t)=>t.items.length-e.items.length||e.targetFolderId.localeCompare(t.targetFolderId))}function X(e){let t=0;for(let n of e)t+=n*n;if(!Number.isFinite(t)||t<=2**-52)return null;let n=Math.sqrt(t),r=new Float32Array(384);for(let t=0;t<r.length;t++)r[t]=e[t]/n;return r}function ot(e){if(e.length===0)return null;let t=new Float64Array(384);for(let n of e){if(n.length!==384)return null;for(let e=0;e<n.length;e++){let r=n[e];if(!Number.isFinite(r))return null;t[e]=t[e]+r}}return X(t)}function Z(e,t){if(e.count<=1)return null;let n=new Float64Array(384);for(let r=0;r<n.length;r++)n[r]=e.sum[r]-t.vector[r];return X(n)}function st(e){let t=new Map;for(let n of e)t.set(n.folderId,[...t.get(n.folderId)??[],n]);let n=new Map;for(let[e,r]of t){if(r.length<3)continue;let t=new Float64Array(384);for(let e of r)for(let n=0;n<e.vector.length;n++)t[n]=t[n]+e.vector[n];let i=X(t);if(!i)continue;let a={folderId:e,count:r.length,sum:t,centroid:i,coherence:0},o=0,s=0;for(let e of r){let t=Z(a,e);t&&(o+=w(e.vector,t),s+=1)}a.coherence=s===r.length?o/s:-1/0,n.set(e,a)}return n}function Q(e){return e.toFixed(2)}function ct(e,t,n=new Set){let r=e.flatMap(e=>{let t=ot(e.vectors);return t?[{...e,vector:t}]:[]}),i=st(r),a=[...i.values()].filter(e=>e.coherence>=.93&&t.has(e.folderId));if(a.length===0||r.length*a.length>5e5)return[];let o=[];for(let e of r){if(n.has(e.id))continue;let t=i.get(e.folderId);if(t&&t.coherence>=.93){let n=Z(t,e);if(n&&t.count-1>=3&&w(e.vector,n)>=.86)continue}let r=null,s=-1/0,c=-1/0;for(let t of a){if(t.folderId===e.folderId)continue;let n=w(e.vector,t.centroid);n>s?(c=s,r=t,s=n):n>c&&(c=n)}if(!r||s<.86)continue;let l=t?Z(t,e):null;l&&(c=Math.max(c,w(e.vector,l)));let u=c===-1/0?1+s:s-c;u<.05||o.push({item:e,target:r,score:s,margin:u})}let s=new Map;for(let e of o)s.set(e.target.folderId,[...s.get(e.target.folderId)??[],e]);return[...s].flatMap(([e,n])=>{let r=t.get(e);if(!r||n.length===0)return[];n.sort((e,t)=>e.item.id.localeCompare(t.item.id));let i=n[0].target.count,a=Math.min(...n.map(e=>e.score)),o=Math.min(...n.map(e=>e.margin)),s=n.map(({item:e})=>({id:e.id,title:e.title,path:e.path,sourceFolderName:e.folderName}));return[{basis:`semantic`,targetFolderId:e,targetFolderName:r.name,targetFolderPath:r.path,reason:`Each local content vector matches this folder's ${i}-item profile (coherence ${Q(n[0].target.coherence)}) at ${Q(a)} or better, at least ${Q(o)} beyond every alternative`,fingerprint:[`semantic`,g,_,1,...s.map(e=>e.id)].join(`\0`),items:s}]}).sort((e,t)=>t.items.length-e.items.length||e.targetFolderId.localeCompare(t.targetFolderId))}async function lt(e,t){let n=d(e),[r,i]=await Promise.all([n===null?Promise.resolve([]):s.db.exec(`SELECT t.folder_id, p.value_text
       FROM properties p JOIN toppings t ON t.id = p.topping_id
       WHERE p.key = 'url' AND ${m(`t`)} AND t.deleted_at IS NULL`),s.db.exec(`SELECT folder_id FROM toppings
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 50`)]),a=e===null?null:f(e),o=new Map,c=new Map;for(let e of r)e.value_text&&(d(e.value_text)===n&&o.set(e.folder_id,(o.get(e.folder_id)??0)+1),a&&f(e.value_text)?.type===a.type&&c.set(e.folder_id,(c.get(e.folder_id)??0)+1));let l=[];for(let e of i)l.includes(e.folder_id)||l.push(e.folder_id);return{...a?{type:{value:a.type,label:u(a.type),tallies:$(c)}}:{},...n?{domain:{value:n,label:n,tallies:$(o)}}:{},recent:l,currentFolderId:t}}function $(e){return[...e].map(([e,t])=>({folderId:e,count:t}))}async function ut(){let[e,t,n,r]=await Promise.all([s.db.exec(`SELECT t.id, t.type, t.title, t.folder_id, f.name AS folder_name,
              t.content_ref, t.asserted_schema_type
         FROM toppings t
         JOIN folders f ON f.id = t.folder_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND t.content_ref IS NOT NULL
          AND t.type IN ('note', 'link')
        ORDER BY t.id`),s.db.exec(`SELECT p.topping_id, p.key, p.value_text
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.source = 'vault'
          AND t.deleted_at IS NULL
          AND (
            (NOT ${m(`t`)} AND t.type = 'note')
            OR (${m(`t`)} AND p.key = 'url')
          )
        ORDER BY p.topping_id, p.key`),s.db.exec(`SELECT tt.topping_id, tags.name
         FROM topping_tags tt
         JOIN tags ON tags.id = tt.tag_id
         JOIN toppings t ON t.id = tt.topping_id
        WHERE t.source = 'vault'
          AND t.type = 'note'
          AND NOT ${m(`t`)}
          AND t.deleted_at IS NULL
        ORDER BY tt.topping_id, tags.name`),O()]),i=new Map,a=e=>{e.vaultPath!==null&&i.set(e.id,{name:e.vaultPath===``?`Vault`:e.vaultPath,path:e.vaultPath}),e.children.forEach(a)};return r.forEach(a),at(e,t,n,i)}async function dt(e=new Set){let t=(await s.db.exec(`SELECT COUNT(*) AS total,
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
        AND ${h(`t`)}`,[g,_,1]))[0];if(!t||t.total===0||t.indexed!==t.total)return[];let n=await O(),r=new Map,i=0,a=e=>{e.vaultPath!==null&&(r.set(e.id,{name:e.vaultPath===``?`Vault`:e.vaultPath,path:e.vaultPath}),e.count>=3&&(i+=1)),e.children.forEach(a)};if(n.forEach(a),i===0||t.total*i>5e5)return[];let o=await s.db.exec(`SELECT t.id, t.title, t.folder_id, folder.name AS folder_name,
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
          AND ${h(`t`)}
        ORDER BY t.id, embedding.segment_kind,
                 embedding.anchor_page, embedding.ordinal`,[g,_,1,384]),c=new Map;for(let e of o){let t=c.get(e.id);t||(t={id:e.id,title:e.title,folderId:e.folder_id,folderName:e.folder_name,path:e.content_ref,vectors:[]},c.set(e.id,t)),t.vectors.push(C(e.vector))}return c.size===t.total?ct([...c.values()],r,e):[]}function ft(e){return!Number.isFinite(e)||e<0?`Unknown`:e<1024?`${e} B`:e<1024**2?`${(e/1024).toFixed(1)} KB`:e<1024**3?`${(e/1024**2).toFixed(1)} MB`:`${(e/1024**3).toFixed(1)} GB`}export{ue as $,Fe as A,_e as B,je as C,Ne as D,De as E,k as F,re as G,pe as H,be as I,te as J,ee as K,ge as L,Le as M,Ve as N,Ee as O,ve as P,x as Q,O as R,Ie as S,ke as T,y as U,ye as V,v as W,_ as X,ne as Y,ae as Z,He as _,nt as a,S as at,Ae as b,et as c,Je as d,C as et,q as f,Ke as g,We as h,ut as i,w as it,ze as j,Me as k,G as l,Ge as m,lt as n,le as nt,tt as o,qe as p,g as q,dt as r,se as rt,it as s,ft as t,oe as tt,Qe as u,V as v,P as w,Pe as x,Re as y,he as z};