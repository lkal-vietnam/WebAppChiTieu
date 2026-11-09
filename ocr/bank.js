/* Đọc ảnh bill / biên lai chuyển khoản → giao dịch. Chạy hoàn toàn trên máy (Tesseract.js, không gửi ảnh đi đâu). */
(function(g){
const BASE=(()=>{try{return new URL('./',document.currentScript.src).href}catch(e){return ''}})();
const fold=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const ns=s=>fold(s).replace(/[^a-z0-9]/g,'');
const letters=s=>(String(s).match(/[A-Za-zÀ-ỹ]/g)||[]).length;
const toInt=s=>parseInt(String(s).replace(/\D/g,''),10)||0;
const title=s=>{s=String(s).trim();return s&&s===s.toUpperCase()?s.toLowerCase().replace(/(^|[\s\-/])(\S)/g,(m,a,b)=>a+b.toUpperCase()):s};
function parseDate(s){const m=String(s).match(/(\d{2})\/(\d{2})\/(20\d{2})/);if(!m)return'';const d=+m[1],mo=+m[2];return mo>=1&&mo<=12&&d>=1&&d<=31?`${m[3]}-${m[2]}-${m[1]}`:''}
function cleanName(l){
  let x=String(l).replace(/^[^A-Za-zÀ-ỹ0-9]+/,'').replace(/^[a-zà-ỹ]{1,3}\d?[.,]?\s+(?=[A-ZÀ-Ỵ0-9])/,'').replace(/^[A-Z]\d?\s+(?=[A-ZÀ-Ỵ]{2})/,'');
  x=x.replace(/[\s_—–\-~.|]+$/,'').replace(/\s+(\d{4,}|Z{2,}[a-z]*)$/,'').trim();
  return x}
const isName=l=>letters(l)>=3&&letters(l)>=String(l).replace(/\s/g,'').length*0.6;
const STOP=/^(chuyen nhanh \d|luu mau|chia se|gan the|luu nguoi|ma giao dich|cach thuc|danh muc|thuc hien lai|phi\b|dong\b|gui\b|chia se|xac nhan|tra soat|so du|thoi gian|chuyen luc|so tien|giao dich thanh cong)/;
const ALIAS=[[/wincommerce|winmart|\bwin\b/,'WinMart'],[/familymart/,'FamilyMart'],[/circle ?k/,'Circle K'],[/bach hoa xanh|bhx/,'Bách Hóa Xanh'],[/highlands?/,'Highlands Coffee'],[/vngames|vnggames|zion/,'VNG Games']];
function short(x){
  const f=fold(x);for(const [re,n] of ALIAS)if(re.test(f))return n;
  const t=String(x).replace(/\b(cong ty|cty|co phan|tnhh|joint stock company|company|limited|general commercial services|services|jsc|corp)\b/gi,' ').replace(/\s+/g,' ').trim();
  return title(t||x).split(' ').slice(0,5).join(' ').slice(0,40)}
function cleanContent(s){
  return String(s).replace(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10,}\b/g,' ').replace(/\d{2}:\d{2}:\d{2}/g,' ').replace(/-\d{6}-/g,' ').replace(/\s+/g,' ').replace(/^[\s\-]+|[\s\-]+$/g,'')}

/* ---- phân tích văn bản OCR ---- */
function parse(text){
  const L=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean),F=L.map(fold);
  // 1) dạng danh sách (lịch sử giao dịch): nhiều dòng "+/-số VND" có dấu
  const SIG=/([+\-−–])\s*(\d[\d.,]*)\s*vnd/;
  const signed=F.map((f,i)=>({i,m:f.match(SIG)})).filter(x=>x.m&&toInt(x.m[2])>=1000);
  if(signed.length>=2){
    const items=[];let date='';
    for(let i=0;i<L.length;i++){
      const d=/^\s*\d{2}\/\d{2}\/20\d{2}\s*$/.test(L[i])?parseDate(L[i]):'';
      if(d){date=d;continue}
      const s=signed.find(x=>x.i===i);if(!s)continue;
      const desc=[];
      for(let j=i+1;j<L.length&&desc.length<2;j++){
        if(signed.some(x=>x.i===j)||/^\s*\d{2}\/\d{2}\/20\d{2}\s*$/.test(L[j]))break;
        if(/\d{1,2}:\d{2}.*vnd/i.test(F[j]))break;
        desc.push(L[j]);
      }
      items.push({date,type:s.m[1]==='+'?'income':'expense',amount:toInt(s.m[2]),note:title(cleanContent(desc.join(' ')).replace(/\s*(IB CK|°+s?)$/i,'')).slice(0,60),raw:desc.join(' ')});
    }
    return {mode:'list',items};
  }
  // 2) dạng chi tiết một giao dịch
  const r={mode:'one',amount:0,type:'expense',date:'',note:'',payee:'',self:'',content:'',internal:false,warn:[]};
  let sign='';
  for(let i=0;i<F.length;i++){
    if(/so du/.test(F[i]))continue;
    const m=F[i].match(/([+\-−–])?\s*(\d[\d.,]*)\s*vnd/);
    if(m&&toInt(m[2])>=1000){r.amount=toInt(m[2]);sign=m[1]||'';break}
  }
  if(!r.amount)r.warn.push('Không đọc được số tiền');
  r.type=sign==='+'?'income':sign?'expense':(/nhan tien|tien vao|ghi co/.test(F.join(' '))?'income':'expense');
  for(const i of F.keys()){if(/thoi gian|chuyen luc|ngay giao dich/.test(F[i])){r.date=parseDate(L[i]);if(r.date)break}}
  if(!r.date)for(const l of L){r.date=parseDate(l);if(r.date)break}
  if(!r.date)r.warn.push('Không đọc được ngày');
  // tên người/nơi nhận
  const after=(re)=>{
    for(let i=0;i<F.length;i++){
      const m=F[i].match(re);if(!m)continue;
      const rawIn=L[i].slice(m[0].length).trim();let inline=cleanName(rawIn);
      if(isName(inline)){const n=L[i+1]&&L[i+1].match(/^[A-Z0-9]{3,}/);if(/[-–]\s*$/.test(rawIn)&&n)inline+='-'+n[0];return inline}
      for(let j=i+1;j<Math.min(L.length,i+4);j++){const c=cleanName(L[j]);if(isName(c)&&!/^(so du|thoi gian)/.test(F[j]))return c}
    }return''};
  const toName=after(/^(toi tai khoan|den)\b[:\s]*/),fromName=after(/^(tu tai khoan|tu)\b[:\s]*/),acct=after(/^tai khoan giao dich[:\s]*/);
  if(acct){r.self=acct;r.payee=r.type==='income'?fromName:toName}
  else{r.self=fromName;r.payee=r.type==='income'?fromName:toName}
  if(r.type==='income'&&!acct&&toName){r.self=toName;r.payee=fromName}
  if(!r.payee&&r.type==='expense'){
    const ai=F.findIndex(f=>!/so du/.test(f)&&/\d[\d.,]*\s*vnd/.test(f));
    if(ai>=0){const out=[];
      for(let j=ai+1;j<Math.min(L.length,ai+5)&&out.length<3;j++){
        const c=cleanName(L[j]);
        if(/bank|\.{3}|^\W*$/.test(F[j])||/\d{4,}/.test(L[j])||STOP.test(F[j])||/^(loi nhan|noi dung)/.test(F[j])){if(out.length)break;continue}
        if(ns(c)===ns(r.self)||/^(tu |toi |tai khoan|den\b)/.test(F[j-1]||'')){if(out.length)break;continue}
        if(isName(c)&&c===c.toUpperCase())out.push(c);else if(out.length)break;
      }
      r.payee=out.join(' ');if(r.payee&&!r.self)r.self='';}
  }
  // nội dung
  const ci=F.findIndex(f=>/^(noi dung|loi nhan)/.test(f));
  if(ci>=0){
    const parts=[];const first=L[ci].replace(/^[^:]*:\s*/,'');
    if(first!==L[ci]&&first&&!/^n[oô]i dung/i.test(first))parts.push(first);
    for(let j=ci+1;j<L.length&&parts.length<4;j++){if(STOP.test(F[j])||/\d{2}\/\d{2}\/20\d{2}/.test(L[j]))break;parts.push(L[j])}
    r.content=cleanContent(parts.join(' '));
  }
  r.internal=r.type==='expense'&&!!r.payee&&!!r.self&&ns(r.payee)===ns(r.self);
  if(r.internal){r.note='Chuyển giữa tài khoản của mình';r.warn.push('Có vẻ là chuyển giữa các tài khoản của chính bạn nên thường không tính là chi tiêu.')}
  else r.note=short(r.payee||r.content);
  r.hay=fold([r.payee,r.content].join(' '));
  return r;
}

/* ---- gợi ý danh mục theo từ khóa ---- */
const RULES=[
 ['expense',/familymart|circle ?k|winmart|wincommerce|bach hoa|coop|lotte ?mart|aeon|tap hoa|7.?eleven|ministop|siêu thị|sieu thi|big ?c|mart\b/,['Chợ & siêu thị']],
 ['expense',/\bpho\b|bun |com |cafe|ca phe|tra sua|quan |nha hang|restaurant|kfc|lotteria|highland|starbucks|phuc long|banh|pizza|an uong|bbq|lau\b|grabfood|shopeefood|beamin/,['Ăn uống']],
 ['expense',/grab|xanh sm|gojek|be group|taxi|xang|petrolimex|vetc|bai xe|gui xe|ve may bay|vietjet|bamboo/,['Đi lại']],
 ['expense',/evn|tien dien|tien nuoc|sawaco|dien luc|gas\b/,['Điện nước']],
 ['expense',/viettel|vinaphone|mobifone|vnpt|fpt|internet|data 4g|nap tien dien thoai/,['Internet & điện thoại']],
 ['expense',/apple\.com|google|netflix|spotify|youtube|steam|vnggames|zion|garena|game|cgv|galaxy cinema|phim/,['Giải trí']],
 ['expense',/nha thuoc|pharmacity|long chau|benh vien|phong kham|bao hiem/,['Sức khỏe']],
 ['expense',/hoc phi|truong|khoa hoc|sach|udemy/,['Giáo dục']],
 ['expense',/shopee|lazada|tiki|tiktok|uniqlo|zara|thegioididong|dien may|fptshop/,['Mua sắm']],
 ['expense',/mung cuoi|mung tuoi|li xi|qua tang|phung vien|dam cuoi/,['Hiếu hỉ & quà tặng']],
 ['income',/luong|ung luong|salary/,['Lương']],
 ['income',/thuong|bonus/,['Thưởng']],
 ['income',/lai suat|co tuc|tien lai/,['Lãi & đầu tư']],
];
function guessCat(hay,type,names){
  const h=fold(hay);
  for(const [t,re,c] of RULES){if(t===type&&re.test(h)){const hit=c.find(x=>names.includes(x));if(hit)return hit}}
  return'';
}

/* ---- đọc ảnh (OCR) ---- */
let worker=null,loading=null;
function loadScript(src){return new Promise((ok,no)=>{if(g.Tesseract)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Không tải được bộ đọc ảnh. Cần mạng ở lần dùng đầu tiên.'));document.head.appendChild(s)})}
async function getWorker(st){
  if(worker)return worker;
  if(loading)return loading;
  loading=(async()=>{
    st('Đang tải bộ đọc ảnh (lần đầu, khoảng 6MB)…');
    await loadScript(BASE+'tesseract.min.js');
    const w=await g.Tesseract.createWorker('vie',1,{workerPath:BASE+'worker.min.js',corePath:BASE,langPath:BASE,gzip:true,workerBlobURL:false,
      logger:m=>{if(m.status==='recognizing text')st('Đang đọc ảnh… '+Math.round((m.progress||0)*100)+'%')}});
    worker=w;return w})();
  try{return await loading}finally{loading=null}
}
async function prep(file,mode){
  const bmp=await createImageBitmap(file);
  const sc=Math.min(2,Math.max(1,1400/bmp.width)),W=Math.round(bmp.width*sc),H=Math.round(bmp.height*sc);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d',{willReadFrequently:true});
  cx.drawImage(bmp,0,0,W,H);if(bmp.close)bmp.close();
  if(mode==='gray'){
    const im=cx.getImageData(0,0,W,H),d=im.data;let lo=255,hi=0;
    for(let i=0;i<d.length;i+=4){const y=d[i]*.299+d[i+1]*.587+d[i+2]*.114;d[i]=y;if(y<lo)lo=y;if(y>hi)hi=y}
    const k=hi>lo?255/(hi-lo):1;
    for(let i=0;i<d.length;i+=4){let y=(d[i]-lo)*k;y=y<150?y*.55:Math.min(255,y*1.25);d[i]=d[i+1]=d[i+2]=y}
    cx.putImageData(im,0,0);
  }
  return cv;
}
async function read(file,st=()=>{},mode='gray'){
  const w=await getWorker(st);st('Đang đọc ảnh…');
  const cv=await prep(file,mode);
  const r=await w.recognize(cv);return r.data.text;
}
function stop(){if(worker){worker.terminate();worker=null}}
g.BankOCR={parse,guessCat,read,stop,fold};
if(typeof module!=='undefined')module.exports=g.BankOCR;
})(typeof window!=='undefined'?window:globalThis);
