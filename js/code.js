// ─────────────────────────────────────────────────────────
//  Pentadeck  |  js/code.js
//  ⚠  DEV_MODE = false before uploading
// ─────────────────────────────────────────────────────────

const DEV_MODE  = false;
const urlBase   = 'https://kylelampstack.xyz/LAMPAPI';
const extension = 'php';

let userId = 0, firstName = '', lastName = '';

/* ══════════════════════════════════════════════════════
   SHAPES  (26 solid shapes — text fits in all of them)
══════════════════════════════════════════════════════ */
window.XV_SHAPES = [
  // Regular polygons — text fits comfortably
  'circle','triangle','square','pentagon','hexagon','octagon','decagon','diamond',
  // Stars — always a good amount of "area" at centre for text
  'star3','star4','star5','star6','star8',
  // Directional (arrow only — wide enough at head)
  'arrow','kite','cross',
  // Quadrilaterals — wide and roomy
  'trapezoid','parallelogram','shield','house',
  // Organic — large centre mass
  'teardrop','leaf','egg','fan','tag',
];

window.XV_hash = function (str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
};
window.XV_shapeOf = function (c) {
  return XV_SHAPES[XV_hash(c.firstName + c.lastName) % XV_SHAPES.length];
};
/* Golden-angle hue distribution — much less chance of two contacts
   getting the same colour even with many contacts */
window.XV_hueOf = function (c) {
  const h = XV_hash(c.email + c.phone + c.lastName + (c.firstName[0]||''));
  return Math.floor((h * 137) % 360);
};

/* ── SVG helpers ──────────────────────────────────────── */
function _pts(n,cx,cy,r){
  const p=[];
  for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.PI*2/n)*i;p.push(`${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`);}
  return p.join(' ');
}
function _star(n,cx,cy,ro,ri){
  const p=[];
  for(let i=0;i<n*2;i++){const a=-Math.PI/2+(Math.PI/n)*i,r=i%2===0?ro:ri;p.push(`${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`);}
  return p.join(' ');
}
function _svgEl(t){
  switch(t){
    case 'circle':        return `<circle cx="50" cy="50" r="42"/>`;
    case 'triangle':      return `<polygon points="${_pts(3,50,54,40)}"/>`;
    case 'square':        return `<rect x="9" y="9" width="82" height="82" rx="4"/>`;
    case 'pentagon':      return `<polygon points="${_pts(5,50,50,42)}"/>`;
    case 'hexagon':       return `<polygon points="${_pts(6,50,50,42)}"/>`;
    case 'octagon':       return `<polygon points="${_pts(8,50,50,42)}"/>`;
    case 'decagon':       return `<polygon points="${_pts(10,50,50,42)}"/>`;
    case 'diamond':       return `<polygon points="50,7 93,50 50,93 7,50"/>`;
    case 'star3':         return `<polygon points="${_star(3,50,50,44,18)}"/>`;
    case 'star4':         return `<polygon points="${_star(4,50,50,42,17)}"/>`;
    case 'star5':         return `<polygon points="${_star(5,50,50,42,17)}"/>`;
    case 'star6':         return `<polygon points="${_star(6,50,50,42,21)}"/>`;
    case 'star8':         return `<polygon points="${_star(8,50,50,42,22)}"/>`;
    case 'arrow':         return `<path d="M50,8 L88,52 L66,52 L66,90 L34,90 L34,52 L12,52 Z"/>`;
    case 'kite':          return `<polygon points="50,5 90,60 50,94 10,60"/>`;
    case 'cross':         return `<path d="M35,10 H65 V35 H90 V65 H65 V90 H35 V65 H10 V35 H35 Z"/>`;
    case 'trapezoid':     return `<polygon points="20,78 80,78 65,22 35,22"/>`;
    case 'parallelogram': return `<polygon points="22,80 88,80 78,20 12,20"/>`;
    case 'shield':        return `<path d="M50,5 L88,22 L88,58 L50,95 L12,58 L12,22 Z"/>`;
    case 'house':         return `<path d="M50,8 L92,44 L92,90 L8,90 L8,44 Z"/>`;
    case 'teardrop':      return `<path d="M50,90 C18,90 8,68 8,50 A42,42 0 0 1 92,50 C92,68 82,90 50,90 Z"/>`;
    case 'leaf':          return `<path d="M50,8 Q92,50 50,92 Q8,50 50,8 Z"/>`;
    case 'egg':           return `<ellipse cx="50" cy="54" rx="36" ry="43"/>`;
    case 'fan':           return `<path d="M50,66 L9,73 A42,42 0 1 0 91,73 Z"/>`;
    case 'tag':           return `<path d="M10,20 L74,20 L90,50 L74,80 L10,80 Z"/>`;
    default:              return `<circle cx="50" cy="50" r="42"/>`;
  }
}

window.XV_avatar = function(contact, size){
  const s=XV_shapeOf(contact), hue=XV_hueOf(contact);
  const init=((contact.firstName[0]||'')+(contact.lastName[0]||'')).toUpperCase();
  const fill=`hsla(${hue},68%,52%,.24)`, str=`hsl(${hue},80%,65%)`, tc=`hsl(${hue},85%,78%)`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="${fill}" stroke="${str}" stroke-width="3.5" stroke-linejoin="round">${_svgEl(s)}</g>
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
      font-family="Syne,sans-serif" font-weight="700" font-size="28" fill="${tc}">${init}</text>
  </svg>`;
};

/* ══════════════════════════════════════════════════════
   DEV MODE — 15 contacts (enough to fill filter zone)
══════════════════════════════════════════════════════ */
const DEMO = [
  {id:1,  firstName:'Alice',   lastName:'Foster',  phone:'555-0101', email:'alice@demo.com'  },
  {id:2,  firstName:'Marcus',  lastName:'Bell',    phone:'555-0102', email:'marcus@demo.com' },
  {id:3,  firstName:'Jordan',  lastName:'Park',    phone:'555-0103', email:'jordan@demo.com' },
  {id:4,  firstName:'Sofia',   lastName:'Chen',    phone:'555-0104', email:'sofia@demo.com'  },
  {id:5,  firstName:'Eli',     lastName:'Torres',  phone:'555-0105', email:'eli@demo.com'    },
  {id:6,  firstName:'Nadia',   lastName:'Okafor',  phone:'555-0106', email:'nadia@demo.com'  },
  {id:7,  firstName:'Ryan',    lastName:'Holt',    phone:'555-0107', email:'ryan@demo.com'   },
  {id:8,  firstName:'Priya',   lastName:'Sharma',  phone:'555-0108', email:'priya@demo.com'  },
  {id:9,  firstName:'Zach',    lastName:'Monroe',  phone:'555-0109', email:'zach@demo.com'   },
  {id:10, firstName:'Luna',    lastName:'Vega',    phone:'555-0110', email:'luna@demo.com'   },
  {id:11, firstName:'Owen',    lastName:'Blake',   phone:'555-0111', email:'owen@demo.com'   },
  {id:12, firstName:'Camille', lastName:'Dubois',  phone:'555-0112', email:'camille@demo.com'},
  {id:13, firstName:'Isaac',   lastName:'Adeyemi', phone:'555-0113', email:'isaac@demo.com'  },
  {id:14, firstName:'Vera',    lastName:'Novak',   phone:'555-0114', email:'vera@demo.com'   },
  {id:15, firstName:'Dante',   lastName:'Cruz',    phone:'555-0115', email:'dante@demo.com'  },
];

/* ══════════════════════════════════════════════════════
   PROGRESSIVE ADD-CONTACT FORM
══════════════════════════════════════════════════════ */
function onAddInput(field) {
  const fn = document.getElementById('addFirstName').value.trim();
  const ln = document.getElementById('addLastName')  ? document.getElementById('addLastName').value.trim()  : '';
  const ph = document.getElementById('addPhone')     ? document.getElementById('addPhone').value.trim()     : '';

  /* Cascade-clear downstream fields when upstream is erased */
  if (field === 'fn' && !fn) {
    const el = document.getElementById('addLastName');
    if (el) el.value = '';
    const ep = document.getElementById('addPhone');
    if (ep) ep.value = '';
    const em = document.getElementById('addEmail');
    if (em) em.value = '';
  } else if (field === 'ln' && !ln) {
    const ep = document.getElementById('addPhone');
    if (ep) ep.value = '';
    const em = document.getElementById('addEmail');
    if (em) em.value = '';
  } else if (field === 'ph' && !ph) {
    const em = document.getElementById('addEmail');
    if (em) em.value = '';
  }

  updateAddForm();
}

function updateAddForm() {
  const fn = document.getElementById('addFirstName').value.trim();
  const lnEl = document.getElementById('addLastName');
  const phEl = document.getElementById('addPhone');
  const emEl = document.getElementById('addEmail');
  const ln = lnEl ? lnEl.value.trim() : '';
  const ph = phEl ? phEl.value.trim() : '';
  const em = emEl ? emEl.value.trim() : '';

  /* Progressive field visibility */
  const show = (wrapId, visible) => {
    const el = document.getElementById(wrapId);
    if (!el) return;
    if (visible) { el.style.display = ''; el.style.animation = 'fadeIn .18s ease'; }
    else           el.style.display = 'none';
  };
  show('addLastNameWrap', !!fn);
  show('addPhoneWrap',    !!(fn && ln));
  show('addEmailWrap',    !!(fn && ln && ph));

  /* Gray out Add button until all filled */
  const btn = document.getElementById('addBtn');
  if (btn) btn.disabled = !(fn && ln && ph && em);
}

/* ══════════════════════════════════════════════════════
   MEMBER CARD AVATAR  (generates shape SVG from name)
══════════════════════════════════════════════════════ */
window.memberAvatar = function(firstName, lastName, size) {
  /* Fake a contact object to reuse XV_avatar */
  return XV_avatar({ firstName, lastName, phone: '', email: '' }, size);
};

/* ══════════════════════════════════════════════════════
   COLLAPSIBLE SECTIONS
══════════════════════════════════════════════════════ */
function toggleSection(headEl) {
  headEl.classList.toggle('collapsed');
  const collapsed = headEl.classList.contains('collapsed');
  headEl.setAttribute('aria-expanded', String(!collapsed));
  const content = headEl.nextElementSibling;
  if (content) content.classList.toggle('sb-collapsed');
}
/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function switchTab(tab) {
  document.getElementById('loginPanel').classList.toggle('hidden', tab!=='login');
  document.getElementById('regPanel').classList.toggle('hidden',   tab!=='reg');
  document.getElementById('tabLogin').classList.toggle('active',   tab==='login');
  document.getElementById('tabReg').classList.toggle('active',     tab==='reg');
  document.getElementById('loginResult').innerHTML = '';
  document.getElementById('regResult').innerHTML   = '';
}

function doLogin() {
  userId=0; firstName=''; lastName='';
  const login=document.getElementById('loginName').value.trim();
  const pw=document.getElementById('loginPassword').value;
  const out=document.getElementById('loginResult');
  out.className='er'; out.innerHTML='';
  if(!login||!pw){out.innerHTML='Enter username and password.';return;}
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/Login.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{
    xhr.onreadystatechange=function(){
      if(this.readyState!==4) return;
      if(this.status===0){out.innerHTML='Could not reach the server. Check your connection.';return;}
      if(this.status!==200){out.innerHTML='Server error ('+this.status+'). Please try again.';return;}
      let obj;
      try{obj=JSON.parse(xhr.responseText);}catch(e){out.innerHTML='Unexpected server response.';return;}
      userId=obj.id;
      if(userId<1){out.innerHTML=obj.error||'Incorrect username or password.';return;}
      firstName=obj.firstName;lastName=obj.lastName;saveCookie();
      window.location.href='contacts.html';
    };
    xhr.send(JSON.stringify({login,password:pw}));
  }catch(e){out.innerHTML='Error: '+e.message;}
}
/* ── Password validation helpers ──────────────────────────── */
function validatePassword(pw) {
  const errs = [];
  if (pw.length < 8 || pw.length > 32) errs.push('8 to 32 characters');
  if (!/[a-zA-Z]/.test(pw))            errs.push('at least one letter');
  if (!/[0-9]/.test(pw))               errs.push('at least one number');
  if (!/[^a-zA-Z0-9]/.test(pw))        errs.push('at least one special character');
  return { valid: errs.length === 0, errors: errs };
}
function checkPwStrength() {
  const pw    = document.getElementById('regPassword').value;
  const rules = document.getElementById('pwRules');
  if (!rules) return;
  rules.classList.toggle('visible', pw.length > 0);
  _setRule('ruleLen',    pw.length >= 8 && pw.length <= 32);
  _setRule('ruleLetter', /[a-zA-Z]/.test(pw));
  _setRule('ruleNumber', /[0-9]/.test(pw));
  _setRule('ruleSpecial',/[^a-zA-Z0-9]/.test(pw));
}
function _setRule(id, met) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('met', met);
  el.classList.toggle('fail', !met);
}

function doRegister() {
  const fn=document.getElementById('regFirstName').value.trim();
  const ln=document.getElementById('regLastName').value.trim();
  const log=document.getElementById('regLogin').value.trim();
  const pw=document.getElementById('regPassword').value;
  const out=document.getElementById('regResult');
  out.className='er'; out.innerHTML='';
  if(!fn||!ln||!log||!pw){out.innerHTML='All fields required.';return;}
  const check = validatePassword(pw);
  if (!check.valid) {
    out.innerHTML = 'Password needs: ' + check.errors.join(', ') + '.';
    return;
  }
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/Register.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){const obj=JSON.parse(xhr.responseText);if(obj.error&&obj.error.length>0){out.innerHTML=obj.error;return;}out.className='ok';out.innerHTML='Account created. Sign in now.';setTimeout(()=>switchTab('login'),1500);}};xhr.send(JSON.stringify({firstName:fn,lastName:ln,login:log,password:pw}));}catch(e){out.innerHTML=e.message;}
}

/* ══════════════════════════════════════════════════════
   COOKIE
══════════════════════════════════════════════════════ */
function saveCookie() {
  const exp=new Date(Date.now()+20*60*1000).toGMTString();
  document.cookie=`firstName=${firstName},lastName=${lastName},userId=${userId};expires=${exp}`;
}
function readCookie() {
  if(DEV_MODE){userId=1;firstName='Preview';lastName='User';const el=document.getElementById('userName');if(el)el.innerHTML='<strong>Preview User</strong>';return;}
  userId=-1;
  document.cookie.split(',').forEach(p=>{const[k,v]=p.trim().split('=');if(k==='firstName')firstName=v;else if(k==='lastName')lastName=v;else if(k==='userId')userId=parseInt(v);});
  if(userId<0){window.location.href='index.html';return;}
  const el=document.getElementById('userName');if(el)el.innerHTML=`<strong>${firstName} ${lastName}</strong>`;
}
function doLogout() {
  userId=0;firstName='';lastName='';
  document.cookie='firstName= ;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href='index.html';
}

/* ══════════════════════════════════════════════════════
   CONTACTS — DIRECTORY
   When window.XV_zoneContacts is non-empty, show those.
   Otherwise do normal search.
══════════════════════════════════════════════════════ */
function esc(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');}

function renderContacts(list, el) {
  if(!el) return;
  if(!list||list.length===0){el.innerHTML='<div class="empty">No contacts found.</div>';return;}
  let html='';
  list.forEach((c,i)=>{
    const av=XV_avatar(c,32);
    html+=`
    <div class="c-row" style="animation-delay:${i*32}ms">
      <div class="c-av">${av}</div>
      <div class="c-info">
        <div class="c-name">${c.firstName} ${c.lastName}</div>
        <div class="c-meta">${c.phone} · ${c.email}</div>
      </div>
      <div class="c-act">
        <button class="btn btn-xs btn-xs-y" aria-label="Edit contact" onclick="showEdit(${c.id},'${esc(c.firstName)}','${esc(c.lastName)}','${esc(c.phone)}','${esc(c.email)}')">Edit</button>
        <button class="btn btn-xs btn-xs-r" aria-label="Delete ${c.firstName} ${c.lastName}" onclick="doDelete(${c.id})">✕</button>
      </div>
    </div>`;
  });
  el.innerHTML=html;
}

function doSearch() {
  readCookie();
  const el=document.getElementById('searchResults');

  /* If zone has contacts, show those instead of search results */
  if(window.XV_zoneContacts && window.XV_zoneContacts.length>0){
    renderContacts(window.XV_zoneContacts, el);
    /* Update directory header hint */
    const hint=document.getElementById('dirHint');
    if(hint){hint.textContent=`${window.XV_zoneContacts.length} shape${window.XV_zoneContacts.length>1?'s':''} in filter zone`;hint.style.color='var(--y)';}
    return;
  }

  /* Normal search */
  const hint=document.getElementById('dirHint');
  if(hint){hint.textContent='drag shapes to zone ↓';hint.style.color='';}

  const q=(document.getElementById('searchName')||{}).value||'';
  if(DEV_MODE){renderContacts(DEMO.filter(c=>c.firstName.toLowerCase().includes(q.toLowerCase())),el);return;}
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/SearchContacts.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){renderContacts((JSON.parse(xhr.responseText).results||[]),el);}};xhr.send(JSON.stringify({search:q,userId}));}
  catch(e){if(el)el.innerHTML=`<div class="empty er">${e.message}</div>`;}
}

function loadPhysics() {
  if(!window.PhysicsLayer) return;
  if(DEV_MODE){PhysicsLayer.syncContacts(DEMO);return;}
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/SearchContacts.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){const obj=JSON.parse(xhr.responseText);if(obj.results)PhysicsLayer.syncContacts(obj.results);}};xhr.send(JSON.stringify({search:'',userId}));}
  catch(e){console.warn('Physics load:',e);}
}

/* ══════════════════════════════════════════════════════
   EDIT / ADD / DELETE
══════════════════════════════════════════════════════ */
let currentId=0;
function showEdit(id,fn,ln,phone,email){
  currentId=id;
  document.getElementById('editFirstName').value=fn;
  document.getElementById('editLastName').value=ln;
  document.getElementById('editPhone').value=phone;
  document.getElementById('editEmail').value=email;
  document.getElementById('editResult').innerHTML='';
  document.getElementById('editDiv').style.display='flex';
}
function cancelEdit(){document.getElementById('editDiv').style.display='none';}
function doUpdate(){
  readCookie();
  const payload={contactId:currentId,userId,firstName:document.getElementById('editFirstName').value.trim(),lastName:document.getElementById('editLastName').value.trim(),phone:document.getElementById('editPhone').value.trim(),email:document.getElementById('editEmail').value.trim()};
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/UpdateContact.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){const obj=JSON.parse(xhr.responseText);const el=document.getElementById('editResult');if(obj.error&&obj.error.length>0){el.className='er';el.innerHTML=obj.error;}else{el.className='ok';el.innerHTML='Saved.';setTimeout(()=>{cancelEdit();doSearch();loadPhysics();},700);}}}; xhr.send(JSON.stringify(payload));}catch(e){document.getElementById('editResult').innerHTML=e.message;}
}
function doAddContact(){
  readCookie();
  const fn=document.getElementById('addFirstName').value.trim();
  const ln=document.getElementById('addLastName').value.trim();
  const phone=document.getElementById('addPhone').value.trim();
  const email=document.getElementById('addEmail').value.trim();
  const out=document.getElementById('addResult');
  out.className='er';out.innerHTML='';
  if(!fn||!ln||!phone||!email){out.innerHTML='All fields required.';return;}
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/AddContact.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){const obj=JSON.parse(xhr.responseText);if(obj.error&&obj.error.length>0){out.innerHTML=obj.error;return;}out.className='ok';out.innerHTML='Contact added.';['addFirstName','addLastName','addPhone','addEmail'].forEach(id=>document.getElementById(id).value='');doSearch();loadPhysics();}};xhr.send(JSON.stringify({firstName:fn,lastName:ln,phone,email,userId}));}catch(e){out.innerHTML=e.message;}
}
function doDelete(contactId){
  readCookie();
  if(!confirm('Delete this contact?'))return;
  const xhr=new XMLHttpRequest();
  xhr.open('POST',urlBase+'/DeleteContact.'+extension,true);
  xhr.setRequestHeader('Content-type','application/json; charset=UTF-8');
  try{xhr.onreadystatechange=function(){if(this.readyState===4&&this.status===200){doSearch();loadPhysics();}};xhr.send(JSON.stringify({id:contactId}));}catch(e){console.error(e);}
}
