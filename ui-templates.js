/* ui-templates.js: saved routines the coach can reuse.
   Build a week once, then start any new client from it and just tweak their weights. */
const TPL_CLIENT={id:'tpl',name:'your client',logs:[],plan:null,planHistory:[],readiness:{},weights:[],swapFeed:[]};
const tplKey=id=>'tpl:'+(id||'new');
const editingTemplate=()=>typeof ui.clientId==='string'&&ui.clientId.startsWith('tpl:')&&ui.drafts[ui.clientId];
function tplSummary(t){
  const train=t.days.map((d,i)=>d.rest?null:{i,d}).filter(Boolean);
  return{train,ex:t.days.reduce((n,d)=>n+d.exercises.length,0)};
}
function templatesView(co){
  const d=editingTemplate();if(d)return templateEditor(d);
  const list=S.templates.filter(x=>x.coachId===co.id);
  const clients=S.clients.filter(c=>c.coachId===co.id&&!c.archived);
  return `<header class="hd"><h1>Templates</h1></header>
  <button class="btn primary big" data-act="tpl-new">+ Create a template</button>
  ${list.length?`<ul class="tpllist">${list.map(t=>{const sm=tplSummary(t),open=ui.tplOpen===t.id,using=ui.tplUse===t.id,del=ui.tplDel===t.id;
    const strip=`<span class="tplstrip" aria-label="Training days: ${sm.train.map(x=>WKL[x.i]).join(', ')}">${t.days.map((x,i)=>`<i class="${x.rest?'':'on'}" title="${WKL[i]}: ${esc(dayTitle(x))}">${WK[i].slice(0,1)}</i>`).join('')}</span>`;
    const actions=del?`<div class="confirm-inline"><span class="bad-t">Delete “${esc(t.name)}”? Clients already using it keep their routine.</span><button class="btn danger sm" data-act="tpl-del" data-id="${t.id}">Delete</button><button class="btn ghost sm" data-act="tpl-del-ask" data-id="">Keep</button></div>`
      :using?`<div class="tpluse"><p class="eyebrow">Start which client from this template?</p>${clients.length?`<div class="btnrow">${clients.map(c=>`<button class="btn sm" data-act="tpl-apply" data-id="${t.id}" data-client="${c.id}">${esc(c.name)}${c.plan?' · replaces routine':''}</button>`).join('')}</div>`:'<p class="hint">No clients yet. Invite one from the Clients tab.</p>'}<button class="btn ghost sm" data-act="tpl-use" data-id="">Cancel</button></div>`
      :`<div class="tplactions"><button class="btn primary sm" data-act="tpl-use" data-id="${t.id}">Use for a client</button><button class="btn sm" data-act="tpl-edit" data-id="${t.id}">Edit</button><button class="btn sm" data-act="tpl-dup" data-id="${t.id}">Duplicate</button><button class="icon-btn" data-act="tpl-del-ask" data-id="${t.id}">Delete</button></div>`;
    return `<li class="tplrow ${open?'open':''}"><button class="tplhead" data-act="tpl-open" data-id="${t.id}" aria-expanded="${open}"><span class="tplname"><b>${esc(t.name)}</b><small>${sm.train.length} day${sm.train.length===1?'':'s'} a week · ${sm.ex} exercises${t.desc?` · ${esc(t.desc)}`:''}</small></span>${strip}<span class="chev" aria-hidden="true">${open?'▴':'▾'}</span></button>
      ${open?`<div class="tplbody"><div class="weektable tplweek">${t.days.map((x,i)=>`<div class="wkrow ${x.rest?'rest':''}"><span class="wk mono">${WK[i].toUpperCase()}</span><span class="wt"><b>${esc(dayTitle(x))}</b>${x.rest?'':`<small>${x.exercises.length?x.exercises.map(r=>esc(exById(r.exId).name)).join(' · '):'No exercises yet'}</small>`}</span></div>`).join('')}</div>${actions}</div>`:''}
    </li>`}).join('')}</ul>`
  :`<div class="card hud empty"><h2>No templates yet</h2><p class="muted">Create one here, or save any client's routine as a template from their routine editor.</p></div>`}`;
}
function templateEditor(d){
  const t=d.days.filter(x=>!x.rest).length;
  return `<section class="editor"><button class="back" data-act="tpl-cancel">‹ Templates</button>
  <div><p class="eyebrow">${d.tplId?'Edit template':'New template'}</p><h2>${esc(d.name||'Untitled template')}</h2><p class="hint">Weights are optional here.</p></div>
  <div class="card hud"><label>Template name<input id="tpl-name" data-pf="name" value="${esc(d.name)}" placeholder="e.g. Beginner full body" maxlength="60"></label>
  <label>Who it's for (optional)<input id="tpl-desc" data-pf="desc" value="${esc(d.desc||'')}" placeholder="e.g. New lifters, 3 days a week, dumbbells only" maxlength="100"></label>
  <p class="hint">${t} training day${t===1?'':'s'} a week, Monday to Sunday.</p></div>
  ${d.days.map((day,i)=>dayEditor(TPL_CLIENT,day,i)).join('')}
  <div class="savebar"><button class="btn ghost" data-act="tpl-cancel">Discard</button><button class="btn primary" data-act="tpl-save">Save template</button></div></section>`;
}
