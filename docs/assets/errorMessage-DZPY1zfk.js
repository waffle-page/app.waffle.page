const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/orderKeys-CnN8jkRY.js","assets/rolldown-runtime-QTnfLwEv.js"])))=>i.map(i=>d[i]);
import{_ as e,p as t}from"./src-Dfy0bT-_.js";import{L as n,i as r}from"./instance-Bam1Oon8.js";import{t as i}from"./preload-helper-Czpn1I53.js";function a(e){return e.home!==`local`||e.path===null?null:e.path===`/`?``:e.path.replace(/^\//,``)}function o(e,t){return t!==``&&e.startsWith(`${t}/`)}async function s(){let e=await r.db.exec(`
    SELECT f.id, f.parent_id, f.name, f.path, f.home,
      (SELECT COUNT(*) FROM toppings t WHERE t.folder_id = f.id AND t.deleted_at IS NULL) AS count
    FROM folders f`),t=new Map(e.map(e=>[e.id,{id:e.id,parentId:e.parent_id,name:e.name,count:e.count,vaultPath:a(e),children:[]}])),n=[];for(let e of t.values()){let r=e.parentId?t.get(e.parentId):void 0;r?r.children.push(e):n.push(e)}let i=e=>{e.sort((e,t)=>e.name.localeCompare(t.name)),e.forEach(e=>i(e.children))};return i(n),n}function c(e){let t=new Map;for(let n of e)!n.thumb_ref||t.has(n.folder_id)||t.set(n.folder_id,{thumbRef:n.thumb_ref,thumbColor:n.thumb_color});return t}async function l(e){let t=[...new Set(e)];if(t.length===0)return new Map;let n=t.map(()=>`?`).join(`,`);return c(await r.db.exec(`WITH ranked AS (
       SELECT folder_id, thumb_ref, thumb_color,
              ROW_NUMBER() OVER (
                PARTITION BY folder_id
                ORDER BY updated_at DESC, id ASC
              ) AS recency_rank
         FROM toppings
        WHERE folder_id IN (${n})
          AND deleted_at IS NULL
          AND NULLIF(thumb_ref, '') IS NOT NULL
     )
     SELECT folder_id, thumb_ref, thumb_color
       FROM ranked
      WHERE recency_rank = 1`,t))}var u={key:`$updated`,dir:`desc`},d={sorts:[u],filters:null,groupBy:null};function f({total:e,thumbs:t,docs:n}){return e<4||t/e>=.5?`masonry`:n/e>=.6?`list`:`masonry`}function p(t){if(!Array.isArray(t))return;let n=new Set,r=[];for(let i of t){let t=typeof i==`string`?i:i&&typeof i==`object`&&typeof i.key==`string`?i.key:``;if(!t||t.startsWith(`$`)||n.has(t))continue;n.add(t);let a=i&&typeof i==`object`?e(i.width):160;r.push({key:t,width:a})}return r}function ee(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let t={};for(let[n,r]of Object.entries(e))n&&typeof r==`string`&&r.trim()&&(t[n]=r.trim());return Object.keys(t).length>0?t:void 0}function m(e){if(e===`title`)return[{key:`$title`,dir:`asc`}];if(e===`updated`)return[u];let t=(Array.isArray(e)?e:[e]).flatMap(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return[];let t=e;return typeof t.key!=`string`||!t.key?[]:[{key:t.key,dir:t.dir===`asc`?`asc`:`desc`}]});if(t.find(e=>e.key===`$manual`))return[{key:`$manual`,dir:`asc`}];let n=new Set,r=t.filter(e=>n.has(e.key)?!1:(n.add(e.key),!0));return r.length>0?r:[u]}function h(e){if(typeof e==`string`)return e?{key:e,dir:`asc`}:null;if(!e||typeof e!=`object`)return null;let t=e;return typeof t.key!=`string`||!t.key?null:{key:t.key,dir:t.dir===`desc`?`desc`:`asc`}}function g(e,t){try{let n=JSON.parse(e);return JSON.stringify({layout:n.layout,sorts:m(`sorts`in n?n.sorts:n.sort),filters:n.filters,groupBy:`groupBy`in n?h(n.groupBy):t,columns:Array.isArray(n.columns)?p(n.columns)??null:n.columns??null})}catch{return e}}function _(e){let t=JSON.parse(e),n=m(t.sorts??t.sort);t.colSort&&(n=m(t.colSort));let r=h(t.groupBy),i={sorts:n,filters:t.filters??null,groupBy:r},a=p(t.columns);a&&(i.columns=a);let o=ee(t.propertyLabels);if(o&&(i.propertyLabels=o),t.roles&&typeof t.roles==`object`&&!Array.isArray(t.roles)){let e={};for(let[n,r]of Object.entries(t.roles))typeof r==`string`&&r&&(e[n]=r);Object.keys(e).length>0&&(i.roles=e)}if(Array.isArray(t.hidden)){let e=t.hidden.filter(e=>typeof e==`string`&&e!==``);e.length>0&&(i.hidden=e)}return t.origin&&(i.origin={...t.origin,spec:g(t.origin.spec,r)}),i}async function v(e,t){let n=await e.exec(`SELECT id, name, layout, config, is_default, position FROM views WHERE folder_id IS ? ORDER BY position, name`,[t]);if(n.length===0){let n=`masonry`;if(t!==null){let r=(await e.exec(`SELECT COUNT(*) AS total,
                COUNT(NULLIF(thumb_ref, '')) AS thumbs,
                SUM(CASE WHEN type IN ('note','link') THEN 1 ELSE 0 END) AS docs
           FROM toppings
          WHERE folder_id = ? AND deleted_at IS NULL`,[t]))[0];n=f({total:r?.total??0,thumbs:r?.thumbs??0,docs:r?.docs??0})}let r={id:`v_${t??`root`}`,name:`Default`,layout:n,isDefault:!0,position:1,cfg:d};return await e.exec(`INSERT OR IGNORE INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',1,1)`,[r.id,t,r.name,r.layout,JSON.stringify(r.cfg)]),[r]}let r=n.map(e=>({id:e.id,name:e.name,layout:e.layout,isDefault:e.is_default===1,position:e.position,cfg:_(e.config)}));return r.some(e=>e.isDefault)||(r[0].isDefault=!0),r}function y(e){return v(r.db,e)}async function b(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[t]),i={id:`v_${crypto.randomUUID()}`,name:n.name,layout:n.layout,isDefault:!1,position:(r[0]?.maxpos??0)+1,cfg:n.cfg};return await e.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[i.id,t,i.name,i.layout,JSON.stringify(i.cfg),i.position]),i}function x(e,t){return b(r.db,e,t)}async function S(e,t){return r.db.transaction(async n=>{let r=await n.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[e]),i=await n.exec(`SELECT name FROM views WHERE folder_id IS ?`,[e]),a=new Set(i.map(e=>e.name.trim().toLowerCase())),o=[],s=r[0]?.maxpos??0;for(let r of t){let t=r.name.trim().toLowerCase();if(!t||a.has(t))continue;a.add(t);let i={id:`v_${crypto.randomUUID()}`,name:r.name,layout:r.layout,isDefault:!1,position:++s,cfg:r.cfg};await n.exec(`INSERT INTO views (id, folder_id, name, layout, config, kind, is_default, position) VALUES (?,?,?,?,?,'shared',0,?)`,[i.id,e,i.name,i.layout,JSON.stringify(i.cfg),i.position]),o.push(i)}return o})}async function C(e,t){await r.db.exec(`UPDATE views SET name = ? WHERE id = ?`,[t,e])}async function w(e,t){await e.exec(`DELETE FROM view_order WHERE view_id = ?`,[t]),await e.exec(`DELETE FROM views WHERE id = ?`,[t])}function T(e){return w(r.db,e)}async function te(e,t){await r.db.exec(`UPDATE views SET is_default = 0 WHERE folder_id IS ?`,[e]),await r.db.exec(`UPDATE views SET is_default = 1 WHERE id = ?`,[t])}async function E(e,t,n,r){await e.exec(`UPDATE views SET layout = ?, config = ? WHERE id = ?`,[n,JSON.stringify(r),t])}function D(e,t,n){return E(r.db,e,t,n)}async function O(e,t,n){await r.db.exec(`INSERT INTO view_order (view_id, topping_id, order_key) VALUES (?,?,?)
       ON CONFLICT(view_id, topping_id) DO UPDATE SET order_key = excluded.order_key`,[e,t,n])}async function k(e,t){let{spacedOrderKeys:n}=await i(async()=>{let{spacedOrderKeys:e}=await import(`./orderKeys-CnN8jkRY.js`).then(e=>e.n);return{spacedOrderKeys:e}},__vite__mapDeps([0,1])),a=n(t.length),o=new Map;return await r.db.transaction(async n=>{for(let r=0;r<t.length;r+=1){let i=t[r],s=a[r];o.set(i,s),await n.exec(`INSERT INTO view_order (view_id, topping_id, order_key) VALUES (?,?,?)
           ON CONFLICT(view_id, topping_id) DO UPDATE SET order_key = excluded.order_key`,[e,i,s])}}),o}async function A(e,t,n){let r=await e.exec(`SELECT MAX(position) AS maxpos FROM views WHERE folder_id IS ?`,[n]);await e.exec(`UPDATE views SET folder_id = ?, is_default = 0, position = ? WHERE id = ?`,[n,(r[0]?.maxpos??0)+1,t])}function j(e){return{list:t=>v(e,t),create:(t,n)=>b(e,t,n),delete:t=>w(e,t),moveToFolder:(t,n)=>A(e,t,n),saveState:(t,n,r)=>E(e,t,n,r)}}var M={eq:`=`,ne:`!=`,lt:`<`,lte:`<=`,gt:`>`,gte:`>=`},N=e=>e.replace(/[\\%_]/g,`\\$&`);function P(e,t){if(e.op!==`cmp`){if(e.children.length===0)return`1`;let n=e.op===`not`?` OR `:` ${e.op.toUpperCase()} `,r=`(`+e.children.map(e=>P(e,t)).join(n)+`)`;return e.op===`not`?`NOT ${r}`:r}if(e.key===`$title`||e.key===`$basename`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.title, ?) > 0`:`t.title ${M[e.cmp]??`=`} ?`;if(e.key===`$name`){let n=String(e.value);t.push(n,`%/${N(n)}`);let r=`(t.content_ref = ? OR t.content_ref LIKE ? ESCAPE '\\')`;return e.cmp===`ne`?`NOT ${r}`:r}if(e.key===`$path`)return t.push(String(e.value)),e.cmp===`contains`?`INSTR(t.content_ref, ?) > 0`:`t.content_ref ${M[e.cmp]??`=`} ?`;if(e.key===`$folder`){let n=`CASE WHEN f.path = '/' THEN '' ELSE SUBSTR(f.path, 2) END`;if(e.cmp===`inFolder`){let r=String(e.value).replace(/^\/+|\/+$/g,``);return t.push(r,`${N(r)}/%`),`(${n} = ? OR ${n} LIKE ? ESCAPE '\\')`}return e.cmp===`startsWith`?(t.push(String(e.value)),`INSTR(${n}, ?) = 1`):(t.push(String(e.value)),e.cmp===`contains`?`INSTR(${n}, ?) > 0`:`${n} ${M[e.cmp]??`=`} ?`)}if(e.key===`$ext`){let n=`%.${N(String(e.value).replace(/^[.]/,``).toLowerCase())}`;return t.push(n),e.cmp===`ne`?`LOWER(t.content_ref) NOT LIKE ? ESCAPE '\\'`:`LOWER(t.content_ref) LIKE ? ESCAPE '\\'`}if(e.key===`$updated`)return t.push(Number(e.value)),`(unixepoch(t.updated_at) * 1000) ${M[e.cmp]??`=`} ?`;if(e.key===`$type`)return t.push(String(e.value)),`t.type = ?`;if(e.key===`$interaction.status`)return t.push(String(e.value)),e.cmp===`ne`?`EXISTS (
        SELECT 1
        FROM topping_entities te
        JOIN interactions i
          ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
        WHERE te.topping_id = t.id AND i.owner_id = 'local' AND i.slot IS NOT NULL
      ) AND NOT EXISTS (
        SELECT 1
        FROM topping_entities te
        JOIN interactions i
          ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
        WHERE te.topping_id = t.id AND i.owner_id = 'local' AND i.slot = ?
      )`:`EXISTS (
      SELECT 1
      FROM topping_entities te
      JOIN interactions i
        ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
      WHERE te.topping_id = t.id AND i.owner_id = 'local'
        AND i.slot = ?
    )`;if(e.key===`$interaction.rating`)return t.push(Number(e.value)),e.cmp===`ne`?`EXISTS (
        SELECT 1
        FROM topping_entities te
        JOIN interactions i
          ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
        WHERE te.topping_id = t.id AND i.owner_id = 'local' AND i.rating IS NOT NULL
      ) AND NOT EXISTS (
        SELECT 1
        FROM topping_entities te
        JOIN interactions i
          ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
        WHERE te.topping_id = t.id AND i.owner_id = 'local' AND i.rating = ?
      )`:`EXISTS (
      SELECT 1
      FROM topping_entities te
      JOIN interactions i
        ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
      WHERE te.topping_id = t.id AND i.owner_id = 'local'
        AND i.rating IS NOT NULL
        AND i.rating ${M[e.cmp]??`=`} ?
    )`;if(e.cmp===`tagged`){let n=String(e.value).replace(/^#/,``).toLowerCase();return t.push(n,`${N(n)}/%`),`EXISTS (
      SELECT 1 FROM topping_tags tt JOIN tags g ON g.id = tt.tag_id
      WHERE tt.topping_id = t.id AND (g.name = ? OR g.name LIKE ? ESCAPE '\\')
    )`}return typeof e.value==`number`||typeof e.value==`boolean`?(t.push(e.key,typeof e.value==`boolean`?+!!e.value:e.value),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_num ${M[e.cmp]??`=`} ?)`):e.cmp===`contains`?(t.push(e.key,String(e.value),String(e.value)),`EXISTS (
      SELECT 1 FROM properties p
      WHERE p.topping_id = t.id AND p.key = ?
        AND (
          (p.kind = 'list' AND EXISTS (SELECT 1 FROM json_each(p.value_text) j WHERE CAST(j.value AS TEXT) = ?))
          OR (p.kind != 'list' AND INSTR(p.value_text, ?) > 0)
        )
    )`):(t.push(e.key,String(e.value)),`EXISTS (SELECT 1 FROM properties p WHERE p.topping_id = t.id AND p.key = ? AND p.value_text ${M[e.cmp]??`=`} ?)`)}function F(e){if(!e||e.op===`not`||e.op===`or`)return null;if(e.op===`cmp`)return e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`eq`)?String(e.value):null;for(let t of e.children){let e=F(t);if(e!==null)return e}return null}function I(e){return!e||e.op===`not`||e.op===`or`?!1:e.op===`cmp`?e.key===`$folder`&&(e.cmp===`inFolder`||e.cmp===`startsWith`):e.children.some(I)}async function L(e,t,n){let i=[],a=``,o,s=t.sorts.length>0?t.sorts:[u],c=s[0]?.key===`$manual`;if(c)a=`LEFT JOIN view_order vo ON vo.topping_id = t.id AND vo.view_id = ?`,i.push(n??``),o=`(vo.order_key IS NULL) ASC, vo.order_key ASC, t.updated_at DESC`;else{let e=[],t=[];for(let[n,r]of s.entries()){let a=r.dir===`asc`?`ASC`:`DESC`;if(r.key===`$updated`)t.push(`t.updated_at ${a}`);else if(r.key===`$created`)t.push(`t.created_at ${a}`);else if(r.key===`$title`||r.key===`$basename`||r.key===`$name`)t.push(`t.title COLLATE NOCASE ${a}`);else if(r.key===`$path`)t.push(`t.content_ref COLLATE NOCASE ${a}`);else if(r.key===`$folder`)t.push(`f.path COLLATE NOCASE ${a}`);else{let o=`s${n}`;e.push(`LEFT JOIN properties ${o} ON ${o}.topping_id = t.id AND ${o}.key = ?`),i.push(r.key),t.push(`(${o}.topping_id IS NULL) ASC`,`${o}.value_num ${a}`,`${o}.value_text COLLATE NOCASE ${a}`)}}a=e.join(` `),o=[...t,`t.id ASC`].join(`, `)}let l=``;e&&!I(t.filters)&&(l+=` AND t.folder_id = ?`,i.push(e)),t.filters&&(l+=` AND ${P(t.filters,i)}`);let d=(await r.db.exec(`SELECT t.id, t.type, t.title, t.content_ref, t.source, f.name AS folder, t.updated_at, t.thumb_ref, t.thumb_color, t.thumb_aspect${c?`, vo.order_key`:``}
     FROM toppings t JOIN folders f ON f.id = t.folder_id ${a}
     WHERE t.deleted_at IS NULL ${l}
     ORDER BY ${o}`,i)).map(e=>({id:e.id,type:e.type,title:e.title,subtitle:e.folder,contentRef:e.source===`vault`?e.content_ref:null,updatedAt:e.updated_at,thumbRef:e.thumb_ref,thumbColor:e.thumb_color,aspect:e.thumb_aspect,...c?{orderKey:e.order_key??null}:{}})),f=await z(d.map(e=>e.id));for(let e of d){let t=f.get(e.id);t&&(e.interactionMarks=t)}return d}var R=new Set([`queued`,`active`,`done`,`dropped`]);async function z(e){if(e.length===0)return new Map;let t=e.length<=900,n=await r.db.exec(`SELECT te.topping_id, i.set_id, s.name AS set_name, s.labels, i.slot, i.rating
     FROM topping_entities te
     JOIN interactions i
       ON i.entity_kind = te.entity_kind AND i.entity_key = te.entity_key
     JOIN status_sets s ON s.id = i.set_id
     WHERE i.owner_id = 'local'
       AND (i.slot IS NOT NULL OR i.rating IS NOT NULL)
       ${t?`AND te.topping_id IN (${e.map(()=>`?`).join(`,`)})`:``}
     ORDER BY i.updated_at DESC, i.set_id`,t?e:[]),i=new Set(e),a=new Map;for(let e of n){if(!i.has(e.topping_id))continue;let t=e.slot&&R.has(e.slot)?e.slot:null,n=B(e.labels),r={setId:e.set_id,setName:e.set_name,slot:t,statusLabel:t?n[t]??t:null,rating:e.rating},o=a.get(e.topping_id)??[];o.push(r),a.set(e.topping_id,o)}return a}function B(e){try{let t=JSON.parse(e),n={};for(let e of R)typeof t[e]==`string`&&(n[e]=t[e]);return n}catch{return{}}}function V(e){if(!e)return null;switch(e.kind){case`number`:return e.value;case`money`:return e.amount;case`duration`:return e.seconds;case`checkbox`:return+!!e.value;case`date`:return Date.parse(e.iso)||0;default:return t(e).toLowerCase()}}async function H(e,i,a){let o=i.key,s=new Map;if(!o.startsWith(`$`)){let e=new Set(a.map(e=>e.id)),t=[];if(a.length>0&&a.length<=2e3){let n=[...e];for(let e=0;e<n.length;e+=500){let i=n.slice(e,e+500);t.push(...await r.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
           FROM properties p
           WHERE p.key = ? AND p.topping_id IN (${i.map(()=>`?`).join(`,`)})`,[o,...i]))}}else a.length>0&&t.push(...await r.db.exec(`SELECT p.topping_id, p.kind, p.value_text, p.value_num, p.value_aux
         FROM properties p JOIN toppings t ON t.id = p.topping_id
         WHERE t.deleted_at IS NULL AND p.key = ?`,[o]));for(let r of t){if(!e.has(r.topping_id))continue;let t=n(r.kind,r.value_text,r.value_num,r.value_aux);t&&s.set(r.topping_id,t)}}let c=new Map;for(let e of a){let n=s.get(e.id),r=o===`$title`||o===`$basename`?e.title:o===`$name`?e.contentRef?.split(`/`).pop()??null:o===`$path`?e.contentRef??null:o===`$folder`?e.contentRef?.split(`/`).slice(0,-1).join(`/`)??null:o===`$ext`?e.contentRef?.split(`.`).pop()?.toLowerCase()??null:o===`$updated`?e.updatedAt??null:o===`$type`?e.type:null,i=n?t(n):r||`No ${o}`,a=n?V(n):r?o===`$updated`?Date.parse(r):r.toLowerCase():null,l=c.get(i)??{order:a,items:[]};l.items.push(e),c.set(i,l)}let l=i.dir===`desc`?-1:1,u=[...c.entries()].sort(([,e],[,t])=>e.order===null?1:t.order===null?-1:typeof e.order==`number`&&typeof t.order==`number`?(e.order-t.order)*l:String(e.order).localeCompare(String(t.order))*l);return{items:u.flatMap(([,e])=>e.items),groups:u.map(([e,t])=>({label:e,count:t.items.length}))}}async function ne(e){let t=await r.db.exec(`SELECT t.type, COUNT(*) AS count
       FROM toppings t
      WHERE folder_id = ? AND deleted_at IS NULL
      GROUP BY t.type
      ORDER BY type`,[e]);return Object.fromEntries(t.map(e=>[e.type,e.count]))}async function U(e){return e.length===0?[]:(await r.db.exec(`SELECT DISTINCT t.content_ref
       FROM properties p JOIN toppings t ON t.id = p.topping_id
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref IS NOT NULL
        AND p.key IN (${e.map(()=>`?`).join(`,`)})`,e)).map(e=>e.content_ref)}async function W(e){return(await r.db.exec(`SELECT value_text FROM properties WHERE topping_id = ? AND key = 'url'`,[e]))[0]?.value_text??null}async function G(e){let t=(await r.db.exec(`SELECT t.id, t.type, t.title, t.content_ref,
            f.name AS folder, t.updated_at
       FROM toppings t
       JOIN folders f ON f.id = t.folder_id
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.content_ref = ?
      LIMIT 1`,[e]))[0];return t?{id:t.id,type:t.type,title:t.title,subtitle:t.folder,contentRef:t.content_ref,updatedAt:t.updated_at}:null}async function K(e){let t=[...new Set(e.filter(e=>e.startsWith(`topping:`)).map(e=>e.slice(8)))],n=new Map;for(let e=0;e<t.length;e+=800){let i=t.slice(e,e+800),a=await r.db.exec(`SELECT t.id, t.type, t.title, t.content_ref,
              t.source, f.name AS folder, t.deleted_at, te.entity_key, i.slot
         FROM toppings t
         JOIN folders f ON f.id = t.folder_id
         LEFT JOIN topping_entities te
           ON te.topping_id = t.id AND te.entity_kind = 'url'
         LEFT JOIN interactions i
           ON i.owner_id = 'local'
          AND i.entity_kind = te.entity_kind
          AND i.entity_key = te.entity_key
        WHERE t.source = 'vault' AND t.id IN (${i.map(()=>`?`).join(`,`)})
        ORDER BY t.id, i.updated_at DESC`,i);for(let e of a){let t=`topping:${e.id}`,r=n.get(t);r?e.entity_key!==null&&(r.trackable=!0,r.entityKey=e.entity_key):(r={item:{id:e.id,type:e.type,title:e.title,subtitle:e.folder,contentRef:e.source===`vault`?e.content_ref:null},trackable:e.entity_key!==null,entityKey:e.entity_key,trashed:e.deleted_at!==null,slots:new Set},n.set(t,r)),e.slot!==null&&R.has(e.slot)&&r.slots.add(e.slot)}}return n}async function q(e){let t=e?`AND t.folder_id = ?`:``;return J(await r.db.exec(`SELECT p.key, p.kind, COUNT(*) AS item_count
       FROM properties p JOIN toppings t ON t.id = p.topping_id
      WHERE t.deleted_at IS NULL ${t}
      GROUP BY p.key, p.kind
      ORDER BY p.key, item_count DESC, p.kind`,e?[e]:[])).map(({key:e,kind:t})=>({key:e,kind:t}))}function J(e){let t=new Map;for(let n of e){let e=t.get(n.key);(!e||n.item_count>e.item_count||n.item_count===e.item_count&&n.kind.localeCompare(e.kind)<0)&&t.set(n.key,n)}return[...t.values()].sort((e,t)=>e.key.localeCompare(t.key)).map(({key:e,kind:t,item_count:n})=>({key:e,kind:t,itemCount:n}))}async function Y(e){let t=e===null?``:`AND t.folder_id = ?`,n=e===null?[]:[e],[i,a]=await Promise.all([r.db.exec(`SELECT COUNT(*) AS live_item_count
         FROM toppings t
        WHERE t.deleted_at IS NULL ${t}`,n),r.db.exec(`SELECT p.key, p.kind, COUNT(DISTINCT t.id) AS item_count
         FROM properties p
         JOIN toppings t ON t.id = p.topping_id
        WHERE t.deleted_at IS NULL ${t}
        GROUP BY p.key, p.kind
        ORDER BY p.key, item_count DESC, p.kind`,n)]);return{liveItemCount:i[0]?.live_item_count??0,fields:J(a)}}async function X(e){let t=e?`AND t.folder_id = ?`:``,n=await r.db.exec(`SELECT p.key,
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
     WHERE t.deleted_at IS NULL AND p.kind IN ('text', 'select') ${t}
     GROUP BY p.key ORDER BY p.key`,e?[e]:[]),i=typeof Intl.supportedValuesOf==`function`?new Set(Intl.supportedValuesOf(`currency`)):null;return n.filter(e=>e.invalid>0||!e.codes?!1:e.codes.split(`,`).every(e=>{if(i)return i.has(e);try{return new Intl.NumberFormat(`en`,{style:`currency`,currency:e}),!0}catch{return!1}})).map(e=>e.key)}async function Z(e,t={}){if(t.itemIds?.length===0)return new Map;let i=[],a=[`t.deleted_at IS NULL`];e&&(a.push(`t.folder_id = ?`),i.push(e)),t.kinds?.length&&(a.push(`p.kind IN (${t.kinds.map(()=>`?`).join(`,`)})`),i.push(...t.kinds)),t.itemIds!==void 0&&t.itemIds.length<=900&&(a.push(`p.topping_id IN (${t.itemIds.map(()=>`?`).join(`,`)})`),i.push(...t.itemIds));let o=await r.db.exec(`SELECT p.topping_id, p.key, p.kind, p.value_text, p.value_num, p.value_aux
     FROM properties p JOIN toppings t ON t.id = p.topping_id
     WHERE ${a.join(` AND `)}`,i),s=t.itemIds?new Set(t.itemIds):null,c=new Map;for(let e of o){if(s&&!s.has(e.topping_id))continue;let t=n(e.kind,e.value_text,e.value_num,e.value_aux);if(!t)continue;let r=c.get(e.topping_id);r||c.set(e.topping_id,r={}),r[e.key]=t}return c}async function re(e,t){let i=await r.db.exec(`SELECT t.id, t.title, t.content_ref, p.key, p.kind, p.value_text, p.value_num, p.value_aux
       FROM toppings t JOIN properties p ON p.topping_id = t.id AND p.key IN (?, ?)
      WHERE t.source = 'vault' AND t.deleted_at IS NULL AND t.type = 'note'`,[e,t]),a=new Map;for(let e of i){let t=n(e.kind,e.value_text,e.value_num,e.value_aux);if(!t)continue;let r=a.get(e.id);r||a.set(e.id,r={id:e.id,title:e.title,contentRef:e.content_ref,props:{}}),r.props[e.key]=t}return[...a.values()]}async function ie(){return(await r.db.exec(`SELECT COUNT(*) AS count
       FROM content_documents
      WHERE status = 'pending'`))[0]?.count??0}async function ae(e){let t=(await r.db.exec(`SELECT status, media_type, page_count, detail
       FROM content_documents
      WHERE topping_id = ?`,[e]))[0];return t?{status:t.status,mediaType:t.media_type,pageCount:t.page_count,detail:t.detail}:null}function oe(e){let t=e.replace(/[\u0000-\u001f\u007f]/g,` `).split(/\s+/).filter(Boolean);return t.length===0?null:t.map(e=>`"${e.replaceAll(`"`,`""`)}"*`).join(` `)}function Q(e,t){for(let n of e){if(n.id===t)return n;let e=Q(n.children,t);if(e)return e}return null}function $(e,t){let n=Q(e,t);if(!n)return[t];let r=[],i=e=>{r.push(e.id),e.children.forEach(i)};return i(n),r}async function se(e,t){let n=oe(e);if(n===null||t!==null&&t.length===0)return{results:[],truncated:!1};let i=[],a=``;t!==null&&(a=`AND t.folder_id IN (${t.map(()=>`?`).join(`,`)})`,i.push(...t));let o=[n,...i,n,...i],s=await r.db.exec(`WITH topping_matches AS (
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
        WHERE toppings_fts MATCH ? AND t.deleted_at IS NULL ${a}
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
        WHERE content_chunks_fts MATCH ? AND t.deleted_at IS NULL ${a}
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
      LIMIT 101`,o),c=s.length>100;return{results:s.slice(0,100).map(e=>({resultKey:e.result_key,id:e.id,type:e.type,title:e.title,titleMarked:e.title_marked,snippet:e.body_snippet,contentRef:e.source===`vault`?e.content_ref:null,folderId:e.folder_id,folderName:e.folder_name,anchor:e.anchor_page===null?null:{kind:`page`,page:e.anchor_page}})),truncated:c}}async function ce(e){if(e===null)return``;let t=await r.db.exec(`SELECT path, home FROM folders WHERE id = ?`,[e]);return t[0]?a(t[0]):null}var le=e=>e instanceof Error?e.message:String(e);export{te as A,re as C,O as D,C as E,j as M,o as N,D as O,Z as S,G as T,K as _,T as a,Y as b,F as c,X as d,ne as f,W as g,L as h,S as i,ce as j,se as k,y as l,H as m,$ as n,k as o,s as p,x as r,I as s,le as t,ae as u,U as v,l as w,q as x,ie as y};