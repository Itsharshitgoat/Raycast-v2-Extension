"use strict";var kt=Object.create;var A=Object.defineProperty;var wt=Object.getOwnPropertyDescriptor;var St=Object.getOwnPropertyNames;var yt=Object.getPrototypeOf,Tt=Object.prototype.hasOwnProperty;var It=(t,e)=>{for(var i in e)A(t,i,{get:e[i],enumerable:!0})},z=(t,e,i,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of St(e))!Tt.call(t,a)&&a!==i&&A(t,a,{get:()=>e[a],enumerable:!(r=wt(e,a))||r.enumerable});return t};var u=(t,e,i)=>(i=t!=null?kt(yt(t)):{},z(e||!t||!t.__esModule?A(i,"default",{value:t,enumerable:!0}):i,t)),_t=t=>z(A({},"__esModule",{value:!0}),t);var Lt={};It(Lt,{default:()=>Et});module.exports=_t(Lt);var n=require("@raycast/api"),w=require("react");var v=u(require("path")),F=u(require("crypto")),O=u(require("fs")),J=require("@raycast/api"),M=require("child_process"),V=require("util"),Dt=(0,V.promisify)(M.execFile),L=v.default.join(J.environment.supportPath,"stickers.db");function _(t){return String(t).replace(/'/g,"''")}async function g(t){return new Promise((e,i)=>{let r=(0,M.execFile)("/usr/bin/sqlite3",["--json",L],(a,s,m)=>{if(a){console.error("SQL Error:",a.message,`
Query:`,t,`
Stderr:`,m),i(a);return}if(!s.trim()){e([]);return}try{e(JSON.parse(s))}catch(l){console.error("JSON Parse Error for output:",s),i(l)}});r.stdin&&(r.stdin.write(t),r.stdin.end())})}async function D(){let t=`
    CREATE TABLE IF NOT EXISTS packs (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        icon       TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stickers (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        filename      TEXT NOT NULL UNIQUE,
        format        TEXT NOT NULL,
        file_hash     TEXT NOT NULL,
        width         INTEGER,
        height        INTEGER,
        file_size     INTEGER,
        pack_id       TEXT,
        is_favorite   INTEGER DEFAULT 0,
        use_count     INTEGER DEFAULT 0,
        source        TEXT DEFAULT 'clipboard',
        source_url    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS sticker_tags (
        sticker_id TEXT NOT NULL,
        tag_id     TEXT NOT NULL,
        PRIMARY KEY (sticker_id, tag_id),
        FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sticker_keywords (
        sticker_id TEXT NOT NULL,
        keyword    TEXT NOT NULL,
        PRIMARY KEY (sticker_id, keyword),
        FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON stickers(pack_id);
    CREATE INDEX IF NOT EXISTS idx_stickers_is_favorite ON stickers(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_stickers_file_hash ON stickers(file_hash);
    CREATE INDEX IF NOT EXISTS idx_stickers_use_count ON stickers(use_count DESC);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `;O.default.existsSync(L)||(O.default.mkdirSync(v.default.dirname(L),{recursive:!0}),O.default.writeFileSync(L,"")),await g(t)}function d(t){return t==null?"NULL":typeof t=="number"?t.toString():`'${_(t)}'`}async function G(t){let e=F.default.randomUUID(),i=new Date().toISOString(),r=`
    INSERT INTO stickers (
      id, name, filename, format, file_hash, width, height, file_size, 
      pack_id, is_favorite, use_count, source, source_url, created_at, updated_at
    ) VALUES (
      '${e}', 
      ${d(t.name)}, 
      ${d(t.filename)}, 
      ${d(t.format)}, 
      ${d(t.file_hash)}, 
      ${d(t.width)}, 
      ${d(t.height)}, 
      ${d(t.file_size)}, 
      ${d(t.pack_id)}, 
      ${t.is_favorite}, 
      0, 
      ${d(t.source)}, 
      ${d(t.source_url)}, 
      '${i}', 
      '${i}'
    );
  `;return await g(r),e}async function K(t){let e=await g(`SELECT * FROM stickers WHERE file_hash = '${_(t)}' LIMIT 1;`);return e.length>0?e[0]:null}async function q(t,e){let i=F.default.randomUUID(),r=new Date().toISOString(),a=`
    INSERT INTO packs (id, name, icon, sort_order, created_at)
    VALUES ('${i}', ${d(t)}, ${d(e??null)}, 0, '${r}');
  `;return await g(a),i}async function Q(){return await g("SELECT * FROM packs ORDER BY sort_order ASC, created_at DESC;")}async function Z(t,e){if(e.length!==0)for(let i of e){let r=F.default.randomUUID();await g(`INSERT OR IGNORE INTO tags (id, name) VALUES ('${r}', ${d(i)});`);let a=await g(`SELECT id FROM tags WHERE name = ${d(i)} LIMIT 1;`);if(a.length>0){let s=a[0].id;await g(`INSERT OR IGNORE INTO sticker_tags (sticker_id, tag_id) VALUES ('${_(t)}', '${s}');`)}}}async function tt(t,e){await g(`DELETE FROM sticker_keywords WHERE sticker_id = '${_(t)}';`);for(let i of e)await g(`INSERT INTO sticker_keywords (sticker_id, keyword) VALUES ('${_(t)}', ${d(i)});`)}var $=require("@raycast/api"),N=u(require("fs")),H=u(require("crypto")),dt=u(require("path")),pt=require("child_process"),ut=require("util"),gt=require("url");var et=require("@raycast/api"),X=require("fs"),R=u(require("path")),it=u(require("crypto")),rt=require("child_process"),nt=require("util"),B=R.join(et.environment.supportPath,"images"),Ct=(0,nt.promisify)(rt.execFile);async function Rt(){await X.promises.mkdir(B,{recursive:!0})}async function at(t,e,i){await Rt();let r=`${e}.${i}`,a=R.join(B,r);return await X.promises.writeFile(a,t),r}function st(t){return R.join(B,t)}function ot(t){return it.createHash("sha256").update(t).digest("hex")}function U(t){return!t||t.length<12?null:t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"png":t[0]===255&&t[1]===216&&t[2]===255?"jpg":t.toString("ascii",0,3)==="GIF"&&t.toString("ascii",3,6).match(/8[79]a/)?"gif":t.toString("ascii",0,4)==="RIFF"&&t.toString("ascii",8,12)==="WEBP"?"webp":null}function ct(t){if(!t||t.length<24)return null;switch(U(t)){case"png":return{width:t.readUInt32BE(16),height:t.readUInt32BE(20)};case"jpg":{let i=2;for(;i<t.length-8;){let r=t.readUInt16BE(i);if(i+=2,r===65472||r===65474)return{height:t.readUInt16BE(i+3),width:t.readUInt16BE(i+5)};let a=t.readUInt16BE(i);i+=a}return null}case"gif":return{width:t.readUInt16LE(6),height:t.readUInt16LE(8)};case"webp":{if(t.length<30)return null;let i=t.toString("ascii",12,16);if(i==="VP8 "){let r=t.readUInt16LE(26),a=t.readUInt16LE(28);return{width:r&16383,height:a&16383}}else if(i==="VP8L"){let r=t.readUInt32LE(21);return{width:(r&16383)+1,height:(r>>14&16383)+1}}else if(i==="VP8X"){let r=(t[24]|t[25]<<8|t[26]<<16)+1,a=(t[27]|t[28]<<8|t[29]<<16)+1;return{width:r,height:a}}return null}default:return null}}var k=require("@raycast/api"),C=require("child_process"),j=require("util"),S=u(require("fs")),x=u(require("path")),xt=(0,j.promisify)(C.execFile),lt=(0,j.promisify)(C.exec);async function Nt(){let t=x.default.join(k.environment.supportPath,"analyze_vision"),e=x.default.join(k.environment.assetsPath,"analyze.swift"),i=x.default.join(k.environment.supportPath,"ModuleCache");try{let[r,a]=await Promise.all([S.default.promises.stat(t),S.default.promises.stat(e)]);if(a.mtimeMs<=r.mtimeMs)return t}catch{}return await S.default.promises.mkdir(i,{recursive:!0}),await lt(`swiftc -module-cache-path "${i}" "${e}" -o "${t}"`),t}async function Pt(t){try{let e=await Nt(),{stdout:i}=await xt(e,[t]),r=JSON.parse(i);if(r.error)throw new Error(r.error);return{tags:r.tags||[],text:r.text||""}}catch(e){return console.error("Vision Analysis failed:",e),{tags:[],text:""}}}async function mt(t){let e=await Pt(t),i=e.text?e.text.split(/\s+/).map(s=>s.replace(/[^a-zA-Z0-9]/g,"").toLowerCase()).filter(s=>s.length>1):[],r=await At(t);if(r)return e.text&&r.tags.push(...i.filter(s=>!r.tags.includes(s))),r;let a=`
You are a highly capable assistant that auto-tags meme and reaction stickers for search.
I ran an Apple Vision model on a sticker image.

Here are the visual concepts detected: [${e.tags.join(", ")}]
Here is the text extracted via OCR: "${e.text}"

Based on this information, generate:
1. A short, catchy name for the sticker (max 3 words). If there's prominent text, use it as the name. Otherwise, describe the vibe/subject.
2. 15 to 20 search tags. Be EXHAUSTIVE. Cover ALL of these dimensions:
   - What objects/animals/people are in the image (e.g. cat, dog, person, hat, glasses, sunglasses)
   - Emotions and expressions (e.g. angry, happy, sad, cool, shocked, confused, smug)
   - Actions (e.g. laughing, crying, dancing, sleeping, staring, pointing, holding)
   - Style (e.g. cartoon, anime, pixel, realistic, meme, sticker, drawing)
   - Colors (e.g. red, blue, yellow, colorful, dark)
   - Context and vibe (e.g. reaction, funny, sarcastic, wholesome, savage, relatable)
   - Accessories or props (e.g. glasses, sunglasses, hat, crown, coffee, phone)
3. 5 to 8 relevant emojis (as strings).

Return EXACTLY a valid JSON object with this schema:
{
  "name": "string",
  "tags": ["string"],
  "keywords": ["string"]
}
Do not return any markdown formatting, only the JSON.`;try{let m=(await k.AI.ask(a,{creativity:1})).replace(/^```json/m,"").replace(/^```/m,"").trim(),l=JSON.parse(m);return l.name||(l.name="Unknown Sticker"),Array.isArray(l.tags)||(l.tags=["sticker"]),Array.isArray(l.keywords)||(l.keywords=[]),l.tags.push(...i.filter(h=>!l.tags.includes(h))),l}catch(s){console.error("Raycast AI failed:",s);let m="New Sticker";return e.text?m=e.text.slice(0,30):e.tags.length>0&&(m=e.tags[0],m=m.charAt(0).toUpperCase()+m.slice(1)),{name:m,tags:[...e.tags.slice(0,20),...i.filter(l=>!e.tags.includes(l))],keywords:[]}}}async function At(t){let e=(0,k.getPreferenceValues)();if(!e.useOllama||!e.ollamaModel)return null;try{let i=await S.default.promises.readFile(t,{encoding:"base64"}),a=JSON.stringify({model:e.ollamaModel,prompt:`You are a highly capable assistant that auto-tags meme and reaction stickers for search.
Analyze this image and generate:
1. A short, catchy name for the sticker (max 3 words). If there's prominent text, use it as the name. Otherwise, describe the vibe/subject.
2. 15 to 20 search tags. Be EXHAUSTIVE. Cover ALL of these dimensions:
   - What objects/animals/people are in the image (e.g. cat, dog, person, hat, glasses, sunglasses)
   - Emotions and expressions (e.g. angry, happy, sad, cool, shocked, confused, smug)
   - Actions (e.g. laughing, crying, dancing, sleeping, staring, pointing, holding)
   - Style (e.g. cartoon, anime, pixel, realistic, meme, sticker, drawing)
   - Colors (e.g. red, blue, yellow, colorful, dark)
   - Context and vibe (e.g. reaction, funny, sarcastic, wholesome, savage, relatable)
   - Accessories or props (e.g. glasses, sunglasses, hat, crown, coffee, phone)
3. 5 to 8 relevant emojis (as strings).

Return EXACTLY a valid JSON object with this schema:
{
  "name": "string",
  "tags": ["string"],
  "keywords": ["string"]
}
Do not return any markdown formatting, only the JSON.`,stream:!1,images:[i],format:"json"}),s=x.default.join(k.environment.supportPath,"ollama_payload.json");await S.default.promises.writeFile(s,a);let{stdout:m}=await lt(`curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d @"${s}"`,{maxBuffer:10*1024*1024,timeout:12e4});S.default.promises.unlink(s).catch(()=>{});let h=JSON.parse(m).response.replace(/^```json/m,"").replace(/^```/m,"").trim(),p=JSON.parse(h);return p.name||(p.name="Unknown Sticker"),Array.isArray(p.tags)||(p.tags=["sticker"]),Array.isArray(p.keywords)||(p.keywords=[]),p}catch(i){return console.error("Ollama vision analysis failed:",i),null}}var Ot=(0,ut.promisify)(pt.execFile);async function ht(t){let e=await $.Clipboard.read(),i;if(e.file){let r=e.file.startsWith("file://")?(0,gt.fileURLToPath)(e.file):e.file;i=await N.default.promises.readFile(r)}else{if(e.text&&e.text.startsWith("http"))return W(e.text,t);throw new Error("No image found on clipboard")}return Y(i,"clipboard",t)}async function W(t,e){let i=dt.default.join($.environment.supportPath,`dl_${H.default.randomUUID()}`);try{await Ot("/usr/bin/curl",["-sL","-o",i,"--max-time","30","-H","User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",t]);let r=await N.default.promises.readFile(i);if(r.length===0)throw new Error("Downloaded file is empty \u2014 the URL may be invalid");if(!U(r))throw new Error("URL does not point to a valid image (unsupported format)");return Y(r,"url",e,t)}finally{N.default.promises.unlink(i).catch(()=>{})}}async function ft(t,e){let i=await N.default.promises.readFile(t);return Y(i,"file",e)}async function Y(t,e,i,r){let a=U(t);if(!a)throw new Error("Unsupported image format");await D();let s=ot(t),m=await K(s);if(m)return{stickerId:m.id,isDuplicate:!0,existingSticker:m};let l=ct(t),h=H.default.randomUUID(),p=`${h}.${a}`;await at(t,h,a);let P=st(p),f=await mt(P),T=await G({name:f.name,filename:p,format:a,file_hash:s,width:l?.width??null,height:l?.height??null,file_size:t.length,pack_id:i.packId??null,is_favorite:0,source:e,source_url:r??null})??h;return f.tags&&f.tags.length>0&&await Z(T,f.tags),f.keywords&&f.keywords.length>0&&await tt(T,f.keywords),{stickerId:T,isDuplicate:!1}}var c=require("react/jsx-runtime");function Et(){let{pop:t}=(0,n.useNavigation)(),[e,i]=(0,w.useState)([]),[r,a]=(0,w.useState)(!0),[s,m]=(0,w.useState)("clipboard"),[l,h]=(0,w.useState)(""),[p,P]=(0,w.useState)(!1),[f,b]=(0,w.useState)();(0,w.useEffect)(()=>{(async()=>{try{await D();let o=await Q();i(o)}catch(o){await(0,n.showToast)({style:n.Toast.Style.Failure,title:"Failed to load packs",message:String(o)})}finally{a(!1)}})()},[]);async function T(o){if(s==="url"&&!o.url?.trim()){b("URL is required");return}P(!0);try{let E=o.packId==="__new__"?null:o.packId??null;o.packId==="__new__"&&o.newPackName?.trim()&&(E=await q(o.newPackName.trim(),o.newPackIcon?.trim()||null),await(0,n.showToast)({style:n.Toast.Style.Success,title:`Created pack "${o.newPackName.trim()}"`})),E===""&&(E=null);let I={packId:E},y;switch(await(0,n.showToast)({style:n.Toast.Style.Animated,title:"AI is analyzing sticker..."}),s){case"clipboard":y=await ht(I);break;case"url":y=await W(o.url,I);break;case"file":{if(!o.file||o.file.length===0)throw new Error("Please select a file");y=await ft(o.file[0],I);break}}if(!y)throw new Error("No import method selected");y.isDuplicate?await(0,n.showToast)({style:n.Toast.Style.Success,title:"Duplicate detected",message:`This sticker already exists as "${y.existingSticker?.name}"`}):await(0,n.showToast)({style:n.Toast.Style.Success,title:"Sticker added!",message:"Added to your vault"}),t()}catch(E){console.error("Import failed:",E);let I=E instanceof Error?E.message:String(E);await(0,n.showToast)({style:n.Toast.Style.Failure,title:"Import failed",message:I})}finally{P(!1)}}return(0,c.jsxs)(n.Form,{isLoading:r||p,navigationTitle:"Add Sticker",actions:(0,c.jsx)(n.ActionPanel,{children:(0,c.jsx)(n.Action.SubmitForm,{title:"Add Sticker",icon:n.Icon.Plus,onSubmit:T})}),children:[(0,c.jsxs)(n.Form.Dropdown,{id:"importMethod",title:"Import From",value:s,onChange:o=>m(o),children:[(0,c.jsx)(n.Form.Dropdown.Item,{value:"clipboard",title:"Clipboard",icon:n.Icon.Clipboard}),(0,c.jsx)(n.Form.Dropdown.Item,{value:"url",title:"Image URL",icon:n.Icon.Link}),(0,c.jsx)(n.Form.Dropdown.Item,{value:"file",title:"Local File",icon:n.Icon.Finder})]}),s==="clipboard"&&(0,c.jsx)(n.Form.Description,{title:"Source",text:"The image currently on your clipboard will be imported. Copy an image from the web, WhatsApp, or any app first."}),s==="url"&&(0,c.jsx)(n.Form.TextField,{id:"url",title:"Image URL",placeholder:"https://example.com/sticker.png",error:f,onChange:()=>b(void 0)}),s==="file"&&(0,c.jsx)(n.Form.FilePicker,{id:"file",title:"Select Image",allowMultipleSelection:!1,canChooseDirectories:!1,canChooseFiles:!0}),(0,c.jsx)(n.Form.Separator,{}),(0,c.jsxs)(n.Form.Dropdown,{id:"packId",title:"Pack (Optional)",value:l,onChange:h,children:[(0,c.jsx)(n.Form.Dropdown.Item,{value:"",title:"No Pack",icon:n.Icon.Minus}),e.map(o=>(0,c.jsx)(n.Form.Dropdown.Item,{value:o.id,title:`${o.icon?o.icon+" ":""}${o.name}`},o.id)),(0,c.jsx)(n.Form.Dropdown.Item,{value:"__new__",title:"Create New Pack...",icon:n.Icon.PlusCircle})]}),l==="__new__"&&(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(n.Form.TextField,{id:"newPackName",title:"New Pack Name",placeholder:"Reactions"}),(0,c.jsx)(n.Form.TextField,{id:"newPackIcon",title:"New Pack Icon",placeholder:"e.g. icon name or emoji"})]})]})}
