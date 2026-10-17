(function(){
 const $=id=>document.getElementById(id);
 let client=null,user=null,profile=null,regions=[],houses=[],history=[],toastSequence=0;
 const fmt=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 function notify(title,text,type='info',duration=4200){
  const region=$('toastRegion');if(!region)return;
  const icons={success:'✓',error:'!',warning:'⚠',info:'i'};const id='toast-'+(++toastSequence);
  const node=document.createElement('div');node.id=id;node.className='toast '+type;node.setAttribute('role',type==='error'?'alert':'status');
  const icon=document.createElement('div');icon.className='toast-icon';icon.textContent=icons[type]||icons.info;
  const content=document.createElement('div');const heading=document.createElement('div');heading.className='toast-title';heading.textContent=title;const body=document.createElement('div');body.className='toast-text';body.textContent=text;content.append(heading,body);
  const close=document.createElement('button');close.type='button';close.className='toast-close';close.setAttribute('aria-label','Tutup notifikasi');close.textContent='×';
  const dismiss=()=>{if(!node.isConnected)return;node.classList.add('leaving');setTimeout(()=>node.remove(),260);};close.addEventListener('click',dismiss);node.append(icon,content,close);region.appendChild(node);while(region.children.length>4)region.firstElementChild.remove();if(duration>0)setTimeout(dismiss,duration);
 }
 function message(id,text,kind=''){const el=$(id);el.textContent=text;el.className=(id==='formMessage'?'message ':'')+kind+' flash';if(kind==='ok')notify('Berhasil',text,'success');else if(kind==='bad')notify('Perlu diperiksa',text,'error');else if(text&&id==='formMessage')notify('Memproses',text,'info',1800);}
 function periodRange(){const value=$('historyMonth').value||today().slice(0,7);const [y,m]=value.split('-').map(Number);const week=$('historyWeek').value;let start=`${value}-01`,end=new Date(y,m,0).getDate();if(week!=='all'){const w=Number(week);start=`${value}-${String((w-1)*7+1).padStart(2,'0')}`;end=Math.min(w*7,end);}return {start,end:`${value}-${String(end).padStart(2,'0')}`,month:value,week};}
 function escape(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
 function showApp(){$('loginPanel').classList.add('hidden');$('appPanel').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');$('helloName').textContent=profile?.nama||user?.email||'Petugas';}
 function showLogin(){$('loginPanel').classList.remove('hidden');$('appPanel').classList.add('hidden');$('logoutBtn').classList.add('hidden');}
 async function loadAssignedData(){
  const {data:assignments,error:ae}=await client.from('iuran_petugas_wilayah').select('wilayah_id').eq('petugas_id',user.id).eq('aktif',true);
  if(ae)throw ae;if(!assignments?.length)throw new Error('Akun Anda belum ditugaskan ke wilayah. Hubungi admin RT.');
  const ids=[...new Set(assignments.map(x=>x.wilayah_id))];
  const [wr,hr]=await Promise.all([
   client.from('iuran_wilayah').select('id,nama').in('id',ids).eq('aktif',true).order('nama'),
   client.from('iuran_rumah').select('id,kode_rumah,nama_rumah,alamat,wilayah_id,aktif').in('wilayah_id',ids).eq('aktif',true).order('kode_rumah')
  ]);
  if(wr.error)throw wr.error;if(hr.error)throw hr.error;
  regions=wr.data||[];const validIds=new Set(regions.map(x=>x.id));houses=(hr.data||[]).filter(h=>validIds.has(h.wilayah_id));
  $('regionSelect').innerHTML=regions.map(r=>`<option value="${escape(r.id)}">${escape(r.nama)}</option>`).join('');
  $('regionName').textContent=regions.map(r=>r.nama).join(' · ');
  fillHouses();await loadHistory();
 }
 function fillHouses(){
  const rid=$('regionSelect').value;const list=houses.filter(h=>h.wilayah_id===rid);
  $('houseSelect').innerHTML=list.length?'<option value="">Pilih rumah / kotak iuran…</option>'+list.map(h=>`<option value="${escape(h.id)}">${escape(h.kode_rumah)} — ${escape(h.nama_rumah)} · ${escape(h.alamat)}</option>`).join(''):'<option value="">Belum ada rumah/kotak di wilayah ini</option>';
  $('selectedHouse').classList.add('hidden');
 }
 async function loadHistory(){
  const range=periodRange();
  let query=client.from('iuran_transaksi').select('id,warga_id,rumah_id,wilayah_id,tanggal,nominal,catatan,created_at').eq('petugas_id',user.id).gte('tanggal',range.start).lte('tanggal',range.end).order('tanggal',{ascending:false}).order('created_at',{ascending:false}).limit(250);
  const {data,error}=await query;if(error)throw error;history=data||[];
  const houseById=new Map(houses.map(h=>[String(h.id),h]));
  const legacyIds=[...new Set(history.filter(t=>!t.rumah_id&&t.warga_id).map(t=>t.warga_id))];let legacy=[];
  if(legacyIds.length){const old=await client.from('warga').select('id,nama,alamat').in('id',legacyIds);if(!old.error)legacy=old.data||[];}
  const oldById=new Map(legacy.map(w=>[String(w.id),w]));
  $('history').innerHTML=history.length?history.map(t=>{
   const h=t.rumah_id?houseById.get(String(t.rumah_id)):null;const w=t.warga_id?oldById.get(String(t.warga_id)):null;
   const title=h?`${h.kode_rumah} — ${h.nama_rumah}`:(w?.nama||'Transaksi lama (warga)');
   const address=h?.alamat||w?.alamat||'';
   return `<div class="history-item"><div><b>${escape(title)}</b><small>${escape(t.tanggal)}${address?' · '+escape(address):''}${t.catatan?' · '+escape(t.catatan):''}</small></div><div class="history-amount">${fmt(t.nominal)}</div></div>`;
  }).join(''):'<p class="muted">Belum ada transaksi pada periode ini.</p>';
  $('periodLabel').textContent=`${range.month} · ${range.week==='all'?'Semua minggu':'Minggu ke-'+range.week}`;
  $('periodTotal').textContent=fmt(history.reduce((n,x)=>n+Number(x.nominal),0));
  const {data:todayRows,error:todayError}=await client.from('iuran_transaksi').select('id,nominal').eq('petugas_id',user.id).eq('tanggal',today());
  if(todayError)throw todayError;$('todayCount').textContent=(todayRows||[]).length;$('todayTotal').textContent=fmt((todayRows||[]).reduce((n,x)=>n+Number(x.nominal),0));
 }
 async function afterLogin(){
  const {data,error}=await client.auth.getUser();if(error)throw error;if(!data.user){showLogin();return;}
  user=data.user;const pr=await client.from('profiles').select('id,nama,email,role').eq('id',user.id).single();if(pr.error)throw pr.error;profile=pr.data;
  if(profile.role!=='petugas_iuran')throw new Error('Akun ini belum memiliki role Petugas Iuran. Minta admin mengatur hak akses.');
  showApp();await loadAssignedData();
 }
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const btn=e.submitter;btn.disabled=true;btn.textContent='Memeriksa…';try{const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await afterLogin();notify('Login berhasil','Selamat bertugas, '+(profile?.nama||user?.email||'Petugas')+'.','success');}catch(err){$('loginError').textContent=err.message||'Gagal login.';notify('Login gagal',err.message||'Periksa email dan kata sandi.','error',6000);await client.auth.signOut().catch(()=>{});showLogin();}finally{btn.disabled=false;btn.textContent='Masuk';}});
 $('logoutBtn').addEventListener('click',async()=>{try{await client.auth.signOut();user=null;profile=null;regions=[];houses=[];history=[];showLogin();notify('Berhasil keluar','Sesi petugas sudah diakhiri.','success');}catch(e){notify('Gagal keluar',e.message||'Silakan coba lagi.','error');}});
 $('regionSelect').addEventListener('change',fillHouses);
 $('houseSelect').addEventListener('change',()=>{const h=houses.find(x=>x.id===$('houseSelect').value);const box=$('selectedHouse');if(h){box.textContent=`Kotak dipilih: ${h.kode_rumah} · ${h.nama_rumah} · ${h.alamat}`;box.classList.remove('hidden');}else box.classList.add('hidden');});
 document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>$('amount').value=b.dataset.amount));
 $('refreshBtn').addEventListener('click',async()=>{const b=$('refreshBtn');b.disabled=true;try{await loadAssignedData();message('formMessage','Data rumah dan riwayat berhasil diperbarui.','ok');}catch(e){message('formMessage',e.message||String(e),'bad');}finally{b.disabled=false;}});
 $('historyMonth').addEventListener('change',async()=>{try{await loadHistory();}catch(e){notify('Gagal memuat riwayat',e.message||String(e),'error');}});
 $('historyWeek').addEventListener('change',async()=>{try{await loadHistory();}catch(e){notify('Gagal memuat riwayat',e.message||String(e),'error');}});
 $('entryForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('saveBtn');const rumah_id=$('houseSelect').value;const wilayah_id=$('regionSelect').value;const nominal=Number($('amount').value);
  if(!rumah_id||!wilayah_id||!Number.isFinite(nominal)||nominal<=0){message('formMessage','Pilih rumah/kotak dan masukkan nominal lebih dari Rp0.','bad');notify('Periksa data setoran','Pilih rumah/kotak dan masukkan nominal lebih dari Rp0.','warning');return;}
  const chosen=houses.find(h=>h.id===rumah_id);if(!chosen||chosen.wilayah_id!==wilayah_id){message('formMessage','Rumah/kotak tidak cocok dengan wilayah yang dipilih. Muat ulang data.','bad');notify('Wilayah tidak cocok','Rumah/kotak tidak cocok dengan wilayah yang dipilih. Muat ulang data.','warning');return;}
  btn.disabled=true;btn.textContent='Menyimpan…';message('formMessage','Mengirim transaksi ke database…');
  try{
   const payload={warga_id:null,rumah_id,wilayah_id,petugas_id:user.id,tanggal:$('date').value||today(),nominal,catatan:$('note').value.trim()||null,created_by:user.id};
   const {error}=await client.from('iuran_transaksi').insert(payload);if(error)throw error;
   message('formMessage',`Setoran ${fmt(nominal)} untuk ${chosen.kode_rumah} berhasil disimpan ke database.`,'ok');$('amount').value='';$('note').value='';$('houseSelect').value='';$('selectedHouse').classList.add('hidden');await loadHistory();
  }catch(err){console.error(err);message('formMessage','Belum berhasil tersimpan: '+(err.message||err)+'. Jangan menganggap setoran tercatat sampai pesan berhasil muncul.','bad');}
  finally{btn.disabled=false;btn.textContent='Simpan Setoran';}
 });
 async function boot(){try{client=window.supabase.createClient(window.IURAN_CONFIG.SUPABASE_URL,window.IURAN_CONFIG.SUPABASE_ANON_KEY);$('date').value=today();$('historyMonth').value=today().slice(0,7);$('historyWeek').value='all';const {data}=await client.auth.getSession();if(data.session){try{await afterLogin();}catch(e){message('loginError',e.message||String(e));notify('Tidak dapat membuka aplikasi',e.message||String(e),'error',6000);showLogin();}}}catch(e){$('loginError').textContent='Aplikasi gagal dimulai: '+(e.message||e);notify('Aplikasi gagal dimulai',e.message||String(e),'error',6000);}}
 if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}boot();
})();
