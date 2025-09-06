/* =========================
   عناصر أساسية
   ========================= */
const qaCard        = document.getElementById('qaCard');         // صندوق الأسئلة
const questionsEl   = document.getElementById('questions');      // الحاوية التي نحقن فيها الأسئلة
const requiredEl    = document.getElementById('summary');        // المربع الأصفر (المطلوب)
const miniSummaryEl = document.getElementById('miniSummary');    // المربع الأزرق (الخلاصة)

/* عناصر Drafts (قد لا تكون موجودة في الـHTML — لذلك كل الاستخدامات محمية) */
const draftsSidebar = document.getElementById('draftsSidebar');
const draftsToggle  = document.getElementById('draftsToggle');
const draftsSearch  = document.getElementById('draftsSearch');
const draftsListEl  = document.getElementById('draftsList');

/* أزرار الخلاصة */
const btnCopy = document.getElementById('copyMiniBtn');
const btnSave = document.getElementById('saveDraftBtn');
const btnEnd  = document.getElementById('endBtn');

/* مفاتيح التخزين */
const DRAFTS_KEY = 'seoudi_drafts_v1';

/* =========================
   بيانات العميل لعرضها في الخلاصة
   ========================= */
const FIELDS = {
  custNumber:   () => document.getElementById('custNumber')?.value?.trim() || '',
  orderNumber:  () => document.getElementById('orderNumber')?.value?.trim() || '',
  orderCreated: () => document.getElementById('orderCreated')?.value?.trim() || '',
  receiptNumber:() => document.getElementById('receiptNumber')?.value?.trim() || '',
  productName:  () => document.getElementById('productName')?.value?.trim() || '',
};

/* ======= Validation Config + helpers ======= */
const REQUIRED_FIELDS_MODE = 'all'; // 'orderCreated' | 'all'

const FIELD_MAP = {
  custNumber:   { id:'custNumber',   label:'Customer Number' },
  orderNumber:  { id:'orderNumber',  label:'Order Number' },
  orderCreated: { id:'orderCreated', label:'Order Created from FL' },
  receiptNumber:{ id:'receiptNumber',label:'Receipt Number' },
  productName:  { id:'productName',  label:'Product' }
};

function getMissingFields(mode){
  const keys = (mode==='all') ? Object.keys(FIELD_MAP) : ['orderCreated'];
  const missing = []; const missingKeys=[];
  keys.forEach(k=>{
    const el = document.getElementById(FIELD_MAP[k].id);
    const val = el?.value?.trim();
    if(!val){ missing.push(FIELD_MAP[k].label); missingKeys.push(k); }
  });
  return {missing, missingKeys};
}

function markInvalidFields(keys, on=true){
  keys.forEach(k=>{
    const el = document.getElementById(FIELD_MAP[k].id);
    if(!el) return;
    el.classList.toggle('invalid', on);
  });
}
function markInvalidEl(el, on=true){ if(el) el.classList.toggle('invalid', on); }

/* ======= Toast ======= */
let toastTimer=null;
function showToast(msg, type='error'){
  if(toastTimer){ clearTimeout(toastTimer); toastTimer=null; }
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type==='error'?'toast-error':'toast-success'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  toastTimer = setTimeout(()=>{ t.remove(); }, 3200);
}

/* ======= Utilities ======= */
function show(el, on) { if(!el) return; el.style.display = on ? '' : 'none'; }
function clear(el) { if(!el) return; el.innerHTML = ''; }
function esc(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function addResult(text) {
  show(qaCard, true);
  show(document.getElementById('summaryCard'), true);
  const d = document.createElement('div');
  d.className = 'result';
  d.textContent = text;
  requiredEl.appendChild(d);
  renderMiniSummary();
}
function resetRequired() { clear(requiredEl); renderMiniSummary(); }
function pruneNextSiblings(node, className) {
  let n = node?.nextElementSibling;
  while (n) { const nxt = n.nextElementSibling; if (!className || n.classList?.contains(className)) n.remove(); n = nxt; }
}
function radioQuestion({title, name, options}) {
  const wrap = document.createElement('div');
  wrap.className = 'q-block';
  wrap.innerHTML = `
    <div class="q-title">${title}</div>
    <div class="inline-options">
      ${options.map(o=>`<label><input type="radio" name="${name}" value="${o.value}"> ${o.label}</label>`).join('')}
    </div>`;
  return wrap;
}
function inputQuestion({title, name, placeholder}){
  const wrap = document.createElement('div');
  wrap.className='q-block';
  wrap.innerHTML = `
    <div class="q-title">${title}</div>
    <input type="text" name="${name}" id="${name}" placeholder="${placeholder||''}" />
    <p class="hint mt8">هذا الحقل مطلوب.</p>
  `;
  return wrap;
}
const wipe = (obj, keys)=> keys.forEach(k=> obj[k]=null);

/* ======= Build copy text ======= */
function buildCopyText(){
  const SEP = '----------------------------------------';
  const data = [
    ['Customer Number', FIELDS.custNumber()],
    ['Order Number', FIELDS.orderNumber()],
    ['Order Created from FL', FIELDS.orderCreated()],
    ['Receipt Number', FIELDS.receiptNumber()],
    ['Product', FIELDS.productName()],
  ].filter(([k,v])=>!!v);

  const steps = [];
  if(state.type==='pq'){
    steps.push('نوع الشكوى: جودة منتج');
    if(state.pq.caseLabel) steps.push(`الحالة: ${state.pq.caseLabel}`);
    if(state.pq.client)     steps.push(`نوع العميل: ${state.pq.client}`);
    if(state.pq.pay)        steps.push(`طريقة الدفع: ${state.pq.pay}`);
    if(state.pq.product)    steps.push(`نوع المنتج: ${state.pq.product}`);
    if(state.pq.withClient) steps.push(`المنتج مع العميل؟ → ${state.pq.withClient}`);
    if(state.pq.rr)         steps.push(`اختيار العميل: ${state.pq.rr}`);
  }else if(state.type==='missing'){
    steps.push('نوع الشكوى: عناصر مفقودة');
    if(state.mi.client) steps.push(`نوع العميل: ${state.mi.client}`);
    if(state.mi.inv)    steps.push(`هل متحاسب في الفاتورة؟ → ${state.mi.inv}`);
    if(state.mi.pay)    steps.push(`طريقة الدفع: ${state.mi.pay}`);
    if(state.mi.fish)   steps.push(`نوع المنتج: ${state.mi.fish}`);
    if(state.mi.source) steps.push(`مصدر الطلب: ${state.mi.source}`);
    if(state.mi.abd)    steps.push(`مراجعة الماجينتو/ABD → ${state.mi.abd}`);
  }else if(state.type==='wt'){
    steps.push('نوع الشكوى: خطأ فردي');
    if(state.wt.scenario) steps.push(`اختر الحالة: ${state.wt.scenario}`);
    if(state.wt.client)   steps.push(`نوع العميل: ${state.wt.client}`);
    if(state.wt.pay)      steps.push(`طريقة الدفع: ${state.wt.pay}`);
    if(state.wt.kind)     steps.push(`هل منتج: ${state.wt.kind}`);
    if(state.wt.invoiced) steps.push(`هل تمت المحاسبة كاملة؟ → ${state.wt.invoiced}`);
    if(state.wt.abd)      steps.push(`مراجعة الماجينتو/ABD → ${state.wt.abd}`);
    if(state.wt.rr)       steps.push(`اختيار العميل: ${state.wt.rr}`);
  }else if(state.type==='delay'){
    steps.push('نوع الشكوى: تأخير توصيل');
    if(state.delay.interval) steps.push(`Time Interval: ${state.delay.interval}`);
  }

  const reqs = [...(requiredEl?.querySelectorAll('.result')||[])].map(el=>el.textContent.trim()).filter(Boolean);

  const lines = [];
  lines.push('الخلاصة');

  if(data.length){
    lines.push('');
    lines.push('بيانات الشكوى:');
    data.forEach(([k,v])=> lines.push(`${k}: ${v}`));
  }
  if(steps.length){
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('خطوات التتبّع:');
    steps.forEach(s=> lines.push(s));
  }
  if(reqs.length){
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('المطلوب:');
    reqs.forEach(r=> lines.push(r));
  }
  return lines.join('\n');
}

/* =========================
   الحالة العامة (State)
   ========================= */
const state = {
  type: null,
  pq: { caseId:null,caseLabel:null,client:null,pay:null,product:null,withClient:null,rr:null },
  mi: { client:null,pay:null,fish:null,inv:null,abd:null, source:null },
  wt: { scenario:null,client:null,pay:null,kind:null,invoiced:null,abd:null,rr:null },
  delay: { interval:null }
};
function resetStatePart(key){
  if(key==='pq') state.pq = {caseId:null,caseLabel:null,client:null,pay:null,product:null,withClient:null,rr:null};
  if(key==='mi') state.mi = {client:null,pay:null,fish:null,inv:null,abd:null, source:null};
  if(key==='wt') state.wt = {scenario:null,client:null,pay:null,kind:null,invoiced:null,abd:null,rr:null};
  if(key==='delay') state.delay = {interval:null};
}

/* =========================
   بناء "الخلاصة" (الأزرق)
   ========================= */
function renderMiniSummary(){
  if(!miniSummaryEl) return;
  let html = '<div class="mini-title">الخلاصة</div>';

  const data = [
    ['Customer Number', FIELDS.custNumber()],
    ['Order Number', FIELDS.orderNumber()],
    ['Order Created from FL', FIELDS.orderCreated()],
    ['Receipt Number', FIELDS.receiptNumber()],
    ['Product', FIELDS.productName()],
  ].filter(([k,v])=>!!v);
  if(data.length){
    html += '<div class="mini-section is-data"><strong>بيانات الشكوى:</strong><ul>';
    data.forEach(([k,v])=> html += `<li>${k}: ${esc(v)}</li>`); html += '</ul></div>';
  }

  const steps = [];
  if(state.type==='pq'){
    steps.push('نوع الشكوى: جودة منتج');
    if(state.pq.caseLabel) steps.push(`الحالة: ${state.pq.caseLabel}`);
    if(state.pq.client)     steps.push(`نوع العميل: ${state.pq.client}`);
    if(state.pq.pay)        steps.push(`طريقة الدفع: ${state.pq.pay}`);
    if(state.pq.product)    steps.push(`نوع المنتج: ${state.pq.product}`);
    if(state.pq.withClient) steps.push(`المنتج مع العميل؟ → ${state.pq.withClient}`);
    if(state.pq.rr)         steps.push(`اختيار العميل: ${state.pq.rr}`);
  }else if(state.type==='missing'){
    steps.push('نوع الشكوى: عناصر مفقودة');
    if(state.mi.client) steps.push(`نوع العميل: ${state.mi.client}`);
    if(state.mi.inv)    steps.push(`هل متحاسب في الفاتورة؟ → ${state.mi.inv}`);
    if(state.mi.pay)    steps.push(`طريقة الدفع: ${state.mi.pay}`);
    if(state.mi.fish)   steps.push(`نوع المنتج: ${state.mi.fish}`);
    if(state.mi.source) steps.push(`مصدر الطلب: ${state.mi.source}`);
    if(state.mi.abd)    steps.push(`مراجعة الماجينتو/ABD → ${state.mi.abd}`);
  }else if(state.type==='wt'){
    steps.push('نوع الشكوى: خطأ فردي');
    if(state.wt.scenario) steps.push(`اختر الحالة: ${state.wt.scenario}`);
    if(state.wt.client)   steps.push(`نوع العميل: ${state.wt.client}`);
    if(state.wt.pay)      steps.push(`طريقة الدفع: ${state.wt.pay}`);
    if(state.wt.kind)     steps.push(`هل منتج: ${state.wt.kind}`);
    if(state.wt.invoiced) steps.push(`هل تمت المحاسبة كاملة؟ → ${state.wt.invoiced}`);
    if(state.wt.abd)      steps.push(`مراجعة الماجينتو/ABD → ${state.wt.abd}`);
    if(state.wt.rr)       steps.push(`اختيار العميل: ${state.wt.rr}`);
  }else if(state.type==='delay'){
    steps.push('نوع الشكوى: تأخير توصيل');
    if(state.delay.interval) steps.push(`Time Interval: ${state.delay.interval}`);
  }

  if(steps.length){
    html += '<div class="mini-section is-steps"><strong>خطوات التتبّع:</strong><ul>';
    steps.forEach(s=> html += `<li>${esc(s)}</li>`); html += '</ul></div>';
  }

  const reqs = [...(requiredEl?.querySelectorAll('.result')||[])].map(el=>el.textContent.trim()).filter(Boolean);
  if(reqs.length){
    html += '<div class="mini-section is-req"><strong>المطلوب:</strong><ul>';
    reqs.forEach(r=> html += `<li>${esc(r)}</li>`); html += '</ul></div>';
  }
  miniSummaryEl.innerHTML = html;
}

/* =========================
   جودة المنتج (Product Quality)
   ========================= */
const PQ_CASES = [
  {id:'appliances', label:'أجهزة منزلية',  type:'instant', sub:'أجهزة منزلية'},
  {id:'hotfood',    label:'هوت فوود',      type:'instant', sub:'HotFood - Product Quality'},
  {id:'taswiya',    label:'تسوية',         type:'taswiya', sub:'تسوية'},
  {id:'fat',        label:'دهون زائدة',    type:'flow',    sub:'دهون زائدة'},
  {id:'taste',      label:'رائحة و طعم و لون', type:'flow', sub:'رائحة و طعم و لون'},
  {id:'melted',     label:'سايح',          type:'flow',    sub:'سايح'},
  {id:'impurities', label:'شوائب بالمنتج',  type:'flow',    sub:'شوائب بالمنتج'},
  {id:'mold',       label:'عفن',           type:'flow',    sub:'عفن'},
  {id:'notfresh',   label:'غير طازج او فريش', type:'flow',  sub:'غير طازج غير فريش'},
  {id:'spoiled',    label:'فاسد',          type:'flow',    sub:'فاسد'},
  {id:'broken',     label:'مكسور/مدهوس/مفتوح', type:'flow', sub:'مكسور/ مدهوس / مفتوح'},
  {id:'salty',      label:'ملح زائد',       type:'flow',    sub:'ملح زائد'},
  {id:'expired',    label:'منتهي الصلاحية', type:'flow',    sub:'منتهي الصلاحية'},
  {id:'hyg',        label:'هايجين "نظافة عامة"', type:'flow', sub:'هايجين "نظافة عامة"'},
];
function pqClass(sub){ return `Complaint – Product Quality – ${sub}`; }
function replaceTextFor(caseId){
  const SAME = new Set(['mold','spoiled','hyg','expired']);
  return SAME.has(caseId)?'عمل طلب جديد بنفس الكمية في الطلب الاساسي.':'عمل طلب جديد بباقي الكمية.';
}

function buildPQ(){
  state.type = 'pq';
  resetStatePart('pq');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  const wrap = document.createElement('div');
  wrap.className='case-grid';
  PQ_CASES.forEach(c=>{
    const d=document.createElement('div');
    d.className='case';
    d.textContent = c.label;
    d.onclick=()=>selectPQCase(c, d);
    wrap.appendChild(d);
  });
  questionsEl.appendChild(wrap);
  renderMiniSummary();
}

function selectPQCase(c, node){
  document.querySelectorAll('.case').forEach(x=>x.classList.remove('active'));
  node.classList.add('active');
  const old = document.querySelector('.q-after-grid'); if(old) old.remove();
  resetRequired();
  wipe(state.pq, ['client','pay','product','withClient','rr']);
  state.pq.caseId    = c.id;
  state.pq.caseLabel = c.label;
  renderMiniSummary();

  const holder = document.createElement('div');
  holder.className='q-after-grid';
  questionsEl.appendChild(holder);

  if(c.type==='instant'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); return; }

  if(c.type==='taswiya'){
    const q = radioQuestion({
      title:'نوع العميل :',
      name:'pqClient',
      options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
    });
    holder.appendChild(q);
    q.querySelectorAll('input[name="pqClient"]').forEach(r=>{
      r.onchange=()=>{
        pruneNextSiblings(q,'q-block'); resetRequired();
        wipe(state.pq,['pay','product','withClient','rr']);
        state.pq.client = (r.value==='branch')?'عميل فرع':'عميل ديليفري';
        renderMiniSummary();

        if(r.value==='branch'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); }
        else{
          const q2 = radioQuestion({
            title:'هل طريقة الدفع',
            name:'pqPay',
            options:[ {value:'prepaid',label:'دفع مسبق "Online Payment"'}, {value:'cash',label:'كاش - فيزا'} ]
          });
          holder.appendChild(q2);
          q2.querySelectorAll('input[name="pqPay"]').forEach(rr=>{
            rr.onchange=()=>{
              pruneNextSiblings(q2,'q-block'); resetRequired();
              wipe(state.pq,['product','withClient','rr']);
              state.pq.pay = rr.value==='prepaid'?'دفع مسبق "Online Payment"':'كاش - فيزا';
              renderMiniSummary();

              if(rr.value==='prepaid'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); }
              else{
                const q3 = radioQuestion({
                  title:'هل المنتج:',
                  name:'pqProd',
                  options:[ {value:'fish',label:'سمك'}, {value:'other',label:'أي منتج آخر'} ]
                });
                holder.appendChild(q3);
                q3.querySelectorAll('input[name="pqProd"]').forEach(p=>{
                  p.onchange=()=>{
                    pruneNextSiblings(q3,'q-block'); resetRequired();
                    wipe(state.pq,['withClient','rr']);
                    state.pq.product = (p.value==='fish')?'سمك':'أي منتج آخر';
                    renderMiniSummary();
                    if(p.value==='fish'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); }
                    else { withClientFlowPQ(c, holder); }
                  };
                });
              }
            };
          });
        }
      };
    });
    return;
  }

  if(c.type==='flow'){
    const q = radioQuestion({
      title:'نوع العميل :',
      name:'pqClient',
      options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
    });
    holder.appendChild(q);
    q.querySelectorAll('input[name="pqClient"]').forEach(r=>{
      r.onchange=()=>{
        pruneNextSiblings(q,'q-block'); resetRequired();
        wipe(state.pq,['pay','product','withClient','rr']);
        state.pq.client = (r.value==='branch')?'عميل فرع':'عميل ديليفري';
        renderMiniSummary();
        if(r.value==='branch'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); }
        else{
          const q2 = radioQuestion({
            title:'هل طريقة الدفع',
            name:'pqPay',
            options:[ {value:'prepaid',label:'دفع مسبق "Online Payment"'}, {value:'cash',label:'كاش - فيزا'} ]
          });
          holder.appendChild(q2);
          q2.querySelectorAll('input[name="pqPay"]').forEach(rr=>{
            rr.onchange=()=>{
              pruneNextSiblings(q2,'q-block'); resetRequired();
              wipe(state.pq,['product','withClient','rr']);
              state.pq.pay = rr.value==='prepaid'?'دفع مسبق "Online Payment"':'كاش - فيزا';
              renderMiniSummary();
              if(rr.value==='prepaid'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`); }
              else{ withClientFlowPQ(c, holder, true); }
            };
          });
        }
      };
    });
  }
}
function withClientFlowPQ(caseObj, mount){
  const q = radioQuestion({
    title:'هل المنتج متواجد مع العميل؟',
    name:'pqWith',
    options:[ {value:'no',label:'لا'}, {value:'yes',label:'نعم'} ]
  });
  mount.appendChild(q);
  q.querySelectorAll('input[name="pqWith"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q,'q-block'); resetRequired();
      wipe(state.pq,['rr']);
      state.pq.withClient = r.value==='yes'?'نعم':'لا';
      renderMiniSummary();
      if(r.value==='no'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)}`); }
      else {
        const q2 = radioQuestion({
          title:'هل العميل يؤيد أسترجاع ام استبدال؟',
          name:'pqRR',
          options:[ {value:'return',label:'استرجاع'}, {value:'replace',label:'استبدال'} ]
        });
        mount.appendChild(q2);
        q2.querySelectorAll('input[name="pqRR"]').forEach(rr=>{
          rr.onchange=()=>{
            pruneNextSiblings(q2,'q-block'); resetRequired();
            state.pq.rr = rr.value==='return'?'استرجاع':'استبدال';
            renderMiniSummary();

            if(rr.value==='return'){ addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)}`); }
            else{
              addResult(replaceTextFor(caseObj.id));
              addResult('ترحيل موعد التوصيل فترة واحدة.');
              addResult('إضافة تعليق "خاص بشكوى".');
              addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)} ويتم إضافة PDF بالشكوى.`);
            }
          };
        });
      }
    };
  });
}

/* =========================
   عناصر مفقودة
   ========================= */
function buildMissing(){
  state.type='missing';
  resetStatePart('mi');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  const q1 = radioQuestion({
    title:'نوع العميل :',
    name:'miClient',
    options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
  });
  questionsEl.appendChild(q1);

  q1.querySelectorAll('input[name="miClient"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q1,'q-block'); resetRequired();
      wipe(state.mi,['pay','fish','inv','abd','source']);
      state.mi.client = r.value==='branch'?'عميل فرع':'عميل ديليفري'; renderMiniSummary();

      if(r.value==='branch'){ addResult('يتم عمل شكوى Complaint - Missing Item - Retail فقط.'); }
      else{
        const qInv = radioQuestion({
          title:'هل المنتج متحاسب عليه في الفاتورة؟',
          name:'miInv0',
          options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
        });
        questionsEl.appendChild(qInv);

        qInv.querySelectorAll('input[name="miInv0"]').forEach(inv0=>{
          inv0.onchange=()=>{
            pruneNextSiblings(qInv,'q-block'); resetRequired();
            wipe(state.mi,['pay','fish','abd','source']);
            state.mi.inv = inv0.value==='yes'?'نعم':'لا'; renderMiniSummary();

            if(inv0.value==='yes'){
              const qPay = radioQuestion({
                title:'هل طريقة الدفع',
                name:'miPay0',
                options:[ {value:'prepaid',label:'دفع مسبق "Online Payment"'}, {value:'cash',label:'كاش - فيزا'} ]
              });
              questionsEl.appendChild(qPay);

              qPay.querySelectorAll('input[name="miPay0"]').forEach(pp=>{
                pp.onchange=()=>{
                  pruneNextSiblings(qPay,'q-block'); resetRequired();
                  wipe(state.mi,['fish','abd','source']);
                  state.mi.pay = pp.value==='prepaid'?'دفع مسبق "Online Payment"':'كاش - فيزا'; renderMiniSummary();

                  if(pp.value==='prepaid'){ addResult('شكوى Delivery – Complaint - Missing Item فقط.'); }
                  else{
                    const qFish = radioQuestion({
                      title:'هل المنتج سمك؟',
                      name:'miFish',
                      options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
                    });
                    questionsEl.appendChild(qFish);

                    qFish.querySelectorAll('input[name="miFish"]').forEach(ff=>{
                      ff.onchange=()=>{
                        pruneNextSiblings(qFish,'q-block'); resetRequired();
                        state.mi.fish = ff.value==='yes'?'سمك':'ليس سمك'; renderMiniSummary();

                        if(ff.value==='yes'){ addResult('شكوى Delivery – Complaint - Missing Item فقط.'); }
                        else{
                          addResult('طلب جديد بالمفقود.');
                          addResult('ترحيل فترة واحدة.');
                          addResult('تعليق \'خاص بشكوى\'.');
                          addResult('تيكت: Complaint Missing Item - Delivery + PDF.');
                        }
                      };
                    });
                  }
                };
              });

            }else{ // inv = no
              const qPay2 = radioQuestion({
                title:'هل طريقة الدفع',
                name:'miPay1',
                options:[ {value:'prepaid',label:'دفع مسبق "Online Payment"'}, {value:'cash',label:'كاش - فيزا'} ]
              });
              questionsEl.appendChild(qPay2);

              qPay2.querySelectorAll('input[name="miPay1"]').forEach(pp2=>{
                pp2.onchange=()=>{
                  pruneNextSiblings(qPay2,'q-block'); resetRequired();
                  wipe(state.mi,['fish','abd','source']);
                  state.mi.pay = pp2.value==='prepaid'?'دفع مسبق "Online Payment"':'كاش - فيزا'; renderMiniSummary();

                  if(pp2.value==='prepaid'){
                    const qABD1 = radioQuestion({
                      title:'مراجعة الماجينتو وتيكت الأدمن داش بورد:',
                      name:'miABD1',
                      options:[
                        {value:'deleted',    label:'تم الحذف من خلال قسم الأدمن داش بورد'},
                        {value:'notordered', label:'لم يكن المنتج مطلوب في الطلب الأصلي'},
                      ]
                    });
                    questionsEl.appendChild(qABD1);
                    qABD1.querySelectorAll('input[name="miABD1"]').forEach(ab=>{
                      ab.onchange=()=>{
                        pruneNextSiblings(qABD1,'q-block'); resetRequired();
                        state.mi.abd = ab.value==='deleted'?'تم الحذف من الأدمن':'لم يكن مطلوبًا'; renderMiniSummary();

                        if(ab.value==='deleted'){
                          addResult('يتم عرض طلب جديد ببديل مناسب (New Order).');
                          addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                        }else{
                          addResult('يتم التوضيح للعميل أن المنتج غير مطلوب بالطلب من الأساس (من التطبيق).');
                          addResult('يتم عرض طلب جديد بالمنتج الذي يريده (New Order).');
                          addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                        }
                      };
                    });

                  }else{ // cash
                    const qSrc = radioQuestion({
                      title:'الطلب من:',
                      name:'miSrc',
                      options:[ {value:'app',label:'Application'}, {value:'ota',label:'OTA'} ]
                    });
                    questionsEl.appendChild(qSrc);

                    qSrc.querySelectorAll('input[name="miSrc"]').forEach(ss=>{
                      ss.onchange=()=>{
                        pruneNextSiblings(qSrc,'q-block'); resetRequired();
                        wipe(state.mi,['abd']);
                        state.mi.source = ss.value==='app' ? 'Application' : 'OTA';
                        renderMiniSummary();

                        const qABD2 = radioQuestion({
                          title:'مراجعة الماجينتو وتيكت الأدمن داش بورد:',
                          name:'miABD2',
                          options:[
                            {value:'deleted',    label:'تم الحذف من خلال قسم الأدمن داش بورد'},
                            {value:'notordered', label:'لم يكن المنتج مطلوب في الطلب الأصلي'},
                          ]
                        });
                        questionsEl.appendChild(qABD2);

                        qABD2.querySelectorAll('input[name="miABD2"]').forEach(ab2=>{
                          ab2.onchange=()=>{
                            pruneNextSiblings(qABD2,'q-block'); resetRequired();
                            state.mi.abd = ab2.value==='deleted'?'تم الحذف من الأدمن':'لم يكن مطلوبًا'; renderMiniSummary();

                            if(ss.value==='ota'){
                              if(ab2.value==='deleted'){
                                addResult('عرض طلب جديد ببديل مناسب (New Order). وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                              }else{
                                addResult('طلب جديد بالمفقود.');
                                addResult('ترحيل فترة واحدة.');
                                addResult('تعليق \'خاص بشكوى\'.');
                                addResult('تيكت: Complaint Missing Item - CC + PDF.');
                              }
                            }else{
                              if(ab2.value==='deleted'){
                                addResult('يتم عرض طلب جديد ببديل مناسب (New Order).');
                                addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                              }else{
                                addResult('يتم التوضيح للعميل أن المنتج غير مطلوب بالطلب من الأساس (من التطبيق).');
                                addResult('يتم عرض طلب جديد بالمنتج الذي يريده (New Order).');
                                addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                              }
                            }
                          };
                        });
                      };
                    });
                  }
                };
              });
            }
          };
        });
      }
    };
  });

  renderMiniSummary();
}

/* =========================
   خطأ فردي (WT) — مُحدّث حسب المطلوب
   ========================= */
function buildWT(){
  state.type='wt';
  resetStatePart('wt');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  const step = radioQuestion({
    title:'اختر الحالة:',
    name:'wtScenario',
    options:[
      {value:'less',   label:'الحالة الأولى (وصول منتج بكميات اقل من المطلوب)'},
      {value:'comment',label:'الحالة الثانية (عدم الالتزام بكومنت في الطلب)'},
    ]
  });
  questionsEl.appendChild(step);

  step.querySelectorAll('input[name="wtScenario"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(step,'q-block'); resetRequired();
      wipe(state.wt,['client','pay','kind','invoiced','abd','rr']);
      state.wt.scenario = (r.value==='less')?'الحالة الأولى (كمية أقل)':'الحالة الثانية (عدم الالتزام بكومنت)';
      renderMiniSummary();

      /* ===== الحالة الأولى: كمية أقل ===== */
      if(r.value==='less'){
        const qClient = radioQuestion({
          title:'نوع العميل :',
          name:'wtClient',
          options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
        });
        questionsEl.appendChild(qClient);

        qClient.querySelectorAll('input[name="wtClient"]').forEach(c=>{
          c.onchange=()=>{
            pruneNextSiblings(qClient,'q-block'); resetRequired();
            wipe(state.wt,['pay','kind','invoiced','abd','rr']);
            state.wt.client = (c.value==='branch')?'عميل فرع':'عميل ديليفري'; renderMiniSummary();

            if(c.value==='branch'){ addResult('Complaint Wrong Transaction – chef – less quantity'); return; }

            // ديليفري → طريقة الدفع
            const qPay = radioQuestion({
              title:'هل طريقة الدفع',
              name:'wtPay',
              options:[ {value:'prepaid',label:'دفع مسبق "Online Payment "'}, {value:'cash',label:'كاش - فيزا'} ]
            });
            questionsEl.appendChild(qPay);

            qPay.querySelectorAll('input[name="wtPay"]').forEach(pp=>{
              pp.onchange=()=>{
                pruneNextSiblings(qPay,'q-block'); resetRequired();
                wipe(state.wt,['kind','invoiced','abd','rr']);
                state.wt.pay = (pp.value==='prepaid')?'دفع مسبق "Online Payment"':'كاش - فيزا'; renderMiniSummary();

                // Online Payment: اختيارات المنتج 3
                if(pp.value==='prepaid'){
                  const qKindP = radioQuestion({
                    title:'هل المنتج',
                    name:'wtKindP',
                    options:[
                      {value:'fish', label:'سمك'},
                      {value:'meat', label:'لحوم – جبن بالوزن - دواجن'},
                      {value:'other',label:'منتجات أخري'}
                    ]
                  });
                  questionsEl.appendChild(qKindP);

                  qKindP.querySelectorAll('input[name="wtKindP"]').forEach(k=>{
                    k.onchange=()=>{
                      pruneNextSiblings(qKindP,'q-block'); resetRequired();
                      wipe(state.wt,['invoiced','abd','rr']);
                      state.wt.kind = (k.value==='fish')?'سمك':(k.value==='meat'?'لحوم – جبن بالوزن - دواجن':'منتجات أخرى'); renderMiniSummary();

                      if(k.value==='fish'){ addResult('Complaint Wrong Transaction – chef – less quantity'); }
                      else if(k.value==='meat'){ addResult('Complaint Wrong Transaction – chef – less quantity'); }
                      else{ addResult('Complaint Wrong Transaction – Picker –Less Quantity'); }
                    };
                  });
                  return;
                }

                // Cash/Visa
                const qKindC = radioQuestion({
                  title:'هل منتج:',
                  name:'wtKindC',
                  options:[
                    {value:'fish', label:'سمك'},
                    {value:'meat', label:'لحوم / دواجن – جبن بالوزن'},
                    {value:'other',label:'منتجات أخري'}
                  ]
                });
                questionsEl.appendChild(qKindC);

                qKindC.querySelectorAll('input[name="wtKindC"]').forEach(k=>{
                  k.onchange=()=>{
                    pruneNextSiblings(qKindC,'q-block'); resetRequired();
                    wipe(state.wt,['invoiced','abd','rr']);
                    state.wt.kind = (k.value==='fish')?'سمك':(k.value==='meat'?'لحوم / دواجن – جبن بالوزن':'منتجات أخرى'); renderMiniSummary();

                    if(k.value==='fish'){ addResult('Complaint Wrong Transaction – chef – less quantity'); return; }

                    if(k.value==='meat'){
                      const qInvMeat = radioQuestion({
                        title:'هل تم المحاسبة في الفاتورة على الكمية كاملة؟',
                        name:'wtInvMeat',
                        options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
                      });
                      questionsEl.appendChild(qInvMeat);

                      qInvMeat.querySelectorAll('input[name="wtInvMeat"]').forEach(inv=>{
                        inv.onchange=()=>{
                          pruneNextSiblings(qInvMeat,'q-block'); resetRequired();
                          wipe(state.wt,['abd','rr']);
                          state.wt.invoiced = inv.value==='yes'?'نعم':'لا'; renderMiniSummary();

                          if(inv.value==='yes'){
                            addResult('عمل طلب جديد بباقي الكمية.');
                            addResult('ترحيل موعد التوصيل فترة واحدة.');
                            addResult('إضافة تعليق "خاص بشكوى".');
                            addResult('Complaint Wrong Transaction – Chef – عدم الالتزام بالوزنة');
                            addResult('يتم إضافة PDF بالشكوى.');
                          }else{
                            const qABDMeat = radioQuestion({
                              title:'اختر الحالة:',
                              name:'wtABDMeat',
                              options:[
                                {value:'partial',  label:'الحالة الاولي: تم أرسال الكمية المتاحة لعدم توافر كامل الكمية'},
                                {value:'nochange', label:'الحالة الثانية: لا يوجد اي تعديل علي المنتج و الكمية من خلال الABD'}
                              ]
                            });
                            questionsEl.appendChild(qABDMeat);

                            qABDMeat.querySelectorAll('input[name="wtABDMeat"]').forEach(a=>{
                              a.onchange=()=>{
                                pruneNextSiblings(qABDMeat,'q-block'); resetRequired();
                                state.wt.abd = a.value==='partial'?'تم إرسال الكمية المتاحة':'لا يوجد تعديل من ABD'; renderMiniSummary();

                                if(a.value==='partial'){
                                  addResult('عرض طلب جديد ببديل مناسب (New Order).');
                                }else{
                                  addResult('عمل طلب جديد بباقي الكمية.');
                                  addResult('ترحيل موعد التوصيل فترة واحدة.');
                                  addResult('إضافة تعليق "خاص بشكوى".');
                                  addResult('Complaint Wrong Transaction – Chef –عدم الالتزام بالوزن');
                                  addResult('يتم إضافة PDF بالشكوى.');
                                }
                              };
                            });
                          }
                        };
                      });
                      return;
                    }

                    // منتجات أخري
                    const qInvOther = radioQuestion({
                      title:'هل تم المحاسبة في الفاتورة على الكمية كاملة؟',
                      name:'wtInvOther',
                      options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
                    });
                    questionsEl.appendChild(qInvOther);

                    qInvOther.querySelectorAll('input[name="wtInvOther"]').forEach(inv=>{
                      inv.onchange=()=>{
                        pruneNextSiblings(qInvOther,'q-block'); resetRequired();
                        wipe(state.wt,['abd','rr']);
                        state.wt.invoiced = inv.value==='yes'?'نعم':'لا'; renderMiniSummary();

                        if(inv.value==='yes'){
                          addResult('عمل طلب جديد بباقي الكمية.');
                          addResult('ترحيل موعد التوصيل فترة واحدة.');
                          addResult('إضافة تعليق "خاص بشكوى".');
                          addResult('Complaint Wrong Transaction – Picker –Less Quantity');
                          addResult('يتم إضافة PDF بالشكوى.');
                        }else{
                          const qABDOther = radioQuestion({
                            title:'اختر الحالة:',
                            name:'wtABDOther',
                            options:[
                              {value:'partial',  label:'الحالة الاولي: تم أرسال الكمية المتاحة لعدم توافر كامل الكمية'},
                              {value:'nochange', label:'الحالة الثانية: لا يوجد اي تعديل علي المنتج و الكمية من خلال الABD'}
                            ]
                          });
                          questionsEl.appendChild(qABDOther);

                          qABDOther.querySelectorAll('input[name="wtABDOther"]').forEach(a=>{
                            a.onchange=()=>{
                              pruneNextSiblings(qABDOther,'q-block'); resetRequired();
                              state.wt.abd = a.value==='partial'?'تم إرسال الكمية المتاحة':'لا يوجد تعديل من ABD'; renderMiniSummary();

                              if(a.value==='partial'){
                                addResult('عرض طلب جديد ببديل مناسب (New Order).');
                              }else{
                                addResult('عمل طلب جديد بباقي الكمية.');
                                addResult('ترحيل موعد التوصيل فترة واحدة.');
                                addResult('إضافة تعليق "خاص بشكوى".');
                                addResult('Complaint Wrong Transaction – Picker –Less Quantity');
                                addResult('يتم إضافة PDF بالشكوى.');
                              }
                            };
                          });
                        }
                      };
                    });
                  };
                });
              };
            });
          };
        });
        return;
      }

      /* ===== الحالة الثانية: عدم الالتزام بكومنت ===== */
      const qClient2 = radioQuestion({
        title:'نوع العميل :',
        name:'wtCClient',
        options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
      });
      questionsEl.appendChild(qClient2);

      qClient2.querySelectorAll('input[name="wtCClient"]').forEach(c=>{
        c.onchange=()=>{
          pruneNextSiblings(qClient2,'q-block'); resetRequired();
          wipe(state.wt,['pay','kind','invoiced','abd','rr']);
          state.wt.client = (c.value==='branch')?'عميل فرع':'عميل ديليفري'; renderMiniSummary();

          if(c.value==='branch'){ addResult('Complaint Wrong Transaction – chef –  عدم الالتزام بكومنت'); return; }

          const qPay2 = radioQuestion({
            title:'هل طريقة الدفع',
            name:'wtCPay',
            options:[ {value:'prepaid',label:'دفع مسبق "Online Payment "'}, {value:'cash',label:'كاش - فيزا'} ]
          });
          questionsEl.appendChild(qPay2);

          qPay2.querySelectorAll('input[name="wtCPay"]').forEach(pp=>{
            pp.onchange=()=>{
              pruneNextSiblings(qPay2,'q-block'); resetRequired();
              wipe(state.wt,['kind','invoiced','abd','rr']);
              state.wt.pay = (pp.value==='prepaid')?'دفع مسبق "Online Payment"':'كاش - فيزا'; renderMiniSummary();

              // Online
              if(pp.value==='prepaid'){
                const qKindCP = radioQuestion({
                  title:'هل المنتج',
                  name:'wtKindCP',
                  options:[
                    {value:'fish', label:'سمك'},
                    {value:'meat', label:'لحوم / دواجن – جبن  بالوزن'},
                    {value:'other',label:'منتجات أخري'}
                  ]
                });
                questionsEl.appendChild(qKindCP);

                qKindCP.querySelectorAll('input[name="wtKindCP"]').forEach(k=>{
                  k.onchange=()=>{
                    pruneNextSiblings(qKindCP,'q-block'); resetRequired();
                    wipe(state.wt,['rr','invoiced','abd']);
                    state.wt.kind = (k.value==='fish')?'سمك':(k.value==='meat'?'لحوم / دواجن – جبن  بالوزن':'منتجات أخرى'); renderMiniSummary();

                    if(k.value==='fish'){ addResult('Complaint Wrong Transaction – chef –  عدم الالتزام بكومنت'); }
                    else if(k.value==='meat'){ addResult('Complaint Wrong Transaction – chef –  عدم الالتزام بكومنت'); }
                    else{ addResult('Complaint Wrong Transaction – Picker –عدم الالتزام بكومنت'); }
                  };
                });
                return;
              }

              // Cash
              const qKindCC = radioQuestion({
                title:'هل منتج:',
                name:'wtKindCC',
                options:[
                  {value:'fish', label:'سمك'},
                  {value:'meat', label:'لحوم – جبن بالوزن'},
                  {value:'other',label:'منتجات أخري'}
                ]
              });
              questionsEl.appendChild(qKindCC);

              qKindCC.querySelectorAll('input[name="wtKindCC"]').forEach(k=>{
                k.onchange=()=>{
                  pruneNextSiblings(qKindCC,'q-block'); resetRequired();
                  wipe(state.wt,['rr','invoiced','abd']);
                  state.wt.kind = (k.value==='fish')?'سمك':(k.value==='meat'?'لحوم – جبن بالوزن':'منتجات أخرى'); renderMiniSummary();

                  if(k.value==='fish'){ addResult('Complaint Wrong Transaction – chef –  عدم الالتزام بكومنت'); return; }

                  if(k.value==='meat'){
                    const qRRMeat = radioQuestion({
                      title:'هل تريد استرجاع ام استبدال المنتج؟',
                      name:'wtCRRMeat',
                      options:[ {value:'return',label:'أسترجاع فقط'}, {value:'replace',label:'أستبدال'} ]
                    });
                    questionsEl.appendChild(qRRMeat);

                    qRRMeat.querySelectorAll('input[name="wtCRRMeat"]').forEach(rr=>{
                      rr.onchange=()=>{
                        pruneNextSiblings(qRRMeat,'q-block'); resetRequired();
                        state.wt.rr = rr.value==='return'?'أسترجاع فقط':'أستبدال'; renderMiniSummary();

                        if(rr.value==='return'){
                          addResult('Complaint Wrong Transaction – Chef – عدم الالتزام بكومنت');
                        }else{
                          addResult('عمل طلب جديد بالمنتج.');
                          addResult('ترحيل موعد التوصيل فترة واحدة.');
                          addResult('إضافة تعليق "خاص بشكوى".');
                          addResult('Complaint Wrong Transaction – Chef –عدم الالتزام بكومنت');
                          addResult('يتم إضافة PDF بالشكوى.');
                        }
                      };
                    });
                    return;
                  }

                  // منتجات أخرى: يُسأل عن الفاتورة + الإجراء (القرار بناءً على الإجراء)
                  const qInvOtherC = radioQuestion({
                    title:'هل تم المحاسبة في الفاتورة على الكمية كاملة؟',
                    name:'wtInvOtherC',
                    options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
                  });
                  questionsEl.appendChild(qInvOtherC);
                  qInvOtherC.querySelectorAll('input[name="wtInvOtherC"]').forEach(inv=>{
                    inv.onchange=()=>{ state.wt.invoiced = inv.value==='yes'?'نعم':'لا'; renderMiniSummary(); };
                  });

                  const qRROther = radioQuestion({
                    title:'هل تريد استرجاع ام استبدال المنتج؟',
                    name:'wtCRROther',
                    options:[ {value:'return',label:'أسترجاع فقط'}, {value:'replace',label:'أستبدال'} ]
                  });
                  questionsEl.appendChild(qRROther);

                  qRROther.querySelectorAll('input[name="wtCRROther"]').forEach(rr=>{
                    rr.onchange=()=>{
                      pruneNextSiblings(qRROther,'q-block'); resetRequired();
                      state.wt.rr = rr.value==='return'?'أسترجاع فقط':'أستبدال'; renderMiniSummary();

                      if(rr.value==='return'){
                        addResult('Complaint Wrong Transaction – Picker –عدم الالتزام بكومنت');
                      }else{
                        addResult('عمل طلب جديد بباقي الكمية.');
                        addResult('ترحيل موعد التوصيل فترة واحدة.');
                        addResult('إضافة تعليق "خاص بشكوى".');
                        addResult('Complaint Wrong Transaction – Picker –عدم الالتزام بكومنت');
                        addResult('يتم إضافة PDF بالشكوى.');
                      }
                    };
                  });
                };
              });
            };
          });
        };
      });
    };
  });

  renderMiniSummary();
}

/* =========================
   تأخير توصيل (Delay)
   ========================= */
function buildDelay(){
  state.type='delay';
  resetStatePart('delay');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  const q = inputQuestion({
    title:'الفترة الزمنية للطلب (Time Interval)',
    name:'delayInterval',
    placeholder:'مثال: 2:00 PM - 5:00 PM'
  });
  questionsEl.appendChild(q);

  const input = q.querySelector('#delayInterval');
  if(input){
    input.addEventListener('input', ()=>{
      if(input.value.trim()) input.classList.remove('invalid');
      state.delay.interval = input.value.trim();
      renderMiniSummary();
    });
  }

  addResult('يتم عمل تيكت شكوى بالتصنيف Complaint - Delivery Lateness - تأخير توصيل');
  renderMiniSummary();
}

/* =========================
   إنهاء الشكوى + Reset
   ========================= */
function clearComplaintInputs(){
  ['custNumber','orderNumber','orderCreated','receiptNumber','productName'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.value=''; el.classList.remove('invalid'); }
  });
}
function resetAll(){
  state.type=null;
  resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt'); resetStatePart('delay');
  clear(questionsEl); resetRequired();

  document.querySelectorAll('input[name="ctype"]').forEach(r=>{ r.checked = false; });
  document.querySelectorAll('.case.active').forEach(x=>x.classList.remove('active'));

  if(qaCard) show(qaCard,false);
  const summaryCard = document.getElementById('summaryCard');
  if(summaryCard) show(summaryCard,false);

  const bar = document.querySelector('#qaProgress .bar');
  if(bar) bar.style.width='0%';

  clearComplaintInputs();
  renderMiniSummary();
}

/* =========================
   التحكم العام في اختيار نوع الشكوى
   ========================= */
document.querySelectorAll('input[name="ctype"]').forEach(input=>{
  input.addEventListener('change', (e)=>{
    clear(questionsEl); resetRequired();
    resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt'); resetStatePart('delay');

    const v = e.target.value;
    if(v==='pq')      buildPQ();
    else if(v==='missing') buildMissing();
    else if(v==='wt') buildWT();
    else if(v==='delay') buildDelay();
  });
});

/* =========================
   أزرار الخلاصة
   ========================= */
btnEnd && btnEnd.addEventListener('click', ()=>{
  if(confirm('هل أنت متأكد أنك تريد إنهاء الشكوى؟')) resetAll();
});

btnCopy && btnCopy.addEventListener('click', async()=>{
  const {missing, missingKeys} = getMissingFields(REQUIRED_FIELDS_MODE);
  if(missing.length){
    markInvalidFields(missingKeys, true);
    showToast(`لا يمكن نسخ الخلاصة — يوجد بيانات ناقصة في «بيانات الشكوى». من فضلك أكملها: ${missing.join('، ')}`, 'error');
    document.getElementById(FIELD_MAP[missingKeys[0]].id)?.focus();
    return;
  }
  if(state.type==='delay' && !state.delay.interval){
    const el = document.getElementById('delayInterval');
    markInvalidEl(el, true);
    el?.focus();
    showToast('من فضلك أدخل Time Interval قبل نسخ الخلاصة.', 'error');
    return;
  }

  try{
    const text = buildCopyText();
    if(!text?.trim()){ showToast('الخلاصة فارغة حاليًا.', 'error'); return; }
    await navigator.clipboard.writeText(text);
    showToast('تم نسخ الخلاصة بنجاح ✅', 'success');
  }catch{ showToast('تعذّر نسخ الخلاصة.', 'error'); }
});

btnSave && btnSave.addEventListener('click', ()=>{
  const cust = FIELDS.custNumber();
  if(!cust){
    markInvalidFields(['custNumber'], true);
    document.getElementById('custNumber')?.focus();
    showToast('لا يمكن حفظ المسودة — Customer Number مطلوب.', 'error'); return;
  }
  if(state.type==='delay' && !state.delay.interval){
    const el = document.getElementById('delayInterval');
    markInvalidEl(el, true); el?.focus();
    showToast('لا يمكن حفظ المسودة — أدخل Time Interval.', 'error'); return;
  }
  if(!confirm('هل تريد حفظ الخطوات كمسودة؟')) return;
  saveCurrentDraft();
});

/* ============ UI Enhancements: Progress + Theme ============ */
(function(){
  const root = document.body;

  document.querySelectorAll('.swatch[data-swatch]').forEach(s=>{
    const savedBrand = localStorage.getItem('brand');
    if (savedBrand) root.setAttribute('data-brand', savedBrand);
    s.addEventListener('click', ()=>{
      const v = s.getAttribute('data-swatch');
      root.setAttribute('data-brand', v === 'green' ? '' : v);
      if (v === 'green') localStorage.removeItem('brand');
      else localStorage.setItem('brand', v);
    });
  });

  const card = document.getElementById('qaCard');
  function ensureProgressEl(){
    if (!card) return null;
    let p = card.querySelector('#qaProgress');
    if (!p){
      const frag = document.createElement('div');
      frag.className = 'thin-progress';
      frag.id = 'qaProgress';
      frag.innerHTML = '<div class="bar"></div>';
      card.prepend(frag); p = frag;
    }
    return p;
  }
  function computeProgress(){
    if (!card) return;
    const p = ensureProgressEl(); if (!p) return;
    const blocks = Array.from(card.querySelectorAll('.q-block'));
    if (!blocks.length){ p.querySelector('.bar').style.width = '0%'; return; }
    let answered = 0;
    blocks.forEach(b=>{
      const anyChecked = b.querySelector('input:checked, select option:checked, textarea[value]:not([value=""])');
      const anyFilled  = b.querySelector('input[type="text"]')?.value?.trim();
      if (anyChecked || anyFilled) answered++;
    });
    const percent = Math.round((answered / blocks.length) * 100);
    p.querySelector('.bar').style.width = percent + '%';
  }
  if (card){
    ensureProgressEl();
    card.addEventListener('change', computeProgress);
    card.addEventListener('input', computeProgress);
    setTimeout(computeProgress, 300);
  }
})();

/* =========================
   Drafts: حفظ/عرض/بحث/حذف (كلها آمنة لو مفيش عناصر Drafts)
   ========================= */
function readDrafts(){ try{ return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch{ return []; } }
function writeDrafts(list){ try{ localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); }catch{} }
function formatTS(ts){
  try{ return new Date(ts).toLocaleString('ar-EG', { dateStyle:'short', timeStyle:'short' }); }
  catch{ return ts; }
}
function currentResultsArray(){
  return [...(requiredEl?.querySelectorAll('.result')||[])].map(el=>el.textContent.trim()).filter(Boolean);
}
function saveCurrentDraft(){
  const data = {
    id: 'DR_'+Date.now(),
    ts: Date.now(),
    customer: FIELDS.custNumber(),
    fields: {
      custNumber: FIELDS.custNumber(),
      orderNumber: FIELDS.orderNumber(),
      orderCreated: FIELDS.orderCreated(),
      receiptNumber: FIELDS.receiptNumber(),
      productName: FIELDS.productName(),
    },
    type: state.type,
    state: JSON.parse(JSON.stringify(state)),
    required: currentResultsArray(),
    brand: document.body.getAttribute('data-brand') || ''
  };
  const list = readDrafts(); list.push(data); writeDrafts(list);
  renderDrafts(); showToast('تم حفظ المسودة ✅', 'success');
}
function openDraftInNewTab(id){
  try{
    const url = new URL(window.location.href);
    url.searchParams.set('draft', id);
    window.open(url.toString(), '_blank');
  }catch{}
}
function deleteDraft(id){
  if(!confirm('هل تريد حذف هذه المسودة؟')) return;
  writeDrafts(readDrafts().filter(d=>d.id!==id));
  renderDrafts(draftsSearch?.value?.trim()||'');
}
function renderDrafts(filter=''){
  if(!draftsListEl) return;
  const list = readDrafts().sort((a,b)=>b.ts - a.ts).filter(d=> !filter || (d.customer||'').includes(filter));
  draftsListEl.innerHTML = '';
  if(!list.length){
    const li = document.createElement('div');
    li.className='draft-empty';
    li.textContent='لا توجد مسودات بعد.';
    draftsListEl.appendChild(li);
    return;
  }
  list.forEach(d=>{
    const li = document.createElement('li');
    li.className='draft-item';
    li.innerHTML = `
      <div class="draft-top">
        <a class="draft-link" href="javascript:void(0)">${esc(d.customer || 'بدون رقم')}</a>
        <span class="draft-meta">${formatTS(d.ts)}</span>
      </div>
      <div class="draft-actions">
        <button class="draft-del">حذف</button>
      </div>`;
    li.querySelector('.draft-link').addEventListener('click', ()=>openDraftInNewTab(d.id));
    li.querySelector('.draft-del').addEventListener('click', ()=>deleteDraft(d.id));
    draftsListEl.appendChild(li);
  });
}
draftsToggle && draftsToggle.addEventListener('click', ()=> draftsSidebar?.classList.toggle('collapsed'));
draftsSearch && draftsSearch.addEventListener('input', ()=> renderDrafts(draftsSearch.value.trim()));

/* تحميل مسودة من ?draft= */
function loadDraftByIdFromURL(){
  try{
    const id = new URLSearchParams(window.location.search).get('draft'); if(!id) return;
    const d = readDrafts().find(x=>x.id===id);
    if(!d){ showToast('لم يتم العثور على هذه المسودة.', 'error'); return; }

    resetAll();
    ['custNumber','orderNumber','orderCreated','receiptNumber','productName'].forEach(k=>{
      const el = document.getElementById(k); if(el) el.value = d.fields?.[k] ?? '';
    });

    state.type = d.type || null;
    if(d.state){
      state.pq = d.state.pq || state.pq;
      state.mi = d.state.mi || state.mi;
      state.wt = d.state.wt || state.wt;
      state.delay = d.state.delay || state.delay;
    }

    resetRequired();
    (d.required||[]).forEach(txt=> addResult(txt));
    renderMiniSummary();
    showToast('تم فتح المسودة — يمكنك المتابعة أو التعديل.', 'success');
  }catch{}
}

/* تهيئة */
renderDrafts();
loadDraftByIdFromURL();
