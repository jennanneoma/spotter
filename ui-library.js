/* ui-library.js: the exercise library page (search, filter by muscle, add your own) */
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
    <label>Counted in<select id="ae-unit" name="unit"><option value="reps">Reps</option><option value="sec">Seconds</option><option value="min">Minutes</option></select></label></div>
    <label>Animation (until you add a video)<select id="ae-like" name="like">${S.exercises.filter(e=>!e.custom).map(e=>`<option value="${e.id}">Like ${esc(e.name)}</option>`).join('')}</select></label>
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
