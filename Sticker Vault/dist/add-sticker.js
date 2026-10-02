"use strict";var yt=Object.create;var A=Object.defineProperty;var St=Object.getOwnPropertyDescriptor;var It=Object.getOwnPropertyNames;var Tt=Object.getPrototypeOf,_t=Object.prototype.hasOwnProperty;var Nt=(t,e)=>{for(var i in e)A(t,i,{get:e[i],enumerable:!0})},G=(t,e,i,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of It(e))!_t.call(t,n)&&n!==i&&A(t,n,{get:()=>e[n],enumerable:!(r=St(e,n))||r.enumerable});return t};var g=(t,e,i)=>(i=t!=null?yt(Tt(t)):{},G(e||!t||!t.__esModule?A(i,"default",{value:t,enumerable:!0}):i,t)),Rt=t=>G(A({},"__esModule",{value:!0}),t);var Dt={};Nt(Dt,{default:()=>wt});module.exports=Rt(Dt);var a=require("@raycast/api"),k=require("react");var M=g(require("path")),D=g(require("crypto")),F=g(require("fs")),V=require("@raycast/api"),j=require("child_process"),K=require("util"),$t=(0,K.promisify)(j.execFile),L=M.default.join(V.environment.supportPath,"stickers.db");function R(t){return String(t).replace(/'/g,"''")}async function f(t){return new Promise((e,i)=>{let r=(0,j.execFile)("/usr/bin/sqlite3",["--json",L],(n,o,m)=>{if(n){console.error("SQL Error:",n.message,`
Query:`,t,`
Stderr:`,m),i(n);return}if(!o.trim()){e([]);return}try{e(JSON.parse(o))}catch(l){console.error("JSON Parse Error for output:",o),i(l)}});r.stdin&&(r.stdin.write(t),r.stdin.end())})}async function U(){let t=`
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
  `;F.default.existsSync(L)||(F.default.mkdirSync(M.default.dirname(L),{recursive:!0}),F.default.writeFileSync(L,"")),await f(t)}function u(t){return t==null?"NULL":typeof t=="number"?t.toString():`'${R(t)}'`}async function q(t){let e=D.default.randomUUID(),i=new Date().toISOString(),r=`
    INSERT INTO stickers (
      id, name, filename, format, file_hash, width, height, file_size, 
      pack_id, is_favorite, use_count, source, source_url, created_at, updated_at
    ) VALUES (
      '${e}', 
      ${u(t.name)}, 
      ${u(t.filename)}, 
      ${u(t.format)}, 
      ${u(t.file_hash)}, 
      ${u(t.width)}, 
      ${u(t.height)}, 
      ${u(t.file_size)}, 
      ${u(t.pack_id)}, 
      ${t.is_favorite}, 
      0, 
      ${u(t.source)}, 
      ${u(t.source_url)}, 
      '${i}', 
      '${i}'
    );
  `;return await f(r),e}async function Q(t){let e=await f(`SELECT * FROM stickers WHERE file_hash = '${R(t)}' LIMIT 1;`);return e.length>0?e[0]:null}async function Z(t,e){let i=D.default.randomUUID(),r=new Date().toISOString(),n=`
    INSERT INTO packs (id, name, icon, sort_order, created_at)
    VALUES ('${i}', ${u(t)}, ${u(e??null)}, 0, '${r}');
  `;return await f(n),i}async function tt(){return await f("SELECT * FROM packs ORDER BY sort_order ASC, created_at DESC;")}async function et(t,e){if(e.length!==0)for(let i of e){let r=D.default.randomUUID();await f(`INSERT OR IGNORE INTO tags (id, name) VALUES ('${r}', ${u(i)});`);let n=await f(`SELECT id FROM tags WHERE name = ${u(i)} LIMIT 1;`);if(n.length>0){let o=n[0].id;await f(`INSERT OR IGNORE INTO sticker_tags (sticker_id, tag_id) VALUES ('${R(t)}', '${o}');`)}}}async function it(t,e){await f(`DELETE FROM sticker_keywords WHERE sticker_id = '${R(t)}';`);for(let i of e)await f(`INSERT INTO sticker_keywords (sticker_id, keyword) VALUES ('${R(t)}', ${u(i)});`)}var b=require("@raycast/api"),y=g(require("fs")),v=g(require("crypto")),W=g(require("path")),pt=require("child_process"),gt=require("util"),ft=require("url"),ht=g(require("os"));var rt=require("@raycast/api"),X=require("fs"),x=g(require("path")),at=g(require("crypto")),nt=require("child_process"),ot=require("util"),B=x.join(rt.environment.supportPath,"images"),bt=(0,ot.promisify)(nt.execFile);async function xt(){await X.promises.mkdir(B,{recursive:!0})}async function st(t,e,i){await xt();let r=`${e}.${i}`,n=x.join(B,r);return await X.promises.writeFile(n,t),r}function ct(t){return x.join(B,t)}function lt(t){return at.createHash("sha256").update(t).digest("hex")}function $(t){return!t||t.length<12?null:t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"png":t[0]===255&&t[1]===216&&t[2]===255?"jpg":t.toString("ascii",0,3)==="GIF"&&t.toString("ascii",3,6).match(/8[79]a/)?"gif":t.toString("ascii",0,4)==="RIFF"&&t.toString("ascii",8,12)==="WEBP"?"webp":null}function mt(t){if(!t||t.length<24)return null;switch($(t)){case"png":return{width:t.readUInt32BE(16),height:t.readUInt32BE(20)};case"jpg":{let i=2;for(;i<t.length-8;){let r=t.readUInt16BE(i);if(i+=2,r===65472||r===65474)return{height:t.readUInt16BE(i+3),width:t.readUInt16BE(i+5)};let n=t.readUInt16BE(i);i+=n}return null}case"gif":return{width:t.readUInt16LE(6),height:t.readUInt16LE(8)};case"webp":{if(t.length<30)return null;let i=t.toString("ascii",12,16);if(i==="VP8 "){let r=t.readUInt16LE(26),n=t.readUInt16LE(28);return{width:r&16383,height:n&16383}}else if(i==="VP8L"){let r=t.readUInt32LE(21);return{width:(r&16383)+1,height:(r>>14&16383)+1}}else if(i==="VP8X"){let r=(t[24]|t[25]<<8|t[26]<<16)+1,n=(t[27]|t[28]<<8|t[29]<<16)+1;return{width:r,height:n}}return null}default:return null}}var E=require("@raycast/api"),C=require("child_process"),H=require("util"),_=g(require("fs")),P=g(require("path")),Pt=(0,H.promisify)(C.execFile),dt=(0,H.promisify)(C.exec);async function Ot(){let t=P.default.join(E.environment.supportPath,"analyze_vision"),e=P.default.join(E.environment.assetsPath,"analyze.swift"),i=P.default.join(E.environment.supportPath,"ModuleCache");try{let[r,n]=await Promise.all([_.default.promises.stat(t),_.default.promises.stat(e)]);if(n.mtimeMs<=r.mtimeMs)return t}catch{}return await _.default.promises.mkdir(i,{recursive:!0}),await dt(`swiftc -module-cache-path "${i}" "${e}" -o "${t}"`),t}async function At(t){try{let e=await Ot(),{stdout:i}=await Pt(e,[t]),r=JSON.parse(i);if(r.error)throw new Error(r.error);return{tags:r.tags||[],text:r.text||""}}catch(e){return console.error("Vision Analysis failed:",e),{tags:[],text:""}}}async function ut(t){let e=await At(t),i=e.text?e.text.split(/\s+/).map(o=>o.replace(/[^a-zA-Z0-9]/g,"").toLowerCase()).filter(o=>o.length>1):[],r=await Ft(e);if(r)return r;let n=`
You are a highly creative and humorous assistant that auto-tags meme and reaction stickers for search.
I ran an Apple Vision model on a sticker image.

Here are the visual concepts detected: [${e.tags.join(", ")}]
Here is the text extracted via OCR: "${e.text}"

Based on this information, generate:
1. A short, catchy, and funny name for the sticker (max 3-5 words). You can creatively use Hinglish (Hindi + English) or English for the name to make it relatable and easy to find (e.g., "bhai kya kar raha hai", "samajh nahi aaya", "bruh moment").
2. 15 to 20 search tags. Think outside the box! Provide multiple varieties of creative and funny tags. Cover ALL of these dimensions:
   - Literal objects/people (e.g. cat, dog, person, hat, glasses)
   - Funny interpretations and emotions (e.g. ded, crying inside, savage, confused unga bunga)
   - Actions and vibe (e.g. judging you, laughing out loud, weird flex)
   - Hinglish/Desi slang context if applicable (e.g. desi, jugaad, mast, bakwas)
   - Context and use-case (e.g. reaction, sarcasm, wholesome, roasted)
3. 5 to 8 relevant emojis (as strings).

Return EXACTLY a valid JSON object with this schema:
{
  "name": "string",
  "tags": ["string"],
  "keywords": ["string"]
}
Do not return any markdown formatting, only the JSON.`;try{let m=(await E.AI.ask(n,{creativity:1})).replace(/^```json/m,"").replace(/^```/m,"").trim(),l=JSON.parse(m);return l.name||(l.name="Unknown Sticker"),Array.isArray(l.tags)||(l.tags=["sticker"]),Array.isArray(l.keywords)||(l.keywords=[]),l.tags.push(...i.filter(p=>!l.tags.includes(p))),l}catch(o){console.error("Raycast AI failed:",o);let m="New Sticker";return e.text?m=e.text.slice(0,30):e.tags.length>0&&(m=e.tags[0],m=m.charAt(0).toUpperCase()+m.slice(1)),{name:m,tags:[...e.tags.slice(0,20),...i.filter(l=>!e.tags.includes(l))],keywords:[]}}}async function Ft(t){let i=(0,E.getPreferenceValues)().ollamaModel||"gemma4:31b-cloud";try{let r=`You are a highly creative and humorous data-extraction assistant. Your sole purpose is to output valid JSON. 
You will receive visual concepts and OCR text from an image. You must interpret the context of the image deeply. Think about the vibe, emotions (e.g., funny, savage, weird), and any underlying meme/reaction context based on the data provided.

You must return exactly a valid JSON object with the following structure, and absolutely nothing else:
{
  "name": "A catchy, funny name using Hinglish or English (e.g., 'kya kar raha hai', 'bruh')",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keywords": ["emoji1", "emoji2", "emoji3"]
}

Rules:
- NEVER output conversational text like "Here is the JSON" or "Sure!".
- ONLY output the raw JSON object.
- "tags" must be an array of strings containing exactly the tags you generate. You MUST include multiple varieties of creative and funny tags, including Hinglish/Desi slang (if applicable), interpretations (e.g., 'ded', 'crying inside'), and literal objects. Be exhaustive (15-20 tags) and think outside the box!
- "keywords" must be an array of emoji strings matching the emotion/vibe.`,n=`Visual concepts detected: [${t.tags.join(", ")}]
Text extracted via OCR: "${t.text}"

Generate the JSON object for this sticker.`,o=JSON.stringify({model:i,system:r,prompt:n,stream:!1,format:"json"}),m=P.default.join(E.environment.supportPath,"ollama_payload.json");await _.default.promises.writeFile(m,o);let{stdout:l}=await dt(`curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d @"${m}"`,{maxBuffer:10*1024*1024,timeout:12e4});_.default.promises.unlink(m).catch(()=>{});let p=JSON.parse(l);if(!p||!p.response)throw new Error("Invalid response from Ollama");let w=p.response.trim(),S=w.match(/\{[\s\S]*\}/);S&&(w=S[0]);let d=JSON.parse(w);return{name:d.name&&typeof d.name=="string"?d.name:"Unknown Sticker",tags:Array.isArray(d.tags)?d.tags:typeof d.tags=="string"?d.tags.split(",").map(I=>I.trim()):["sticker"],keywords:Array.isArray(d.keywords)?d.keywords:[]}}catch(r){return console.error("Ollama analysis failed:",r),null}}var Y=(0,gt.promisify)(pt.execFile);async function Lt(){let t=v.default.randomUUID(),e=W.default.join(ht.default.tmpdir(),`raycast_sticker_clipboard_${t}.png`),i=`
    try
      set theFile to (POSIX file "${e}")
      set imageData to the clipboard as \xABclass PNGf\xBB
      set f to open for access theFile with write permission
      set eof of f to 0
      write imageData to f
      close access f
      return "SUCCESS"
    on error
      return "FAIL"
    end try
  `,r=`
    try {
      ObjC.import('AppKit');
      var pb = $.NSPasteboard.generalPasteboard;
      var options = $.NSDictionary.alloc.init;
      var classes = $.NSArray.arrayWithObject($.NSImage.class);
      var theImages = pb.readObjectsForClassesOptions(classes, options);
      if (theImages && theImages.count > 0) {
        var theImage = theImages.objectAtIndex(0);
        var tiffData = theImage.TIFFRepresentation;
        var bitmapRep = $.NSBitmapImageRep.imageRepWithData(tiffData);
        var pngData = bitmapRep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init);
        if (pngData && pngData.writeToFileAtomically("${e}", true)) {
          "SUCCESS";
        } else {
          "FAIL";
        }
      } else {
        "FAIL";
      }
    } catch (e) {
      "FAIL";
    }
  `;try{let{stdout:n}=await Y("osascript",["-e",i]);if(n.trim()==="SUCCESS")return await y.default.promises.readFile(e)}catch{}try{let{stdout:n}=await Y("osascript",["-l","JavaScript","-e",r]);if(n.trim()==="SUCCESS")return await y.default.promises.readFile(e)}catch{}finally{await y.default.promises.unlink(e).catch(()=>{})}return null}async function Et(t){let e=await b.Clipboard.read(),i=null;if(e.file){let r=e.file.startsWith("file://")?(0,ft.fileURLToPath)(e.file):e.file;i=await y.default.promises.readFile(r)}if(i||(i=await Lt()),!i&&e.text&&e.text.startsWith("http"))return J(e.text,t);if(!i)throw new Error("No image found on clipboard");return z(i,"clipboard",t)}async function J(t,e){let i=W.default.join(b.environment.supportPath,`dl_${v.default.randomUUID()}`);try{await Y("/usr/bin/curl",["-sL","-o",i,"--max-time","30","-H","User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",t]);let r=await y.default.promises.readFile(i);if(r.length===0)throw new Error("Downloaded file is empty \u2014 the URL may be invalid");if(!$(r))throw new Error("URL does not point to a valid image (unsupported format)");return z(r,"url",e,t)}finally{y.default.promises.unlink(i).catch(()=>{})}}async function kt(t,e){let i=await y.default.promises.readFile(t);return z(i,"file",e)}async function z(t,e,i,r){let n=$(t);if(!n)throw new Error("Unsupported image format");await U();let o=lt(t),m=await Q(o);if(m)return{stickerId:m.id,isDuplicate:!0,existingSticker:m};let l=mt(t),p=v.default.randomUUID(),w=`${p}.${n}`;await st(t,p,n);let S=ct(w),d=await ut(S),I=await q({name:d.name,filename:w,format:n,file_hash:o,width:l?.width??null,height:l?.height??null,file_size:t.length,pack_id:i.packId??null,is_favorite:0,source:e,source_url:r??null})??p;return d.tags&&d.tags.length>0&&await et(I,d.tags),d.keywords&&d.keywords.length>0&&await it(I,d.keywords),{stickerId:I,isDuplicate:!1}}var c=require("react/jsx-runtime");function wt(){let{pop:t}=(0,a.useNavigation)(),[e,i]=(0,k.useState)([]),[r,n]=(0,k.useState)(!0),[o,m]=(0,k.useState)("clipboard"),[l,p]=(0,k.useState)(""),[w,S]=(0,k.useState)(!1),[d,O]=(0,k.useState)();(0,k.useEffect)(()=>{(async()=>{try{await U();let s=await tt();i(s)}catch(s){await(0,a.showToast)({style:a.Toast.Style.Failure,title:"Failed to load packs",message:String(s)})}finally{n(!1)}})()},[]);async function I(s){if(o==="url"&&!s.url?.trim()){O("URL is required");return}S(!0);try{let h=s.packId==="__new__"?null:s.packId??null;s.packId==="__new__"&&s.newPackName?.trim()&&(h=await Z(s.newPackName.trim(),s.newPackIcon?.trim()||null),await(0,a.showToast)({style:a.Toast.Style.Success,title:`Created pack "${s.newPackName.trim()}"`})),h===""&&(h=null);let N={packId:h},T;switch(await(0,a.showToast)({style:a.Toast.Style.Animated,title:"AI is analyzing sticker..."}),o){case"clipboard":T=await Et(N);break;case"url":T=await J(s.url,N);break;case"file":{if(!s.file||s.file.length===0)throw new Error("Please select a file");T=await kt(s.file[0],N);break}}if(!T)throw new Error("No import method selected");T.isDuplicate?await(0,a.showToast)({style:a.Toast.Style.Success,title:"Duplicate detected",message:`This sticker already exists as "${T.existingSticker?.name}"`}):await(0,a.showToast)({style:a.Toast.Style.Success,title:"Sticker added!",message:"Added to your vault"}),t()}catch(h){console.error("Import failed:",h);let N=h instanceof Error?h.message:String(h);await(0,a.showToast)({style:a.Toast.Style.Failure,title:"Import failed",message:N})}finally{S(!1)}}return(0,c.jsxs)(a.Form,{isLoading:r||w,navigationTitle:"Add Sticker",actions:(0,c.jsx)(a.ActionPanel,{children:(0,c.jsx)(a.Action.SubmitForm,{title:"Add Sticker",icon:a.Icon.Plus,onSubmit:I})}),children:[(0,c.jsxs)(a.Form.Dropdown,{id:"importMethod",title:"Import From",value:o,onChange:s=>m(s),children:[(0,c.jsx)(a.Form.Dropdown.Item,{value:"clipboard",title:"Clipboard",icon:a.Icon.Clipboard}),(0,c.jsx)(a.Form.Dropdown.Item,{value:"url",title:"Image URL",icon:a.Icon.Link}),(0,c.jsx)(a.Form.Dropdown.Item,{value:"file",title:"Local File",icon:a.Icon.Finder})]}),o==="clipboard"&&(0,c.jsx)(a.Form.Description,{title:"Source",text:"The image currently on your clipboard will be imported. Copy an image from the web, WhatsApp, or any app first."}),o==="url"&&(0,c.jsx)(a.Form.TextField,{id:"url",title:"Image URL",placeholder:"https://example.com/sticker.png",error:d,onChange:()=>O(void 0)}),o==="file"&&(0,c.jsx)(a.Form.FilePicker,{id:"file",title:"Select Image",allowMultipleSelection:!1,canChooseDirectories:!1,canChooseFiles:!0}),(0,c.jsx)(a.Form.Separator,{}),(0,c.jsxs)(a.Form.Dropdown,{id:"packId",title:"Pack (Optional)",value:l,onChange:p,children:[(0,c.jsx)(a.Form.Dropdown.Item,{value:"",title:"No Pack",icon:a.Icon.Minus}),e.map(s=>(0,c.jsx)(a.Form.Dropdown.Item,{value:s.id,title:`${s.icon?s.icon+" ":""}${s.name}`},s.id)),(0,c.jsx)(a.Form.Dropdown.Item,{value:"__new__",title:"Create New Pack...",icon:a.Icon.PlusCircle})]}),l==="__new__"&&(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(a.Form.TextField,{id:"newPackName",title:"New Pack Name",placeholder:"Reactions"}),(0,c.jsx)(a.Form.TextField,{id:"newPackIcon",title:"New Pack Icon",placeholder:"e.g. icon name or emoji"})]})]})}
