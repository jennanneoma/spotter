/* ui-meals.js: meal plans (what the coach sees and edits) and the exercise library page */
function weekTypes(c){const m=mondayOf(today());return Array.from({length:7},(_,i)=>{const inf=dayAt(c,addDays(m,i));return inf.day?(inf.day.rest?'rest':'train'):null})}
function weekStrip(c,sel,act,days){
  const types=weekTypes(c),ti=weekIdx(today());
  return `<div class="weekchips" role="tablist">${WK.map((w,i)=>{const n=days&&days[i]?days[i].meals.length:0;return `<button role="tab" aria-selected="${i===sel}" class="wchip ${i===sel?'on':''} ${i===ti?'today':''}" data-act="${act}" data-v="${i}"><span>${w}</span><b class="mono">${new Date(addDays(mondayOf(today()),i)+'T12:00').getDate()}</b><i class="${types[i]||''}">${types[i]==='train'?'TRAIN':types[i]==='rest'?'REST':''}</i></button>`}).join('')}</div>`;
}
// the coach's view of a client's meal plan, one day at a time
function coachMeals(c){
  const d=ui.mealDrafts[c.id];if(d)return mealEditor(c,d);
  if(!c.meals){
    const others=S.clients.filter(x=>x.coachId===c.coachId&&x.id!==c.id&&x.meals&&!x.archived);
    return `<div class="card hud empty"><h2>No meal plan yet</h2><p class="muted">Write one training-day menu and one rest-day menu, then copy them to the other days.</p><div class="btnrow"><button class="btn primary" data-act="new-meals">New meal plan</button>${others.map(o=>`<button class="btn" data-act="copy-meals" data-id="${o.id}">Copy ${esc(first(o.name))}'s week</button>`).join('')}</div></div>`;
  }
  const sel=ui.mealDay??weekIdx(today()),day=c.meals.days[sel],date=addDays(mondayOf(today()),sel),ticks=c.mealTicks[date]||{},tot=dayTotals(day);
  const eaten=day.meals.filter(m=>ticks[m.id]&&ticks[m.id].synced!==false);
  return `<div class="section-hd"><div><h2>Meal plan</h2></div><button class="btn primary" data-act="edit-meals">Edit week</button></div>
  ${weekStrip(c,sel,'meal-day',c.meals.days)}
  <div class="card hud"><div class="section-hd"><h3>${WKL[sel]}</h3>${date<=today()?`<span class="pill ${eaten.length===day.meals.length?'ok':''}">${eaten.length}/${day.meals.length} eaten</span>`:''}</div>${bar(tot.kcal,day.kcal,'Planned kcal')}${bar(tot.protein,day.protein,'Planned protein g')}</div>
  <div class="meals">${day.meals.map(m=>{const on=ticks[m.id]&&ticks[m.id].synced!==false,t=mealTotals(m);return `<div class="meal ${on?'on':''}"><span class="box">✓</span><span class="mb"><span class="mhead"><b>${esc(m.name)}${swappedMeal(c,date,m.id,'coach')?' <span class="pill warn">Swapped</span>':''}</b><small class="mono">${t.kcal} kcal · ${t.protein} g</small></span><ul>${m.foods.map(f=>`<li><span>${esc(f.food)}</span><span>${esc(f.portion)}</span></li>`).join('')}</ul></span></div>`}).join('')||'<p class="hint">No meals planned for this day.</p>'}</div>${mealXList(c,date,'coach')}`;
}
// editing a meal plan: meals and foods for each day, with copy to other days
function mealEditor(c,d){
  const sel=ui.mealDay??weekIdx(today()),day=d.days[sel],types=weekTypes(c),tot=dayTotals(day);
  const ty=types[sel];
  return `<section class="editor"><div><h2>${d.isNew?'New meal plan':'Edit meal plan'}</h2></div>
  ${weekStrip(c,sel,'meal-day',d.days)}
  <div class="card hud"><div class="section-hd"><h3>${WKL[sel]}${ty?` · ${ty==='train'?'training day':'rest day'}`:''}</h3><button class="icon-btn" data-act="clear-meal-day">Clear day</button></div>
    <div class="row2"><label>Calorie target<input id="mt-kcal" type="number" inputmode="numeric" data-mt="kcal" value="${day.kcal||''}" placeholder="optional"></label><label>Protein target (g)<input id="mt-pro" type="number" inputmode="numeric" data-mt="protein" value="${day.protein||''}" placeholder="optional"></label></div>
    <div id="meal-totals">${bar(tot.kcal,day.kcal,'Planned kcal')}${bar(tot.protein,day.protein,'Planned protein g')}</div>
    <div class="copyto"><span class="eyebrow">Copy ${WK[sel]} to</span><div class="btnrow">${ty?`<button class="btn sm" data-act="copy-meal-to" data-v="${ty}">All ${ty==='train'?'training':'rest'} days</button>`:''}<button class="btn sm" data-act="copy-meal-to" data-v="all">Every day</button><button class="btn sm" data-act="copy-meal-to" data-v="weekdays">Mon–Fri</button><button class="btn sm" data-act="copy-meal-to" data-v="weekend">Sat–Sun</button></div></div></div>
  ${day.meals.map(m=>`<section class="day mealed"><div class="day-hd"><input class="dayname" id="mn-${m.id}" data-mn="${m.id}" value="${esc(m.name)}" aria-label="Meal name"><button class="icon-btn" data-act="del-meal" data-meal="${m.id}">Remove</button></div>
    <div class="foodrow fhead"><span>Food</span><span>Portion</span><span>kcal</span><span>Protein g</span><span></span></div>
    ${m.foods.map(f=>{const a=`data-meal="${m.id}" data-food="${f.id}"`;return `<div class="foodrow"><input id="ff-${f.id}" data-ff="food" ${a} value="${esc(f.food)}" placeholder="Food" aria-label="Food"><input id="fp-${f.id}" data-ff="portion" ${a} value="${esc(f.portion)}" placeholder="Portion" aria-label="Portion"><input id="fk-${f.id}" class="mono" inputmode="numeric" data-ff="kcal" ${a} value="${f.kcal??''}" aria-label="Calories"><input id="fg-${f.id}" class="mono" inputmode="numeric" data-ff="protein" ${a} value="${f.protein??''}" aria-label="Protein grams"><button class="icon-btn" data-act="del-food" ${a} aria-label="Remove food">✕</button></div>`}).join('')}
    <button class="btn ghost sm" style="align-self:flex-start" data-act="add-food" data-meal="${m.id}">+ Food</button></section>`).join('')}
  <div class="adddays"><button class="btn" data-act="add-meal">+ Meal</button></div>
  <div class="savebar"><button class="btn ghost" data-act="discard-meals">Discard</button><button class="btn primary" data-act="save-meals">Save week</button></div></section>`;
}
// the exercise library: search, filter by muscle, add your own
function libraryView(){
  const mine=S.exercises.filter(e=>e.custom).length;
  return `<header class="hd"><h1>Exercises</h1><p class="sub">${S.exercises.length-mine} built in${mine?` · ${mine} of yours`:''}. Tap one to watch it.</p></header>
  <input type="search" id="lib-q" data-libsearch placeholder="Search exercises" value="${esc(ui.libQ)}" aria-label="Search exercises">
  <div class="chips">${['All',...GROUPS,'Yours'].map(g=>`<button class="chip ${ui.libGroup===g?'on':''}" data-act="lib-group" data-v="${g}">${g}</button>`).join('')}</div>
  <ul class="lib" id="lib-list">${libItems()}</ul>
  <form class="card hud" data-form="add-ex"><h2>Add your own exercise</h2>
    <label>Name<input id="ae-name" name="name" required placeholder="Landmine row"></label>
    <div class="row2"><label>Muscle group<select id="ae-group" name="group">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></label>
    <label>Animation (until you add a video)<select id="ae-like" name="like">${S.exercises.filter(e=>!e.custom).map(e=>`<option value="${e.id}">Like ${esc(e.name)}</option>`).join('')}</select></label></div>
    <label>Your own video (optional, under 3 MB)<input id="ae-video" type="file" name="video" accept="video/mp4,video/webm,video/quicktime"></label>
    <p class="hint">Short clips of 3 to 6 seconds work best.</p>
    <button class="btn primary">Add exercise</button></form>`;
}
function libItems(){
  const q=ui.libQ.trim().toLowerCase();
  const list=S.exercises.filter(e=>(ui.libGroup==='All'||(ui.libGroup==='Yours'?e.custom:e.group===ui.libGroup))&&(!q||e.name.toLowerCase().includes(q)));
  if(!list.length)return `<li class="hint">No exercises match. Add it below.</li>`;
  return list.map(e=>`<li><button data-act="preview-ex" data-id="${e.id}">${e.video?'<span class="vidbadge">VIDEO</span>':anim(e)}<span>${esc(e.name)}<small>${esc(e.group)}${e.custom?' · yours':''}</small></span></button></li>`).join('');
}
