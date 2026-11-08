'use strict';

const RISK = [
  {title:'Beobachten',detail:'Regelmäßige, ruhige Lagebeobachtung.',color:'#55b58f'},
  {title:'Erwägen',detail:'Alternativen prüfen, ohne Umzugsentscheidung.',color:'#8dbc79'},
  {title:'Konkret planen',detail:'Vorsorge- und Ausweichplan ausarbeiten.',color:'#cdbb66'},
  {title:'Vorbereiten',detail:'Praktische Voraussetzungen für einen Wechsel schaffen.',color:'#e59a56'},
  {title:'Umzug umsetzen',detail:'Temporäre oder dauerhafte Relokation ernsthaft durchführen.',color:'#d76e63'},
  {title:'Akut schützen',detail:'Unmittelbaren Schutz suchen; kein allgemeines politisches Stimmungsurteil.',color:'#bb4b67'}
];
const ICONS={
 institutionen:'<path d="m12 3 9 4-9 4-9-4 9-4Z"/><path d="M5 11v7m7-7v7m7-7v7M3 21h18"/>',
 macht:'<path d="M4 21h16M6 17v-6m6 6V7m6 10V4"/><path d="m3 8 4-4 4 4 4-5 6 5"/>',
 queer:'<path d="m12 21 9-10-9-8-9 8 9 10Z"/><path d="M4 11h16M12 3v18"/>',
 medizin:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
 gewalt:'<path d="m12 22 8-4V7l-8-4-8 4v11l8 4Z"/><path d="M12 8v5m0 4h.01"/>',
 targeting:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
 ueberwachung:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 existenz:'<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
 community:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-3 2.5-5 6-5s6 2 6 5v2"/><path d="M17 5a3 3 0 0 1 0 6m2 3c2 1 3 2.5 3 5v1"/>',
 optionen:'<circle cx="12" cy="12" r="9"/><path d="m12 3 4 9-4 9-4-9 4-9ZM3 12h18"/>'
};
const $=id=>document.getElementById(id);
let assessment=null;
let monitor=null;
let activeFilter='all';
let searchTerm='';
let toastTimer;
const dateLabel=s=>{if(!s) return 'Datum unbekannt';const d=new Date(/^\d{4}$/.test(s)?`${s}-01-01T12:00:00Z`:`${s}T12:00:00Z`);return Number.isNaN(d.getTime())?s:new Intl.DateTimeFormat('de-DE',{year:'numeric',month: /^\d{4}$/.test(s)?undefined:'long',day: /^\d{4}$/.test(s)?undefined:'numeric'}).format(d)};
function esc(value){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function safeUrl(url){try{const u=new URL(url);return /^https:$/.test(u.protocol) ?u.href:'about:blank'}catch{return 'about:blank'}}
function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200)}
function renderScale(level){$('main-scale').innerHTML=RISK.map((r,i)=>`<div class="scale-step ${level===i?'current':''}" style="background:${r.color}" title="Stufe ${i}: ${r.title}"></div>`).join('');}
function renderOverall(data){
 const l=data.overall.level,meta=RISK[l];
 $('overall-number').textContent=Number.isInteger(l)?l:'—';
 $('overall-number').style.color=meta?.color||'#aabbc2';
 $('overall-title').textContent=data.overall.title;
 $('overall-subtitle').textContent=meta?.detail||'Keine aktuelle Stufe';
 $('assessment-confidence').textContent='Evidenzsicherheit: '+data.overall.confidence;
 $('overall-summary').textContent=data.overall.summary;
 $('overall-protective').textContent=data.overall.protective;
 $('assessment-limitation').textContent=data.overall.limitation;
 $('evaluated-date').textContent='Bewertungsstand: '+dateLabel(data.evaluatedAt);
 $('source-count').textContent=data.sources.length+' dokumentierte Quellen';
 $('footer-updated').textContent='Letzte redaktionelle Bewertung: '+dateLabel(data.evaluatedAt);
 renderScale(l);
}
function sourceLinks(ids){const sourceMap=new Map(assessment.sources.map(x=>[x.id,x]));return ids.map(id=>sourceMap.get(id)).filter(Boolean).map(s=>`<a class="source-link" target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(s.url))}" title="${esc(s.title)} — ${esc(s.published)}">${esc(s.issuer)} <span aria-hidden="true">↗</span></a>`).join('');}
function meter(level){return level==null?'<span class="signal-legend">INDIVIDUELL</span>':`<div class="signal-meter" aria-label="Signalintensität ${level} von 5">${RISK.map((_,i)=>`<i class="${i<=level?'on':''}"></i>`).join('')}</div>`;}
function renderIndicator(item,n){
 const color=item.signal==null?'#70818b':RISK[Math.max(0,Math.min(item.signal,5))].color;
 return `<details class="indicator-card" id="indicator-${esc(item.id)}" style="--indicator-color:${color}">
 <summary><span class="indicator-order">${String(n+1).padStart(2,'0')}</span><span class="indicator-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[item.id]||ICONS.institutionen}</svg></span>
 <span class="indicator-content"><span class="indicator-title">${esc(item.title)}</span><span class="indicator-subtitle">${esc(item.strap)}</span></span>
 <span class="signal-side"><span class="signal-badge"><span class="signal-dot" style="background:${color}"></span>${esc(item.status)}</span>${meter(item.signal)}<span class="indicator-chevron" aria-hidden="true">+</span></span></summary>
 <div class="indicator-details"><div class="detail-overview">
 <div class="detail-block"><h4>Was bedeutet der Indikator?</h4><p>${esc(item.what)}</p></div>
 <div class="detail-block"><h4>Aktueller Stand · ${esc(dateLabel(item.reviewed))}</h4><p>${esc(item.current)}</p></div>
 <div class="detail-block"><h4>Mögliche Entwicklung</h4><p>${esc(item.future)}</p></div>
 <div class="detail-block"><h4>Was dagegen schützt</h4><p>${esc(item.protection)}</p></div>
 </div><div class="detail-threshold"><div><h4>Eskalationsschwelle</h4><p>${esc(item.trigger)}</p></div><div><h4>Allein nicht ausreichend</h4><p>${esc(item.insufficient)}</p></div></div>
 <div class="indicator-footer"><div class="sources-row">${sourceLinks(item.sources)}</div><span class="review-date">Evidenz: ${esc(item.confidence)} · redaktionell ${esc(dateLabel(item.reviewed))}</span></div></div></details>`;
}
function renderIndicators(){if(!assessment)return;
 const openIds=new Set([...document.querySelectorAll('.indicator-card[open]')].map(el=>el.id));
 const list=assessment.indicators.filter(i=>(activeFilter==='all'||i.category===activeFilter)&&(i.title+' '+i.strap+' '+i.what+' '+i.current).toLocaleLowerCase('de').includes(searchTerm));
 $('indicator-count').textContent=`${list.length} von ${assessment.indicators.length} Indikatoren · Signalstärke ist nicht gleich Handlungsstufe`;
 const position=new Map(assessment.indicators.map((v,i)=>[v.id,i]));
 $('indicator-list').innerHTML=list.length?list.map(i=>renderIndicator(i,position.get(i.id))).join(''):'<div class="empty-results">Keine Indikatoren für diese Auswahl.</div>';
 for (const id of openIds){const target=$(id);if(target)target.open=true}
}
function renderHistory(data){
 const rows=data.history;const w=570,h=210,padX=43,padY=20,plotW=w-2*padX,plotH=h-2*padY;
 if(!rows.length){$('history-chart').textContent='Keine geprüften Verlaufswerte.';return}
 const x=index=>rows.length===1?w/2:padX+index*plotW/(rows.length-1);
 const y=level=>padY+(5-level)/5*plotH;
 const coords=rows.map((r,i)=>`${x(i)},${y(r.level)}`).join(' ');
 $('history-chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Geprüfte Verlaufswerte: ${rows.map(r=>`${r.date} Stufe ${r.level}`).join('; ')}">${[0,1,2,3,4,5].map(v=>`<line class="chart-axis" x1="${padX}" x2="${w-padX}" y1="${y(v)}" y2="${y(v)}"/><text class="chart-label" x="${padX-16}" y="${y(v)+4}">${v}</text>`).join('')}<polyline class="chart-line" points="${coords}"/>${rows.map((r,i)=>`<circle class="chart-point" cx="${x(i)}" cy="${y(r.level)}" r="6"/><text class="chart-label" text-anchor="middle" x="${x(i)}" y="${h-1}">${esc(r.date.slice(0,7))}</text>`).join('')}</svg>`;
 $('history-events').innerHTML=rows.map(r=>`<div class="event-item"><span class="event-date">${esc(r.date)}</span><div><div class="event-title">${esc(r.title)} · Stufe ${r.level}</div><div class="event-description">${esc(r.description)}</div></div></div>`).join('');
}
function renderLevels(){
 $('level-explanations').innerHTML=RISK.map((r,i)=>`<div class="level-explanation"><span class="level-explanation-marker" style="background:${r.color}"></span><div><strong>Stufe ${i} · ${esc(r.title)}</strong><p>${esc(r.detail)}</p></div></div>`).join('')+'<p class="signal-legend">Die Stufen beschreiben mögliche Vorsorgehandlungen, nicht die mathematisch berechenbare Wahrscheinlichkeit einer Gefahr.</p>';
}
function renderMonitor(data){
 const status=$('monitor-light');status.classList.remove('ok','error');
 if(data.checkedAt){
   const ts=new Date(data.checkedAt);
   const stamp=Number.isNaN(ts.getTime())?data.checkedAt:new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(ts);
   $('monitor-title').textContent='Quellenautomatik: letzter Lauf '+stamp;
   $('monitor-description').textContent=`${data.checkedCount} Quellen geprüft · ${data.changedCount} Änderungen seit vorigem Lauf · ${data.errorCount} Zugriffsfehler. Fachliche Warnstufe bleibt bis zur redaktionellen Neubewertung unverändert.`;
   status.classList.add(data.errorCount>0?'error':'ok');
 }else{
   $('monitor-title').textContent='Quellenautomatik noch nicht gestartet';
   $('monitor-description').textContent='Die Automatik startet nach dem ersten GitHub-Actions-Lauf. Neue Funde werden gesondert und ungeprüft ausgewiesen.';
 }
 const evs=(data.events||[]).slice(0,15);
 $('monitor-events').innerHTML=evs.length?evs.map(e=>`<div class="update-item"><span class="update-date">${esc(e.detectedAt||'Prüfdatum unbekannt')}</span><br><span class="update-kind">${e.kind==='error'?'Zugriff fehlgeschlagen':'Quellenänderung · ungeprüft'}</span><strong>${esc(e.title)}</strong><p>${esc(e.note)}</p>${e.url?`<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">Originalquelle öffnen ↗</a>`:''}</div>`).join(''):'<p class="muted">Noch keine neuen Seitenänderungen erfasst. Das bedeutet nicht, dass sich politisch nichts verändert hat. Die Quellenauswahl und Prüfung sind begrenzt.</p>';
}
function validate(data){if(!data||data.schemaVersion!==1||!Array.isArray(data.indicators)||data.indicators.length!==10||!Array.isArray(data.sources))throw new Error('Die Bewertungsdaten sind unvollständig.');if(!Number.isInteger(data.overall?.level)||data.overall.level<0||data.overall.level>5)throw new Error('Ungültige Warnstufe.');return data}
async function loadData(announce=false){const btn=$('refresh-button');btn.classList.add('busy');btn.disabled=true;
 try{
  const bust=Date.now();const [a,m]=await Promise.all([fetch(`./data/assessment.json?v=${bust}`,{cache:'no-store'}),fetch(`./data/monitor.json?v=${bust}`,{cache:'no-store'})]);
  if(!a.ok)throw new Error('Bewertungsdatei nicht abrufbar (HTTP '+a.status+').');
  assessment=validate(await a.json());
  if(m.ok){monitor=await m.json()}else{monitor={checkedAt:null,events:[],checkedCount:0,changedCount:0,errorCount:1}};
  renderOverall(assessment);renderIndicators();renderHistory(assessment);renderLevels();renderMonitor(monitor);
  if(announce)notify('Veröffentlichte Daten neu geladen. Der Quellencheck läuft separat auf GitHub Actions.');
 }catch(err){console.error(err);$('monitor-title').textContent='Daten konnten nicht geladen werden';$('monitor-description').textContent=String(err.message)+ ' — Die Website muss über einen Webserver geöffnet werden.';$('monitor-light').classList.add('error');if(announce)notify('Aktualisierung nicht möglich: '+err.message)}
 finally{btn.classList.remove('busy');btn.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('#filter-buttons .chip').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('#filter-buttons .chip').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on))});renderIndicators()}));
 $('indicator-search').addEventListener('input',e=>{searchTerm=e.target.value.trim().toLocaleLowerCase('de');renderIndicators()});
 $('refresh-button').addEventListener('click',()=>loadData(true));
 loadData();
});
