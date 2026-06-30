const COLORS=['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899'];
const todayDate=new Date();
const todayStr=todayDate.toISOString().split('T')[0];
const todayFmt=todayDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

let currentUser=null,pinEntry='',pinTarget=null,rainJobId=null;
let currentEstimate={},currentInvId=null;
let sigHasMark=false,isDrawing=false,lastX=0,lastY=0;
let jobFilter='all';
let bizName="Tommy's Lawn Care";

let state={
  crew:[{id:1,name:'Tommy (Owner)',pin:'1234',role:'owner',color:COLORS[0]}],
  customers:[],jobs:[],estimates:[],invoices:[],
  calMonth:todayDate.getMonth(),calYear:todayDate.getFullYear()
};

function initials(n){return(n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function getC(id){return state.customers.find(c=>c.id===id)||{};}
function getCrew(id){return state.crew.find(c=>c.id===id)||{};}
function addDays(ds,d){const dt=new Date(ds);dt.setDate(dt.getDate()+d);return dt.toISOString().split('T')[0];}

function go(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}

/* SIGNUP */
function signupStep(n){
  [1,2,3].forEach(i=>{document.getElementById('sp'+i).style.display=i===n?'block':'none';});
  [1,2,3].forEach(i=>{const el=document.getElementById('sd'+i);if(i<n){el.className='step-dot done';el.innerHTML='<i class="ti ti-check" style="font-size:11px"></i>';}else if(i===n){el.className='step-dot active';el.textContent=i;}else{el.className='step-dot pending';el.textContent=i;}});
  document.getElementById('sl1').className='step-line'+(n>1?' done':'');
  document.getElementById('sl2').className='step-line'+(n>2?' done':'');
}
const planDescs={starter:'Up to 10 customers, 1 crew leader, job scheduling, and payment tracking.',pro:'Unlimited customers, up to 5 crew leaders, optimized scheduling, and full payment tracking.',biz:'Everything in Pro plus unlimited crew leaders and route optimization.'};
const planBtns={starter:'Continue with Starter',pro:'Continue with Pro',biz:'Continue with Business'};
function pickPlan(p){['starter','pro','biz'].forEach(x=>document.getElementById('pp-'+x).classList.remove('sel'));document.getElementById('pp-'+p).classList.add('sel');document.getElementById('plan-detail').textContent=planDescs[p];document.getElementById('plan-btn').textContent=planBtns[p];}
function completeSignup(){const fname=document.getElementById('su-fname').value.trim()||'Tommy';const biz=document.getElementById('su-biz').value.trim();if(biz)bizName=biz;state.crew[0].name=fname+' (Owner)';launchApp();}
function launchApp(){go('s-login');renderProfileGrid();}

/* LOGIN / PIN */
function renderProfileGrid(){document.getElementById('profile-grid').innerHTML=state.crew.map(c=>`<div class="profile-card" onclick="selectProfile(${c.id})"><div class="profile-avatar" style="background:${c.color}">${initials(c.name)}</div><div class="profile-name">${c.name}</div><div class="profile-role">${c.role==='owner'?'Owner':'Crew leader'}</div></div>`).join('');}
function selectProfile(id){pinTarget=state.crew.find(c=>c.id===id);document.getElementById('pin-title').textContent='Hi, '+pinTarget.name.split(' ')[0];document.getElementById('pin-sub').textContent='Enter your PIN to continue';pinEntry='';updateDots();document.getElementById('pin-error').textContent='';document.getElementById('pin-overlay').classList.add('open');}
function closePinOverlay(){document.getElementById('pin-overlay').classList.remove('open');pinEntry='';updateDots();}
function pinKey(k){document.getElementById('pin-error').textContent='';if(k==='back')pinEntry=pinEntry.slice(0,-1);else if(k==='clear')pinEntry='';else if(pinEntry.length<4)pinEntry+=k;updateDots();if(pinEntry.length===4)setTimeout(checkPin,120);}
function updateDots(){for(let i=0;i<4;i++){const d=document.getElementById('dot-'+i);d.classList.toggle('filled',i<pinEntry.length);d.classList.remove('error');}}
function checkPin(){if(pinTarget&&pinEntry===pinTarget.pin){currentUser=pinTarget;closePinOverlay();applyMode();}else{for(let i=0;i<4;i++)document.getElementById('dot-'+i).classList.add('error');document.getElementById('pin-error').textContent='Incorrect PIN. Try again.';setTimeout(()=>{pinEntry='';updateDots();},800);}}

/* APP MODE */
function applyMode(){
  const isOwner=currentUser.role==='owner';
  const badge=document.getElementById('app-badge');
  badge.textContent=isOwner?'Owner':currentUser.name;
  badge.className='mode-badge '+(isOwner?'owner':'crew');
  ['atab-calendar','atab-jobs','atab-customers','atab-estimates','atab-invoices','atab-crew'].forEach(id=>document.getElementById(id).classList.toggle('show',isOwner));
  document.getElementById('atab-today').classList.add('show');
  go('s-app');
  if(isOwner)switchAppTab('calendar',document.getElementById('atab-calendar'));
  else switchAppTab('today',document.getElementById('atab-today'));
}
function switchAppTab(name,el){
  document.querySelectorAll('.app-panel').forEach(p=>p.style.display='none');
  document.querySelectorAll('.app-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('apanel-'+name).style.display='block';
  el.classList.add('active');
  if(name==='today')renderCrewToday();
  if(name==='calendar')renderCalendar();
  if(name==='jobs')renderJobs();
  if(name==='customers')renderCustomers();
  if(name==='estimates')renderEstList();
  if(name==='invoices')renderInvList();
  if(name==='crew')renderCrewMgmt();
}
function returnToApp(tab){go('s-app');const el=document.getElementById('atab-'+tab);if(el)switchAppTab(tab,el);}
function goEstimateBuild(){populateCrewSel();document.getElementById('e-start').value=todayStr;go('s-estimate-build');}

/* TODAY */
function renderCrewToday(){
  if(!currentUser)return;
  const isOwner=currentUser.role==='owner';
  document.getElementById('today-greeting').textContent='Hey '+currentUser.name.split(' ')[0]+", here's your day";
  document.getElementById('today-sub').textContent=todayDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  let jobs=state.jobs.filter(j=>j.date===todayStr&&j.status!=='rescheduled');
  if(!isOwner)jobs=jobs.filter(j=>j.crewId===currentUser.id);
  const done=jobs.filter(j=>j.status==='complete').length,total=jobs.length,pct=total>0?Math.round(done/total*100):0;
  document.getElementById('prog-lbl').textContent=done+' of '+total+' complete';
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('prog-fill').style.width=pct+'%';
  const el=document.getElementById('today-jobs');
  if(!total){el.innerHTML='<div class="no-jobs"><i class="ti ti-circle-check"></i><div style="font-weight:500;margin-bottom:4px">No jobs today</div><div style="font-size:12px">Enjoy the day!</div></div>';return;}
  el.innerHTML=jobs.map((j,i)=>{
    const c=getC(j.customerId),isDone=j.status==='complete';
    const crLabel=isOwner?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px"><i class="ti ti-user" style="font-size:10px"></i> ${getCrew(j.crewId).name||'Unassigned'}</div>`:'';
    const rainBtn=isOwner&&!isDone?`<button class="btn rain sm" onclick="openRaincheck(${j.id})"><i class="ti ti-cloud-rain"></i> Raincheck</button>`:'';
    return `<div class="crew-job-card${isDone?' done':''}"><div class="job-num${isDone?' done':''}">${isDone?'<i class="ti ti-check"></i>':i+1}</div><div class="job-info"><div class="job-cust-name">${c.name||'—'}</div><div class="job-addr">${c.address||'—'}</div>${j.notes?'<div style="font-size:11px;color:var(--text-secondary);font-style:italic">'+j.notes+'</div>':''}${crLabel}</div><div class="crew-job-actions">${rainBtn}<button class="btn${isDone?' sm':' primary sm'}" onclick="toggleTodayJob(${j.id})">${isDone?'Undo':'Mark done'}</button></div></div>`;
  }).join('');
}
function toggleTodayJob(id){const j=state.jobs.find(x=>x.id===id);if(j)j.status=j.status==='complete'?'pending':'complete';renderCrewToday();}

/* CALENDAR */
function renderCalStats(){
  const mo=state.calMonth,yr=state.calYear;
  const mJobs=state.jobs.filter(j=>{const d=new Date(j.date);return d.getMonth()===mo&&d.getFullYear()===yr&&j.status!=='rescheduled';});
  const unpaid=mJobs.filter(j=>!j.paid).reduce((s,j)=>s+j.amount,0);
  document.getElementById('s-today').textContent=state.jobs.filter(j=>j.date===todayStr&&j.status!=='rescheduled').length;
  document.getElementById('s-month').textContent=mJobs.length;
  document.getElementById('s-unpaid').textContent='$'+unpaid.toFixed(2);
}
function renderCalendar(){
  renderCalStats();
  const yr=state.calYear,mo=state.calMonth;
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-title').textContent=months[mo]+' '+yr;
  const firstDay=new Date(yr,mo,1).getDay(),daysInMonth=new Date(yr,mo+1,0).getDate(),prevDays=new Date(yr,mo,0).getDate();
  const byDay={};
  state.jobs.forEach(j=>{const d=new Date(j.date);if(d.getMonth()===mo&&d.getFullYear()===yr){const day=d.getDate();if(!byDay[day])byDay[day]=[];byDay[day].push(j);}});
  let html='';
  for(let i=0;i<firstDay;i++)html+=`<div class="cal-cell other"><div class="cell-num">${prevDays-firstDay+i+1}</div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const jobs=byDay[d]||[];
    let pills=jobs.slice(0,2).map(j=>`<div class="job-pill-sm ${j.status==='rescheduled'?'rain':j.paid?'paid':j.status==='complete'?'unpaid':'pending'}">${getC(j.customerId).name||'Job'}</div>`).join('');
    if(jobs.length>2)pills+=`<div class="job-pill-sm pending">+${jobs.length-2}</div>`;
    html+=`<div class="cal-cell${ds===todayStr?' today':''}"><div class="cell-num">${d}</div>${pills}</div>`;
  }
  const rem=42-firstDay-daysInMonth;
  for(let d=1;d<=rem;d++)html+=`<div class="cal-cell other"><div class="cell-num">${d}</div></div>`;
  document.getElementById('cal-cells').innerHTML=html;
}
function changeMonth(dir){state.calMonth+=dir;if(state.calMonth>11){state.calMonth=0;state.calYear++;}if(state.calMonth<0){state.calMonth=11;state.calYear--;}renderCalendar();}

/* JOBS */
function renderJobs(){
  let jobs=[...state.jobs].sort((a,b)=>b.date.localeCompare(a.date));
  if(jobFilter==='today')jobs=jobs.filter(j=>j.date===todayStr);
  else if(jobFilter==='unpaid')jobs=jobs.filter(j=>!j.paid&&j.status!=='rescheduled');
  else if(jobFilter==='paid')jobs=jobs.filter(j=>j.paid);
  else if(jobFilter==='rain')jobs=jobs.filter(j=>j.status==='rescheduled'||j.rainfrom);
  const tbody=document.getElementById('jobs-tbody');
  if(!jobs.length){tbody.innerHTML='<tr><td colspan="6"><div class="empty-state">No jobs found</div></td></tr>';return;}
  tbody.innerHTML=jobs.map(j=>{
    const c=getC(j.customerId),cr=getCrew(j.crewId);
    const crDot=`<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${cr.color||'#999'};flex-shrink:0"></span>${cr.name||'—'}</span>`;
    const badge=j.status==='rescheduled'?'<span class="pill rain">Raincheck</span>':j.rainfrom?'<span class="pill rain">Rescheduled</span>':j.paid?'<span class="pill paid">Paid</span>':'<span class="pill unpaid">Unpaid</span>';
    const payBtn=j.status==='rescheduled'?'':j.paid?`<button class="btn sm" onclick="togglePaid(${j.id})">Unpaid</button>`:`<button class="btn primary sm" onclick="togglePaid(${j.id})">Mark paid</button>`;
    const rainBtn=!j.rescheduled&&!j.paid?`<button class="btn rain sm" onclick="openRaincheck(${j.id})"><i class="ti ti-cloud-rain"></i></button>`:'';
    const delBtn=`<button class="icon-btn del" onclick="deleteJob(${j.id})" title="Delete"><i class="ti ti-trash" style="font-size:13px"></i></button>`;
    return `<tr><td style="color:var(--text-secondary)">${j.date}${j.rainfrom?'<div style="font-size:10px;color:var(--text-accent)">↪ from '+j.rainfrom+'</div>':''}</td><td style="font-weight:500;cursor:pointer;color:var(--text-accent)" onclick="openDrawer(${j.customerId})">${c.name||'—'}</td><td>${crDot}</td><td>$${j.amount.toFixed(2)}</td><td>${badge}</td><td style="display:flex;gap:4px;align-items:center">${payBtn}${rainBtn}${delBtn}</td></tr>`;
  }).join('');
}
function togglePaid(id){const j=state.jobs.find(x=>x.id===id);if(!j)return;const c=state.customers.find(x=>x.id===j.customerId);if(j.paid){j.paid=false;if(c)c.totalPaid=Math.max(0,c.totalPaid-j.amount);}else{j.paid=true;j.status='complete';if(c)c.totalPaid+=j.amount;}renderJobs();renderCalStats();}
function deleteJob(id){if(!confirm('Delete this job?'))return;state.jobs=state.jobs.filter(j=>j.id!==id);renderJobs();renderCalendar();}
function filterJobs(f,el){jobFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');renderJobs();}

/* CUSTOMERS */
function renderCustomers(){
  const tbody=document.getElementById('customers-tbody');
  if(!state.customers.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty-state">No customers yet.</div></td></tr>';return;}
  tbody.innerHTML=state.customers.map(c=>`<tr><td style="font-weight:500;cursor:pointer;color:var(--text-accent)" onclick="openDrawer(${c.id})">${c.name}</td><td style="color:var(--text-secondary)">${c.address}</td><td><span class="pill complete" style="font-size:11px">${c.frequency}</span></td><td style="font-weight:500">$${c.rate.toFixed(2)}</td><td><button class="icon-btn" onclick="openDrawer(${c.id})"><i class="ti ti-chevron-right" style="font-size:15px"></i></button></td></tr>`).join('');
}
function openDrawer(cid){
  const c=state.customers.find(x=>x.id===cid);if(!c)return;
  const cJobs=state.jobs.filter(j=>j.customerId===cid&&j.status!=='rescheduled').sort((a,b)=>b.date.localeCompare(a.date));
  const unpaid=cJobs.filter(j=>!j.paid).reduce((s,j)=>s+j.amount,0);
  const jobsHtml=cJobs.slice(0,5).map(j=>{const btn=j.paid?`<button class="btn sm" onclick="togglePaid(${j.id});openDrawer(${cid})">Undo</button>`:`<button class="btn primary sm" onclick="togglePaid(${j.id});openDrawer(${cid})">Mark paid</button>`;const badge=j.paid?'<span class="pill paid" style="font-size:10px">Paid</span>':'<span class="pill unpaid" style="font-size:10px">Unpaid</span>';return `<div class="mini-job"><span style="color:var(--text-secondary);flex-shrink:0">${j.date}</span><span style="flex:1;text-align:center">$${j.amount.toFixed(2)}</span>${badge}${btn}</div>`;}).join('')||'<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No jobs yet</div>';
  document.getElementById('drawer-content').innerHTML=`<div class="drawer-avatar">${initials(c.name)}</div><div class="drawer-name">${c.name}</div><div class="drawer-sub"><i class="ti ti-map-pin" style="font-size:12px;vertical-align:-1px"></i> ${c.address}</div><div class="total-box"><div><div class="lbl">Total paid</div><div class="val" style="color:var(--text-success)">$${c.totalPaid.toFixed(2)}</div></div><div style="text-align:right"><div class="lbl">Balance due</div><div class="val ${unpaid>0?'bal-red':'bal-ok'}">$${unpaid.toFixed(2)}</div></div></div><div class="drawer-section"><div class="drawer-section-title">Details</div><div class="detail-row"><span class="detail-label">Frequency</span><span class="pill complete" style="font-size:11px">${c.frequency}</span></div><div class="detail-row"><span class="detail-label">Rate per visit</span><span style="font-weight:500">$${c.rate.toFixed(2)}</span></div>${c.prefDays?`<div class="detail-row"><span class="detail-label">Pref. days</span><span style="font-weight:500;font-size:12px">${c.prefDays}</span></div>`:''} ${c.prefTime?`<div class="detail-row"><span class="detail-label">Pref. time</span><span style="font-weight:500;font-size:12px">${c.prefTime}</span></div>`:''} ${c.prefNotes?`<div style="margin-top:8px"><div class="doc-notes">${c.prefNotes}</div></div>`:''}</div><div class="drawer-section"><div class="drawer-section-title">Recent jobs</div>${jobsHtml}</div><button class="drawer-del" onclick="deleteCustomer(${cid})"><i class="ti ti-trash" style="font-size:12px;vertical-align:-1px"></i> Remove customer</button>`;
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('customer-drawer').classList.add('open');
}
function closeDrawer(){document.getElementById('drawer-overlay').classList.remove('open');document.getElementById('customer-drawer').classList.remove('open');}
function deleteCustomer(cid){state.customers=state.customers.filter(c=>c.id!==cid);state.jobs=state.jobs.filter(j=>j.customerId!==cid);closeDrawer();renderCustomers();renderCalStats();}

/* CREW */
function renderCrewMgmt(){
  const crewOnly=state.crew.filter(c=>c.role==='crew');
  const grid=document.getElementById('crew-grid');
  if(!crewOnly.length){grid.innerHTML='<div class="empty-state" style="grid-column:span 2"><i class="ti ti-users-group"></i>No crew leaders yet. Add one to get started.</div>';return;}
  grid.innerHTML=crewOnly.map(c=>{const tc=state.jobs.filter(j=>j.crewId===c.id&&j.date===todayStr&&j.status!=='rescheduled').length,tot=state.jobs.filter(j=>j.crewId===c.id).length;return `<div class="crew-card"><div class="crew-card-top"><div class="crew-card-avatar" style="background:${c.color}">${initials(c.name)}</div><div><div class="crew-card-name">${c.name}</div><div class="crew-card-pin">PIN: ${'•'.repeat(c.pin.length)}</div></div></div><div class="crew-card-stat"><i class="ti ti-sun" style="font-size:12px"></i> ${tc} job${tc!==1?'s':''} today</div><div class="crew-card-stat"><i class="ti ti-clipboard-list" style="font-size:12px"></i> ${tot} total jobs</div><button class="crew-del" onclick="deleteCrew(${c.id})"><i class="ti ti-trash" style="font-size:12px"></i> Remove</button></div>`;}).join('');
}
function deleteCrew(id){state.crew=state.crew.filter(c=>c.id!==id);state.jobs.forEach(j=>{if(j.crewId===id)j.crewId=null;});renderCrewMgmt();renderProfileGrid();}

/* RAINCHECK */
function openRaincheck(jobId){const j=state.jobs.find(x=>x.id===jobId);if(!j)return;rainJobId=jobId;document.getElementById('rain-cust-name').textContent=getC(j.customerId).name||'—';document.getElementById('rain-orig-date').textContent=j.date;document.getElementById('rain-new-date').value=addDays(j.date,3);openModal('modal-rain');}
function confirmRaincheck(){const j=state.jobs.find(x=>x.id===rainJobId);if(!j)return;const newDate=document.getElementById('rain-new-date').value;if(!newDate){alert('Please select a new date.');return;}j.status='rescheduled';state.jobs.push({id:Date.now(),customerId:j.customerId,crewId:j.crewId,date:newDate,status:'pending',paid:false,amount:j.amount,notes:'(Rescheduled due to weather)',rainfrom:j.date});closeModal('modal-rain');renderCrewToday();renderCalendar();renderJobs();}

/* ADD JOB */
function openAddJob(){document.getElementById('j-cust').innerHTML=state.customers.length?state.customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''):'<option value="">No customers yet</option>';document.getElementById('j-crew').innerHTML=state.crew.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');document.getElementById('j-date').value=todayStr;document.getElementById('j-notes').value='';prefillJobRate();openModal('modal-job');}
function prefillJobRate(){const cid=parseInt(document.getElementById('j-cust').value);const c=getC(cid);if(c.rate){document.getElementById('j-amount').value=c.rate.toFixed(2);document.getElementById('j-rate-hint').textContent=`Auto-filled: $${c.rate.toFixed(2)}/visit`;}}
function saveJob(){const cid=parseInt(document.getElementById('j-cust').value),crewId=parseInt(document.getElementById('j-crew').value),date=document.getElementById('j-date').value,amount=parseFloat(document.getElementById('j-amount').value)||0,notes=document.getElementById('j-notes').value;if(!date||!cid)return;state.jobs.push({id:Date.now(),customerId:cid,crewId,date,status:'pending',paid:false,amount,notes,rainfrom:null});closeModal('modal-job');renderCalendar();renderJobs();renderCrewToday();}

/* ADD CUSTOMER */
function openAddCustomer(){document.getElementById('c-name').value='';document.getElementById('c-addr').value='';document.getElementById('c-rate').value='50';openModal('modal-customer');}
function saveCustomer(){const name=document.getElementById('c-name').value.trim(),addr=document.getElementById('c-addr').value.trim();if(!name)return;state.customers.push({id:Date.now(),name,address:addr,frequency:document.getElementById('c-freq').value,rate:parseFloat(document.getElementById('c-rate').value)||0,totalPaid:0});closeModal('modal-customer');renderCustomers();}

/* ADD CREW */
function saveCrew(){const name=document.getElementById('cr-name').value.trim(),pin=String(document.getElementById('cr-pin').value).trim();if(!name||pin.length!==4){alert('Please enter a name and 4-digit PIN.');return;}state.crew.push({id:Date.now(),name,pin,role:'crew',color:COLORS[state.crew.length%COLORS.length]});closeModal('modal-crew');renderCrewMgmt();renderProfileGrid();}

/* ESTIMATE */
function updateRateDisplay(){const r=parseFloat(document.getElementById('e-rate').value)||0;document.getElementById('e-rate-display').textContent='$'+r.toFixed(2)+' / visit';}
function toggleChip(el){el.classList.toggle('sel');}
function getChips(id){return Array.from(document.querySelectorAll('#'+id+' .chip.sel')).map(c=>c.textContent).join(', ');}
function populateCrewSel(){document.getElementById('e-crew-sel').innerHTML=state.crew.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');}

function previewEstimate(){
  const fname=document.getElementById('e-fname').value.trim(),addr=document.getElementById('e-addr').value.trim(),rate=parseFloat(document.getElementById('e-rate').value)||0;
  if(!fname||!addr||!rate){alert('Please fill in customer name, address, and rate.');return;}
  const estNum='EST-'+String(state.estimates.length+1).padStart(4,'0');
  currentEstimate={estNum,created:todayFmt,status:'pending',fname,lname:document.getElementById('e-lname').value.trim(),addr,phone:document.getElementById('e-phone').value.trim(),email:document.getElementById('e-email').value.trim(),service:document.getElementById('e-service').value,freq:document.getElementById('e-freq').value,rate,start:document.getElementById('e-start').value,crewId:parseInt(document.getElementById('e-crew-sel').value),prefDays:getChips('e-day-chips'),prefTime:getChips('e-time-chips'),prefNotes:document.getElementById('e-pref-notes').value.trim(),notes:document.getElementById('e-notes').value.trim(),invoiceId:null};
  document.getElementById('sig-email').value=currentEstimate.email;
  renderDoc('est-preview-doc',currentEstimate,'ESTIMATE');
  go('s-estimate-sign');
  initSigPad();
}

function renderDoc(targetId,c,type){
  const prefSection=buildPrefSection(c);
  const notesHtml=c.notes?`<div class="doc-section"><div class="doc-section-title">Notes</div><div class="doc-notes">${c.notes}</div></div>`:'';
  const invExtra=type==='INVOICE'?`<div class="doc-section"><div class="doc-section-title">Payment</div><div class="doc-row"><span class="lbl">Terms</span><span class="val">Due on completion of each visit</span></div><div class="doc-row"><span class="lbl">Status</span><span class="val"><span class="pill ${c.payStatus}">${c.payStatus==='paid'?'Paid':'Unpaid'}</span></span></div></div>${c.payStatus==='paid'?`<div class="inv-paid-box"><span class="lbl">Paid in full</span><span class="val">$${c.rate.toFixed(2)}</span></div>`:`<div class="inv-total"><span class="lbl">Amount due</span><span class="val">$${c.rate.toFixed(2)}</span></div>`}`:'';
  document.getElementById(targetId).innerHTML=`<div class="doc-hdr"><div class="doc-hdr-top"><div class="doc-biz">${bizName}</div><div style="text-align:right"><div class="doc-lbl">${type}</div><div class="doc-num">${c.estNum||c.invNum}</div></div></div><div class="doc-date">Issued ${c.created}</div></div><div class="doc-body"><div class="doc-section"><div class="doc-section-title">Customer</div><div class="doc-row"><span class="lbl">Name</span><span class="val">${c.fname} ${c.lname}</span></div><div class="doc-row"><span class="lbl">Address</span><span class="val">${c.addr}</span></div>${c.phone?`<div class="doc-row"><span class="lbl">Phone</span><span class="val">${c.phone}</span></div>`:''}${c.email?`<div class="doc-row"><span class="lbl">Email</span><span class="val">${c.email}</span></div>`:''}</div><div class="doc-section"><div class="doc-section-title">Service</div><div class="doc-row"><span class="lbl">Type</span><span class="val">${c.service}</span></div><div class="doc-row"><span class="lbl">Frequency</span><span class="val">${c.freq}</span></div>${c.start?`<div class="doc-row"><span class="lbl">Start date</span><span class="val">${c.start}</span></div>`:''}<div class="doc-row"><span class="lbl">Rate per visit</span><span class="val" style="color:var(--text-accent);font-size:15px">$${c.rate.toFixed(2)}</span></div></div>${prefSection}${notesHtml}${invExtra}</div>`;
}

function buildPrefSection(c){const rows=[];if(c.prefDays)rows.push(`<div class="doc-row"><span class="lbl">Preferred days</span><span class="val">${c.prefDays}</span></div>`);if(c.prefTime)rows.push(`<div class="doc-row"><span class="lbl">Preferred time</span><span class="val">${c.prefTime}</span></div>`);const n=c.prefNotes?`<div class="doc-notes" style="margin-top:6px">${c.prefNotes}</div>`:'';if(!rows.length&&!c.prefNotes)return '';return `<div class="doc-section"><div class="doc-section-title">Scheduling preferences</div>${rows.join('')}${n}</div>`;}

function initSigPad(){
  const canvas=document.getElementById('sig-canvas'),ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth*(window.devicePixelRatio||1);canvas.height=130*(window.devicePixelRatio||1);
  ctx.scale(window.devicePixelRatio||1,window.devicePixelRatio||1);
  ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  sigHasMark=false;updateSigStatus();
  function pos(e){const r=canvas.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};}
  function start(e){e.preventDefault();isDrawing=true;const p=pos(e);lastX=p.x;lastY=p.y;}
  function draw(e){e.preventDefault();if(!isDrawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(p.x,p.y);ctx.stroke();lastX=p.x;lastY=p.y;if(!sigHasMark){sigHasMark=true;document.getElementById('sig-placeholder').style.display='none';updateSigStatus();}}
  function end(){isDrawing=false;}
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',draw);canvas.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',draw,{passive:false});canvas.addEventListener('touchend',end);
}
function updateSigStatus(){const btn=document.getElementById('accept-btn'),status=document.getElementById('sig-status');if(sigHasMark){status.textContent='Signed';status.style.color='var(--text-success)';btn.disabled=false;}else{status.textContent='Not yet signed';status.style.color='var(--text-muted)';btn.disabled=true;}}
function clearSig(){const canvas=document.getElementById('sig-canvas');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);sigHasMark=false;document.getElementById('sig-placeholder').style.display='block';updateSigStatus();}

function signEstimate(){
  const email=document.getElementById('sig-email').value.trim()||currentEstimate.email;
  currentEstimate.status='signed';currentEstimate.email=email;
  const invNum='INV-'+String(state.invoices.length+1).padStart(4,'0');
  const inv={...currentEstimate,invNum,payStatus:'unpaid',created:todayFmt};
  state.invoices.push(inv);currentEstimate.invoiceId=invNum;state.estimates.push({...currentEstimate});
  const exists=state.customers.find(c=>c.name.toLowerCase()===(currentEstimate.fname+' '+currentEstimate.lname).toLowerCase());
  if(!exists)state.customers.push({id:Date.now(),name:currentEstimate.fname+' '+currentEstimate.lname,address:currentEstimate.addr,frequency:currentEstimate.freq,rate:currentEstimate.rate,totalPaid:0,prefDays:currentEstimate.prefDays,prefTime:currentEstimate.prefTime,prefNotes:currentEstimate.prefNotes});
  currentInvId=invNum;
  document.getElementById('signed-email').textContent=email;
  go('s-signed');
}

function viewLatestInvoice(){const inv=state.invoices.find(i=>i.invNum===currentInvId);if(inv)openInvoiceDetail(inv);}
function openInvoiceDetail(inv){
  currentInvId=inv.invNum;renderDoc('inv-detail-doc',inv,'INVOICE');
  const el=document.getElementById('inv-detail-actions');
  el.innerHTML=inv.payStatus==='paid'?`<div class="tag green"><i class="ti ti-check"></i> Paid in full</div><button class="btn sm" onclick="toggleInvPaid('${inv.invNum}')">Mark unpaid</button>`:`<button class="btn success" onclick="toggleInvPaid('${inv.invNum}')"><i class="ti ti-check"></i> Mark as paid</button>`;
  go('s-invoice-detail');
}
function toggleInvPaid(invNum){const inv=state.invoices.find(i=>i.invNum===invNum);if(!inv)return;inv.payStatus=inv.payStatus==='paid'?'unpaid':'paid';openInvoiceDetail(inv);}

function renderEstList(){
  const el=document.getElementById('est-list-container');
  if(!state.estimates.length){el.innerHTML='<div class="empty-state"><i class="ti ti-file-description"></i>No estimates yet.</div>';return;}
  el.innerHTML=state.estimates.map(e=>`<div class="list-item"><div class="list-left"><div class="list-name">${e.fname} ${e.lname}</div><div class="list-meta">${e.service} · ${e.freq} · ${e.addr}</div>${e.prefDays?`<div class="list-meta" style="margin-top:2px"><i class="ti ti-calendar" style="font-size:11px"></i> ${e.prefDays}${e.prefTime?' · '+e.prefTime:''}</div>`:''} ${e.invoiceId?`<div class="list-meta" style="color:var(--text-accent);margin-top:2px"><i class="ti ti-receipt" style="font-size:11px"></i> ${e.invoiceId} auto-generated</div>`:''}</div><div class="list-right"><div class="list-amt">$${e.rate.toFixed(2)}/visit</div><div style="margin-top:4px"><span class="pill ${e.status}">${e.status==='signed'?'Signed':'Pending'}</span></div></div></div>`).join('');
}

function renderInvList(){
  const el=document.getElementById('inv-list-container');
  if(!state.invoices.length){el.innerHTML='<div class="empty-state"><i class="ti ti-receipt"></i>Invoices appear here after an estimate is signed.</div>';return;}
  el.innerHTML=state.invoices.map((inv,idx)=>`<div class="list-item" onclick="openInvoiceDetail(state.invoices[${idx}])"><div class="list-left"><div class="list-name">${inv.fname} ${inv.lname}</div><div class="list-meta">${inv.invNum} · from ${inv.estNum} · ${inv.service}</div><div class="list-meta" style="color:var(--text-accent);margin-top:2px"><i class="ti ti-bolt" style="font-size:11px"></i> Auto-generated on signing</div></div><div class="list-right"><div class="list-amt">$${inv.rate.toFixed(2)}</div><div style="margin-top:4px"><span class="pill ${inv.payStatus}">${inv.payStatus==='paid'?'Paid':'Unpaid'}</span></div></div></div>`).join('');
}

/* MODALS */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

/* INIT */
document.getElementById('e-start').value=todayStr;
