(async () => {
  'use strict';
  await window.VeloBoot.ready;
  const hud=window.apexHud,P=window.ApexPreferences;
  if(!hud||!P)return;
  const game=typeof GetParentResourceName==='function',studio=document.body.classList.contains('studio'),host=hud.host;
  const labels={whole:'Painel inteiro',dial:'Mostrador / RPM',speed:'Velocidade',gear:'Marcha',fuel:'Combustível',temperature:'Temperatura',lamps:'Luzes de aviso',signals:'Setas / pisca-alerta',assist:'Assistências',secondary:'Condição do veículo',shift:'Shift lights',trip:'Viagem dentro do painel'};
  const clone=P.clone;
  let saved=P.defaults();
  if(!game){for(const key of [P.storageKey,'velo:editor:v2','apex:editor:v2']){try{const raw=localStorage.getItem(key);if(raw){saved=P.normalize(JSON.parse(raw));break;}}catch{}}}
  if(hud.preferencePayload)saved=P.normalize(hud.preferencePayload);
  const surfaces={},views={},roots={},parts={},metadata={};let catalog=[];
  const shiftHost=document.createElement('div');shiftHost.className='shift-position';shiftHost.hidden=true;
  const shiftParent=studio?document.getElementById('stage'):document.body;shiftParent.append(shiftHost);
  const shift=new window.ApexShiftLights(shiftHost);
  const tripHost=document.createElement('div');tripHost.className='velo-trip-host';tripHost.hidden=true;shiftParent.append(tripHost);
  let trip=null;
  let preferences=clone(saved),draft=null,opened=false,selected='whole',snapshot=null,latestMessage=null,lastFrame=null,busy=false,drag=null,closeRevision=0;
  let hostPlaceholder=null,hostStyle='',focusBefore=null;
  const historyLimit=60;let undoStack=[],redoStack=[],historyCurrent=null,gesture=null,importPreview=null,importRevision=0;
  const dialog=document.createElement('section');dialog.className='velo-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','velo-title');
  dialog.innerHTML=`<div class="editor-canvas" aria-label="Área de posicionamento"></div>
    <div class="editor-topline"><span>APEX <b>/</b> INSTRUMENT STUDIO</span><span>EDITOR AO VIVO</span></div>
    <aside class="editor-panel">
      <header><div><span class="editor-eyebrow">SEU PAINEL, DO SEU JEITO</span><h1 id="velo-title">Personalizar painel</h1></div><button type="button" id="velo-close" title="Cancelar e fechar (Esc)" aria-label="Fechar editor">×</button></header>
      <div class="editor-scroll">
        <div class="editor-history" aria-label="Histórico"><button type="button" id="velo-undo" title="Desfazer (Ctrl+Z)">↶ Desfazer</button><button type="button" id="velo-redo" title="Refazer (Ctrl+Shift+Z / Ctrl+Y)">↷ Refazer</button></div>
        <div class="editor-section"><label class="editor-check"><input id="velo-guides" type="checkbox" checked> Guias e grade</label><label class="editor-check"><input id="velo-snap" type="checkbox"> Alinhar à grade (Alt suspende)</label><p class="editor-hint">Grade: 5 px no componente, 1% na posição global. Alt + setas: 0,1 px.</p></div>
        <fieldset class="model-picker"><legend>Velocímetros instalados</legend></fieldset>
        <fieldset class="model-offers" hidden><legend>Mais velocímetros</legend><div class="offer-list"></div></fieldset>
        <div class="editor-section"><label for="velo-preset">Layouts</label><select id="velo-preset"><option value="">Escolher layout…</option></select><div class="editor-pair editor-actions"><button type="button" id="velo-preset-apply">Aplicar layout</button><button type="button" id="velo-preset-delete">Excluir preset</button></div><label for="velo-preset-name">Nome do seu preset</label><input id="velo-preset-name" type="text" maxlength="80" placeholder="Até 40 caracteres" autocomplete="off"><button type="button" class="editor-secondary" id="velo-preset-save">Guardar layout (até 8)</button><p class="editor-hint">Presets também são confirmados ao salvar o editor.</p></div>
        <div class="editor-section"><label for="velo-part">Componente</label><select id="velo-part"></select><p class="editor-hint">Arraste a moldura na tela. As setas do teclado fazem o ajuste fino.</p>
          <label class="editor-check"><input id="velo-locked" type="checkbox"> Bloquear este componente</label>
          <div class="editor-pair"><label>Posição X <small id="velo-pos-unit">%</small><input id="velo-x" type="number" step="1"></label><label>Posição Y<input id="velo-y" type="number" step="1"></label></div>
          <label class="editor-range-label" for="velo-scale">Tamanho <output id="velo-scale-value">100%</output></label><input id="velo-scale" type="range" min="50" max="160" value="100">
          <label class="editor-check" id="velo-part-visible-row"><input id="velo-part-visible" type="checkbox" checked> Mostrar este componente</label>
          <button type="button" class="editor-subtle" id="velo-reset-part">Restaurar este componente</button>
        </div>
        <div class="editor-section"><span class="editor-section-title">Cores do modelo</span><div class="editor-pair"><label class="editor-color"><input id="velo-accent" type="color">Faixa / ponteiro</label><label class="editor-color"><input id="velo-text" type="color">Números / texto</label></div></div>
        <div class="editor-section"><label class="editor-check editor-check-main"><input id="velo-shift-enabled" type="checkbox"> Ativar shift lights</label><p class="editor-hint">Verde → amarelo → vermelho. Posição independente do painel.</p>
          <label class="editor-range-label" for="velo-led-count">Quantidade de LEDs <output id="velo-led-count-value">12</output></label><input id="velo-led-count" type="range" min="4" max="24" step="1">
          <label class="editor-range-label" for="velo-start-rpm">Início da faixa RPM <output id="velo-start-rpm-value">25%</output></label><input id="velo-start-rpm" type="range" min="0" max="90" step="1">
          <label class="editor-range-label" for="velo-full-rpm">Todos acesos em RPM <output id="velo-full-rpm-value">95%</output></label><input id="velo-full-rpm" type="range" min="10" max="100" step="1">
          <label class="editor-range-label" for="velo-flash-hz">Frequência de flash <output id="velo-flash-hz-value">5 Hz</output></label><input id="velo-flash-hz" type="range" min="1" max="10" step="0.1">
          <div class="editor-led-colors"><label class="editor-color"><input id="velo-led-green" type="color">Verde</label><label class="editor-color"><input id="velo-led-yellow" type="color">Amarelo</label><label class="editor-color"><input id="velo-led-red" type="color">Vermelho</label></div>
          <fieldset class="shift-material-picker"><legend>Material da caixa</legend>${Object.entries(window.ApexShiftLights.materials).map(([id,m])=>`<button type="button" data-material="${id}" aria-label="${m.name}" title="${m.description}"><span class="material-swatch" style="background-image:url('${window.ApexShiftLights.textureURL(id)}')"></span><span>${m.name}</span></button>`).join('')}</fieldset>
          <label class="editor-color shift-case-color" for="velo-case-color"><input id="velo-case-color" type="color" value="#323c44"><span id="velo-case-color-label">Cor do metal</span></label><p class="editor-hint material-description" id="velo-material-description"></p>
          <label class="editor-range-label" for="velo-brightness">Brilho dos LEDs <output id="velo-brightness-value">85%</output></label><input id="velo-brightness" type="range" min="20" max="100" value="85"><button type="button" class="editor-secondary" id="velo-ignition">Testar ignição e LEDs</button></div>
        <div class="editor-section"><span class="editor-section-title">Iluminação</span><label class="editor-check"><input id="velo-light-auto" type="checkbox" checked> Ajustar dia / noite automaticamente</label><label for="velo-quality">Qualidade</label><select id="velo-quality"><option value="low">Baixa</option><option value="balanced">Equilibrada</option><option value="high">Alta</option></select>
          <label class="editor-range-label" for="velo-light-day">Brilho de dia <output id="velo-light-day-value">100%</output></label><input id="velo-light-day" type="range" min="20" max="100">
          <label class="editor-range-label" for="velo-light-night">Brilho à noite <output id="velo-light-night-value">65%</output></label><input id="velo-light-night" type="range" min="20" max="100">
          <label class="editor-range-label" for="velo-light-glass">Reflexo do vidro <output id="velo-light-glass-value">35%</output></label><input id="velo-light-glass" type="range" min="0" max="100"></div>
        <div class="editor-section"><label class="editor-check editor-check-main"><input id="velo-trip-enabled" type="checkbox"> Mostrar dados da viagem</label><label for="velo-trip-mode">Exibição da viagem</label><select id="velo-trip-mode"><option value="inline">Viagem dentro do painel</option><option value="floating">Completo externo</option></select><p class="editor-hint" id="velo-trip-hint"></p><button type="button" class="editor-secondary" id="velo-trip-reset">Zerar viagem</button><p class="editor-hint">Zerar a viagem tem efeito imediato.</p></div>
        <div class="editor-section"><span class="editor-section-title">Compartilhar configuração</span><p class="editor-hint">JSON v4, até 64 KB. Somente preferências e layouts; sem dados de conta ou da viagem.</p><div class="editor-pair editor-actions"><button type="button" id="velo-import">Importar JSON</button><button type="button" id="velo-export">Exportar JSON</button></div><input id="velo-import-file" type="file" accept=".json,application/json" hidden><div id="velo-import-preview" class="editor-import-preview" hidden><p id="velo-import-summary"></p><div class="editor-pair editor-actions"><button type="button" id="velo-import-apply">Aplicar prévia</button><button type="button" id="velo-import-cancel">Descartar arquivo</button></div></div></div>
        <button type="button" class="editor-subtle" id="velo-reset-all">Restaurar tudo</button>
      </div>
      <div class="editor-status" id="velo-status" role="status" aria-live="polite">Alterações ainda não salvas.</div><footer><button type="button" id="velo-cancel">Cancelar</button><button type="button" class="editor-save" id="velo-save">Salvar e fechar</button></footer>
    </aside><div class="editor-guide" role="button" aria-label="Mover componente selecionado" hidden><span></span><i></i><i></i><i></i><i></i></div><div class="editor-help"><kbd>ARRASTAR</kbd> mover <kbd>↑ ↓ ← →</kbd> ajuste fino <kbd>SHIFT</kbd> 10× <kbd>ALT</kbd> fino / sem snap <kbd>CTRL Z</kbd> desfazer <kbd>ESC</kbd> cancelar</div>`;
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id),canvas=dialog.querySelector('.editor-canvas'),guide=dialog.querySelector('.editor-guide');
  guide.tabIndex=0;
  const round=v=>Math.round(v*10)/10;
  const isGlobal=()=>selected==='whole'||selected==='shift'||(selected==='trip'&&preferences.trip.mode==='floating');
  const labelFor=key=>key==='trip'&&preferences.trip.mode==='floating'?'Completo externo':labels[key]||key;
  const targetElement=()=>selected==='whole'?host:selected==='shift'?shiftHost:selected==='trip'&&preferences.trip.mode==='floating'?tripHost:parts[preferences.model]?.[selected];
  const isLocked=()=>component()?.locked===true||(!isGlobal()&&settings().locked);
  function paintHistory(){
    const pending=gesture&&JSON.stringify(gesture.before)!==JSON.stringify(preferences);
    $('velo-undo').disabled=!undoStack.length&&!pending;$('velo-redo').disabled=!redoStack.length||!!pending;
  }
  function recordChange(before){
    if(JSON.stringify(before)!==JSON.stringify(preferences)){undoStack.push(clone(before));if(undoStack.length>historyLimit)undoStack.shift();redoStack=[];}
    historyCurrent=clone(preferences);paintHistory();
  }
  function endGesture(){if(!gesture)return;const before=gesture.before;gesture=null;recordChange(before);}
  function beginGesture(key){if(gesture?.key===key)return;endGesture();gesture={key,before:clone(preferences)};}
  function travelHistory(redo=false){
    if(!opened||busy)return;endDrag();endGesture();const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;
    if(!from.length)return;to.push(clone(preferences));apply(availableModel(from.pop()));historyCurrent=clone(preferences);populateParts();paintPanel();status(redo?'Alteração refeita.':'Alteração desfeita.');
  }
  function snapPosition(value,global,alt=false){const step=global?.01:5;return $('velo-snap').checked&&!alt?Math.round(value/step)*step:value;}
  function availableModel(next){if(catalog.length&&!catalog.some(d=>d.id===next.model))next.model=catalog.some(d=>d.id===preferences.model)?preferences.model:catalog[0].id;return next;}
  function settings(){return preferences.models[preferences.model];}
  function geometry(){const m=metadata[preferences.model]||{width:472,height:296};return {w:m.width,h:m.height,factor:m.width/m.height<=1?.74:1};}
  function status(text,error=false){$('velo-status').textContent=text;$('velo-status').classList.toggle('has-error',error);}
  function mix(hex,target,amount){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return '#'+rgb.map(v=>Math.round(v+(target-v)*amount).toString(16).padStart(2,'0')).join('');}
  function apply(next){
    preferences=P.normalize(next);if(opened)draft=preferences;
    hud.setPresentation?.(preferences.lighting);
    const m=settings(),model=preferences.model,g=geometry();
    host.dataset.model=model;host.style.aspectRatio=`${g.w} / ${g.h}`;
    for(const [id,surface] of Object.entries(surfaces))surface.hidden=id!==model||!catalog.some(d=>d.id===id);
    for(const [id,root] of Object.entries(roots)){
      const modelSettings=preferences.models[id];root.style.setProperty('--model-accent',modelSettings.colors.accent);root.style.setProperty('--model-text',modelSettings.colors.text);
      for(const [key,element] of Object.entries(parts[id])){
        const p=modelSettings.parts[key]||(modelSettings.parts[key]={x:0,y:0,scale:1,visible:true,locked:false}),px=Number(element.dataset.pivotX)||0,py=Number(element.dataset.pivotY)||0;
        element.setAttribute('transform',`translate(${p.x} ${p.y}) translate(${px} ${py}) scale(${p.scale}) translate(${-px} ${-py})`);element.style.display=p.visible?'':'none';
      }
    }
    for(const [id,view] of Object.entries(views))view.theme?.(preferences.models[id].colors);
    const compare=document.getElementById('compare');if(compare){compare.disabled=model!=='apex';compare.title=model==='apex'?'Comparar com a imagem original':'Comparação disponível no modelo APEX';}
    if(lastFrame)render(lastFrame);
    layout();window.dispatchEvent(new CustomEvent('apex:model',{detail:{model,ratio:g.w/g.h}}));
  }
  function layout(){
    const g=geometry(),m=settings();
    if(!studio||opened){
      const marginX=hud.config.right,marginY=hud.config.bottom;
      const width=Math.min(hud.config.width*g.factor*m.scale,innerWidth-2*marginX,(innerHeight-2*marginY)*g.w/g.h),height=width*g.h/g.w;
      const x=marginX+Math.max(0,innerWidth-2*marginX-width)*m.x,y=marginY+Math.max(0,innerHeight-2*marginY-height)*m.y;
      host.style.setProperty('width',width+'px','important');host.style.setProperty('max-width','none','important');host.style.position=!studio&&!opened?'fixed':'absolute';host.style.left=x+'px';host.style.top=y+'px';host.style.right='auto';host.style.bottom='auto';host.style.transform='none';host.style.transition='none';
    }
    layoutWidgets();updateGuide();
  }
  function layoutWidgets(){
    const area=!studio||opened?{width:innerWidth,height:innerHeight}:{width:shiftParent.clientWidth,height:shiftParent.clientHeight};
    for(const [element,p,base,ratio] of [[shiftHost,preferences.shift,360,62/360],[tripHost,preferences.trip,260,110/260]]){
      const width=Math.max(1,Math.min(base*p.scale,area.width-24));
      if(element===tripHost)element.style.setProperty('--trip-scale',p.scale);
      element.style.width=width+'px';element.style.position=!studio&&!opened?'fixed':'absolute';
      const height=element.getBoundingClientRect().height||width*ratio;
      element.style.left=12+Math.max(0,area.width-width-24)*p.x+'px';element.style.top=12+Math.max(0,area.height-height-24)*p.y+'px';
    }
  }
  function render(frame){
    lastFrame=frame;
    frame={...frame,tripSettings:preferences.trip};
    const view=catalog.some(d=>d.id===preferences.model)?views[preferences.model]:null;if(view){view.render(frame);surfaces[preferences.model].style.visibility=frame.state.visible?'visible':'hidden';}
    shiftHost.hidden=!preferences.shift.enabled||!frame.state.visible;
    shift.render(frame,preferences.shift);
    const wasHidden=tripHost.hidden,creatingTrip=!trip&&typeof window.VeloTripWidget==='function';
    if(creatingTrip){tripHost.replaceChildren();trip=new window.VeloTripWidget(tripHost);}
    tripHost.hidden=preferences.trip.mode!=='floating'||!preferences.trip.enabled||!frame.state.visible;
    trip?.render(frame,preferences.trip);
    tripHost.classList.toggle('is-placeholder',!trip);
    if(!trip)tripHost.textContent='Completo externo';
    if(creatingTrip||wasHidden!==tripHost.hidden)layoutWidgets();
    if(opened)updateGuide();
  }
  function component(){return selected==='whole'?settings():selected==='shift'?preferences.shift:selected==='trip'&&preferences.trip.mode==='floating'?preferences.trip:settings().parts[selected];}
  function populateParts(){
    const list=[...new Set(['whole',...Object.keys(parts[preferences.model]||{}),'shift','trip'])];
    if(!list.includes(selected))selected='whole';
    $('velo-part').replaceChildren(...list.map(key=>{const option=document.createElement('option');option.value=key;option.textContent=labelFor(key);return option;}));$('velo-part').value=selected;
  }
  function paintPanel(){
    const p=component(),global=isGlobal();
    if(!p)return;
    dialog.querySelectorAll('[data-model]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.model===preferences.model));});
    $('velo-part').value=selected;$('velo-pos-unit').textContent=global?'%':'px';
    for(const axis of ['x','y']){const input=$('velo-'+axis);if(document.activeElement!==input||!gesture)input.value=round(p[axis]*(global?100:1));input.min=global?0:-800;input.max=global?100:800;input.step=.1;}
    $('velo-scale').min=global?'50':'40';$('velo-scale').max=selected==='whole'?'160':'200';$('velo-scale').value=Math.round(p.scale*100);$('velo-scale-value').value=Math.round(p.scale*100)+'%';
    $('velo-part-visible-row').hidden=global;$('velo-part-visible').checked=p.visible!==false;
    $('velo-locked').checked=p.locked===true;
    for(const id of ['velo-x','velo-y','velo-scale','velo-part-visible','velo-reset-part'])$(id).disabled=isLocked();
    $('velo-accent').value=settings().colors.accent;$('velo-text').value=settings().colors.text;
    $('velo-shift-enabled').checked=preferences.shift.enabled;$('velo-brightness').value=preferences.shift.brightness*100;$('velo-brightness-value').value=Math.round(preferences.shift.brightness*100)+'%';
    dialog.querySelectorAll('button[data-material]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.material===preferences.shift.material)));
    $('velo-case-color').value=preferences.shift.color;
    $('velo-case-color-label').textContent={carbon:'Cor da fibra de carbono',metal:'Cor do metal',matte:'Cor do acabamento fosco',plastic:'Cor do plástico'}[preferences.shift.material];
    $('velo-material-description').textContent=window.ApexShiftLights.materials[preferences.shift.material].description;
    for(const [id,value,suffix] of [['led-count',preferences.shift.count,''],['start-rpm',preferences.shift.startRpm*100,'%'],['full-rpm',preferences.shift.fullRpm*100,'%'],['flash-hz',preferences.shift.flashHz,' Hz'],...['day','night','glass'].map(k=>['light-'+k,preferences.lighting[k]*100,'%'])]){$('velo-'+id).value=value;$('velo-'+id+'-value').value=round(value)+suffix;}
    $('velo-full-rpm').min=Math.max(10,Math.round((preferences.shift.startRpm+.05)*100));
    for(const key of ['green','yellow','red'])$('velo-led-'+key).value=preferences.shift.colors[key];
    $('velo-light-auto').checked=preferences.lighting.auto;$('velo-quality').value=preferences.lighting.quality;$('velo-trip-enabled').checked=preferences.trip.enabled;
    $('velo-trip-mode').value=preferences.trip.mode;
    $('velo-part').querySelector('option[value="trip"]').textContent=labelFor('trip');
    $('velo-trip-hint').textContent='Horas e minutos em movimento, autonomia estimada e ETA quando houver destino GPS. '+(preferences.trip.mode==='inline'?'Selecione Viagem dentro do painel para ajustar a posição e o tamanho no modelo.':'Selecione Completo externo para posicionar a viagem na tela.');
    paintPresets();paintHistory();
    updateGuide();
  }
  function updateGuide(){
    if(!opened)return;
    const element=targetElement();
    dialog.classList.toggle('has-grid',$('velo-guides').checked);
    if(!element||element.hidden||(!isGlobal()&&!component()?.visible)){guide.hidden=true;return;}
    // Measure the entire edit group, including every inline trip row added by the renderer.
    const r=element.getBoundingClientRect();guide.hidden=!r.width||!r.height;
    guide.classList.toggle('is-locked',!!isLocked());guide.setAttribute('aria-disabled',String(!!isLocked()));guide.setAttribute('aria-label',labelFor(selected)+(isLocked()?' · bloqueado':' · mover com as setas'));
    guide.style.left=r.left-5+'px';guide.style.top=r.top-5+'px';guide.style.width=r.width+10+'px';guide.style.height=r.height+10+'px';guide.querySelector('span').textContent=labelFor(selected)+(isLocked()?' · bloqueado':'');
  }
  function change(){apply(preferences);if(opened&&!gesture)recordChange(historyCurrent||preferences);paintPanel();status('Prévia atualizada. Salve para manter as alterações.');}
  function paintPresets(){
    const picker=$('velo-preset'),value=picker.value,options=[['','Escolher layout…'],['builtin:original','Original'],['builtin:compact','Compact'],['builtin:race','Race'],...Object.entries(preferences.presets).map(([id,p])=>['user:'+id,p.name])];
    picker.replaceChildren(...options.map(([id,name])=>{const option=document.createElement('option');option.value=id;option.textContent=name;return option;}));
    picker.value=options.some(([id])=>id===value)?value:'';
    $('velo-preset-apply').disabled=!picker.value;$('velo-preset-delete').disabled=!picker.value.startsWith('user:');
  }
  function builtIn(name){
    const next=clone(preferences),defaults=P.defaults();
    for(const m of Object.values(next.models)){
      Object.assign(m,{x:1,y:1,scale:name==='compact'?.75:name==='race'?1.1:1,locked:false});
      // Identity transforms keep inline trip at the renderer's native position and size.
      for(const p of Object.values(m.parts))Object.assign(p,{x:0,y:0,scale:1,visible:true,locked:false});
    }
    next.shift={...defaults.shift,color:next.shift.color,colors:clone(next.shift.colors)};
    next.lighting=defaults.lighting;next.trip=defaults.trip;
    if(name==='compact'){Object.assign(next.shift,{enabled:preferences.shift.enabled,scale:.8,y:.88});Object.assign(next.trip,{enabled:preferences.trip.enabled,scale:.8});}
    if(name==='race'){Object.assign(next.shift,{enabled:true,y:.12});next.trip.enabled=true;}
    return next;
  }
  function clearImport(){importRevision++;importPreview=null;$('velo-import-preview').hidden=true;$('velo-import-summary').textContent='';$('velo-import-file').value='';}
  function exportConfig(){
    const text=JSON.stringify(P.normalize(preferences),null,2);
    if(new TextEncoder().encode(text).length>P.maxBytes)throw Error('A configuração excede 64 KB. Remova presets antes de exportar.');
    return text;
  }
  async function request(name,data={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
    try{const response=await fetch(`https://${GetParentResourceName()}/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal});if(!response.ok)throw Error('Falha na comunicação com o jogo.');const result=await response.json();if(!result.ok)throw Error(result.error||'Não foi possível concluir.');return result;}finally{clearTimeout(timeout);}
  }
  function open(input){
    if(opened)return;
    if(input){saved=P.normalize(input);apply(saved);}
    window.apexDevStop?.();snapshot=clone(hud.state);latestMessage=null;focusBefore=document.activeElement;draft=clone(preferences);saved=clone(preferences);opened=true;selected='whole';
    undoStack=[];redoStack=[];gesture=null;historyCurrent=clone(preferences);clearImport();
    hostStyle=host.getAttribute('style')||'';hostPlaceholder=document.createComment('speedometer position');host.before(hostPlaceholder);canvas.append(host,shiftHost,tripHost);
    dialog.hidden=false;document.body.classList.add('is-editing-velo');hud.cancelIgnition();hud.update({...snapshot,visible:true,engine:true,speed:158,rpm:.705,gear:'4',ignition:false});
    apply(draft);populateParts();paintPanel();status(game?'Preferências salvas neste cliente. A prévia usa valores de demonstração.':'Prévia local: as preferências ficam salvas neste navegador.');dialog.querySelector('.editor-scroll').scrollTop=0;$('velo-close').focus({preventScroll:true});
  }
  function finishClose(committed){
    opened=false;draft=null;endDrag();gesture=null;undoStack=[];redoStack=[];historyCurrent=null;clearImport();guide.hidden=true;dialog.hidden=true;document.body.classList.remove('is-editing-velo');
    if(hostPlaceholder){hostPlaceholder.replaceWith(host);hostPlaceholder=null;}shiftParent.append(shiftHost,tripHost);host.setAttribute('style',hostStyle);
    apply(availableModel(clone(saved)));hud.cancelIgnition();hud.update({...snapshot,ignition:false});
    if(latestMessage){const latest=latestMessage;latestMessage=null;hud.receive(latest);}
    snapshot=null;window.dispatchEvent(new Event('resize'));focusBefore?.focus?.();
    window.dispatchEvent(new CustomEvent('apex:editor-closed',{detail:{saved:committed}}));
  }
  async function close(commit=false,external=false){
    if(!opened)return;
    // Lua may release focus during an outstanding save (logout/resource stop).
    if(external){closeRevision++;busy=false;$('velo-save').disabled=false;finishClose(false);return;}
    if(busy)return;
    endDrag();endGesture();
    const revision=++closeRevision;busy=true;$('velo-save').disabled=true;
    try{
      if(commit){
        status('Salvando…');
        if(game){const result=await request('editorSave',{preferences:P.normalize(preferences)});if(revision!==closeRevision||!opened)return;saved=P.normalize(result.preferences||preferences);}
        else{localStorage.setItem(P.storageKey,JSON.stringify(P.normalize(preferences)));saved=clone(preferences);}
      }
      if(game&&!external)await request('editorClose');
      if(revision!==closeRevision||!opened)return;
      finishClose(commit);
    }catch(error){if(revision===closeRevision&&opened)status(error.name==='AbortError'?'O jogo não respondeu. Tente salvar ou fechar novamente.':error.message,true);}
    finally{if(revision===closeRevision){busy=false;$('velo-save').disabled=false;}}
  }
  function renderOffers(){
    const section=dialog.querySelector('.model-offers'),list=section.querySelector('.offer-list');list.replaceChildren();
    const missing=(window.VeloOffers?.list||[]).filter(d=>!catalog.some(m=>m.id===d.id||m.resource===d.resource));
    section.hidden=!missing.length;
    for(const d of missing){
      const card=document.createElement('article');card.className='model-offer';card.dataset.offer=d.id;
      if(d.preview){const frame=document.createElement('div');frame.className='offer-preview';const image=document.createElement('img');image.src=d.preview;image.alt=`Prévia do velocímetro ${d.name}`;image.draggable=false;image.addEventListener('error',()=>frame.remove(),{once:true});frame.append(image);card.append(frame);}
      const content=document.createElement('div');content.className='offer-content';
      const heading=document.createElement('div');heading.className='offer-heading';const name=document.createElement('strong');name.textContent=d.name;const badge=document.createElement('small');badge.textContent=d.installed?'INDISPONÍVEL':'NÃO INSTALADO';heading.append(name,badge);
      const description=document.createElement('p');description.textContent=d.installed?'Este modelo está instalado no servidor e ainda não está disponível no editor.':d.description;
      const link=document.createElement('a');link.className='offer-link';link.textContent=`Obter ${d.name} ↗`;
      if(d.installed){link.setAttribute('aria-disabled','true');link.textContent='Modelo instalado';}
      else if(d.url){link.href=d.url;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',e=>{if(!game)return;e.preventDefault();if(typeof window.invokeNative==='function')window.invokeNative('openUrl',d.url);else status('Não foi possível abrir o link neste cliente.',true);});}
      else{link.setAttribute('aria-disabled','true');link.textContent=`Obter ${d.name} · em breve`;}
      content.append(heading,description,link);card.append(content);list.append(card);
    }
  }
  function syncCatalog(entries){
    endDrag();endGesture();
    catalog=entries;
    for(const d of entries){
      metadata[d.id]=d;
      if(!views[d.id]){const surface=document.createElement('div');surface.className='model-surface';surface.hidden=true;surface.dataset.model=d.id;host.append(surface);surfaces[d.id]=surface;const view=d.create(surface);views[d.id]=view;roots[d.id]=view.root;parts[d.id]=Object.fromEntries([...view.root.querySelectorAll('[data-edit-part]')].map(e=>[e.dataset.editPart,e]));}
    }
    for(const [id,surface]of Object.entries(surfaces))if(!entries.some(d=>d.id===id))surface.hidden=true;
    if(entries.length&&!entries.some(d=>d.id===preferences.model))preferences.model=entries[0].id;
    const picker=dialog.querySelector('.model-picker');picker.replaceChildren();const legend=document.createElement('legend');legend.textContent='Velocímetros instalados';picker.append(legend);
    for(const d of entries){
      const button=document.createElement('button');button.type='button';button.dataset.model=d.id;const preview=document.createElement('span');preview.className='model-preview';const miniature=d.create(preview);miniature.theme?.({accent:d.accent,text:d.text});miniature.render({state:{...window.ApexSpeedometer.defaults,visible:true,engine:true,speed:158,rpm:.705,gear:'4',fuel:72,temperature:100,seatbelt:false,engineWarning:true,handbrake:true,abs:true,traction:true},current:{speed:158,rpm:.705,fuel:72,temperature:100},config:{...hud.config,animation:false},boot:false,phase:'idle',now:0});const name=document.createElement('strong');name.textContent=d.name;button.append(preview,name);picker.append(button);button.addEventListener('click',()=>{if(busy)return;endDrag();endGesture();preferences.model=d.id;selected='whole';change();populateParts();paintPanel();status('Modelo selecionado. Os ajustes dos outros modelos foram preservados.');});
    }
    if(!entries.length){const note=document.createElement('p');note.className='velo-no-model';note.textContent='Inicie um recurso de velocímetro compatível para adicioná-lo ao editor.';picker.append(note);}
    renderOffers();$('velo-save').disabled=!entries.length;
    apply(preferences);if(opened){historyCurrent=clone(preferences);populateParts();paintPanel();}
  }
  window.addEventListener('velo:catalog',e=>syncCatalog(e.detail));
  window.addEventListener('velo:offers',renderOffers);
  window.addEventListener('velo:load-error',e=>status(e.detail,true));
  $('velo-part').addEventListener('change',()=>{endDrag();endGesture();selected=$('velo-part').value;paintPanel();});
  function bindInput(id,update){
    const input=$(id);input.addEventListener('input',e=>{if(busy||input.disabled)return;beginGesture(id);update(input,e);});
    for(const event of ['change','blur','pointerup','pointercancel'])input.addEventListener(event,()=>{endGesture();paintPanel();});
  }
  for(const axis of ['x','y'])bindInput('velo-'+axis,(input,e)=>{const v=input.valueAsNumber;if(!Number.isFinite(v)||isLocked())return;component()[axis]=snapPosition(v/(isGlobal()?100:1),isGlobal(),e.altKey);change();});
  bindInput('velo-scale',input=>{if(isLocked())return;component().scale=Number(input.value)/100;change();});
  $('velo-locked').addEventListener('change',()=>{endDrag();endGesture();component().locked=$('velo-locked').checked;change();});
  $('velo-part-visible').addEventListener('change',()=>{component().visible=$('velo-part-visible').checked;change();});
  for(const key of ['accent','text'])bindInput('velo-'+key,input=>{settings().colors[key]=input.value;change();});
  $('velo-shift-enabled').addEventListener('change',()=>{endDrag();endGesture();preferences.shift.enabled=$('velo-shift-enabled').checked;if(preferences.shift.enabled)selected='shift';change();});
  dialog.querySelectorAll('button[data-material]').forEach(b=>b.addEventListener('click',()=>{endGesture();preferences.shift.material=b.dataset.material;change();}));
  bindInput('velo-case-color',input=>{preferences.shift.color=input.value;change();});
  bindInput('velo-brightness',input=>{preferences.shift.brightness=Number(input.value)/100;change();});
  for(const [id,key,factor] of [['led-count','count',1],['start-rpm','startRpm',100],['full-rpm','fullRpm',100],['flash-hz','flashHz',1]])bindInput('velo-'+id,input=>{preferences.shift[key]=Number(input.value)/factor;change();});
  for(const key of ['green','yellow','red'])bindInput('velo-led-'+key,input=>{preferences.shift.colors[key]=input.value;change();});
  for(const key of ['day','night','glass'])bindInput('velo-light-'+key,input=>{preferences.lighting[key]=Number(input.value)/100;change();});
  $('velo-light-auto').addEventListener('change',()=>{endGesture();preferences.lighting.auto=$('velo-light-auto').checked;change();});
  $('velo-quality').addEventListener('change',()=>{endGesture();preferences.lighting.quality=$('velo-quality').value;change();});
  $('velo-trip-enabled').addEventListener('change',()=>{endDrag();endGesture();preferences.trip.enabled=$('velo-trip-enabled').checked;if(preferences.trip.enabled)selected='trip';change();});
  $('velo-trip-mode').addEventListener('change',()=>{endDrag();endGesture();preferences.trip.mode=$('velo-trip-mode').value;selected='trip';change();});
  $('velo-trip-reset').addEventListener('click',async()=>{
    const revision=closeRevision;$('velo-trip-reset').disabled=true;
    try{if(game)await request('tripReset');else window.dispatchEvent(new CustomEvent('velo:trip-reset'));if(opened&&revision===closeRevision)status('Viagem zerada.');}
    catch(error){if(opened&&revision===closeRevision)status(error.name==='AbortError'?'O jogo não respondeu ao reset da viagem.':error.message,true);}
    finally{$('velo-trip-reset').disabled=false;}
  });
  $('velo-guides').addEventListener('change',updateGuide);
  $('velo-undo').addEventListener('click',()=>travelHistory());$('velo-redo').addEventListener('click',()=>travelHistory(true));
  $('velo-preset').addEventListener('change',paintPresets);
  $('velo-preset-apply').addEventListener('click',()=>{
    endDrag();endGesture();const value=$('velo-preset').value;
    if(value.startsWith('builtin:'))preferences=builtIn(value.slice(8));
    else if(value.startsWith('user:')){const p=preferences.presets[value.slice(5)];if(!p)return;preferences=availableModel({...clone(p.layout),presets:clone(preferences.presets)});}
    else return;selected='whole';change();populateParts();paintPanel();status('Layout aplicado à prévia. Salve para confirmar.');
  });
  $('velo-preset-save').addEventListener('click',()=>{
    endGesture();const name=P.presetName($('velo-preset-name').value);if(!name){status('Digite um nome para guardar o layout.',true);$('velo-preset-name').focus();return;}
    const existing=Object.entries(preferences.presets).find(([,p])=>p.name===name)?.[0];
    if(!existing&&Object.keys(preferences.presets).length>=8){status('Limite de 8 presets. Exclua um ou use o mesmo nome para substituí-lo.',true);return;}
    let id=existing||'layout-'+Date.now().toString(36);while(!existing&&Object.prototype.hasOwnProperty.call(preferences.presets,id))id+='x';
    preferences.presets[id]={name,layout:P.layout(preferences)};change();$('velo-preset').value='user:'+id;$('velo-preset-name').value=name;paintPresets();status('Preset guardado na prévia. Salve o editor para mantê-lo.');
  });
  $('velo-preset-delete').addEventListener('click',()=>{endGesture();const value=$('velo-preset').value;if(!value.startsWith('user:'))return;delete preferences.presets[value.slice(5)];change();});
  $('velo-import').addEventListener('click',()=>{$('velo-import-file').click();});
  $('velo-import-file').addEventListener('change',async()=>{
    const file=$('velo-import-file').files[0];clearImport();if(!file)return;const revision=importRevision;
    try{if(file.size>P.maxBytes)throw Error('O arquivo deve ter no máximo 64 KB.');const next=P.parseConfig(await file.text());if(!opened||revision!==importRevision)return;
      importPreview=next;$('velo-import-summary').textContent=`${file.name} · v4 · modelo ${next.model} · ${Object.keys(next.models).length} modelos · ${Object.keys(next.presets).length} presets · ${next.shift.count} LEDs. Revise antes de aplicar.`;$('velo-import-preview').hidden=false;status('Arquivo validado. Aplicar prévia permite revisar e desfazer a configuração.');
    }catch(error){if(opened&&revision===importRevision)status(error.message,true);}
  });
  $('velo-import-apply').addEventListener('click',()=>{if(!importPreview)return;endDrag();endGesture();preferences=availableModel(clone(importPreview));selected='whole';clearImport();change();populateParts();paintPanel();status('Configuração importada na prévia. Salve para confirmar ou desfaça para restaurar.');});
  $('velo-import-cancel').addEventListener('click',clearImport);
  $('velo-export').addEventListener('click',()=>{
    try{endGesture();const url=URL.createObjectURL(new Blob([exportConfig()],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='velo-editor-v4.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Configuração exportada. O arquivo contém somente preferências.');}catch(error){status(error.message,true);}
  });
  $('velo-ignition').addEventListener('click',()=>{hud.update({visible:true,engine:true,speed:0,rpm:.12,gear:'N',ignition:true});status('Autoteste: subida dos LEDs, flashes vermelhos e apagamento.');});
  $('velo-reset-part').addEventListener('click',()=>{if(isLocked())return;endGesture();const defaults=P.defaults();if(selected==='whole')Object.assign(settings(),{x:1,y:1,scale:1});else if(isGlobal()){const previous=preferences[selected];preferences[selected]={...defaults[selected],enabled:previous.enabled,...(selected==='trip'?{mode:previous.mode}:{})};}else settings().parts[selected]={x:0,y:0,scale:1,visible:true,locked:false};change();});
  $('velo-reset-all').addEventListener('click',()=>{endDrag();endGesture();preferences={...P.defaults(),presets:clone(preferences.presets)};selected='whole';change();populateParts();paintPanel();status('Padrões restaurados na prévia. Salve para confirmar.');});
  $('velo-save').addEventListener('click',()=>close(true));$('velo-close').addEventListener('click',()=>close());$('velo-cancel').addEventListener('click',()=>close());
  guide.addEventListener('pointerdown',e=>{
    if(e.button!==0||busy||isLocked())return;e.preventDefault();guide.focus({preventScroll:true});
    const global=isGlobal(),element=global?null:targetElement(),matrix=element?.parentElement.getScreenCTM?.();
    if(!global&&!matrix)return;
    beginGesture('drag');guide.setPointerCapture(e.pointerId);
    const r=targetElement().getBoundingClientRect();
    drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,base:clone(component()),inverse:matrix?.inverse(),global,width:r.width,height:r.height};guide.classList.add('is-dragging');
  });
  guide.addEventListener('pointermove',e=>{
    if(!drag||busy||isLocked())return;const p=component();
    if(drag.global){const whole=selected==='whole';p.x=drag.base.x+(e.clientX-drag.startX)/Math.max(1,innerWidth-drag.width-2*(whole?hud.config.right:12));p.y=drag.base.y+(e.clientY-drag.startY)/Math.max(1,innerHeight-drag.height-2*(whole?hud.config.bottom:12));}
    else{const a=new DOMPoint(drag.startX,drag.startY).matrixTransform(drag.inverse),b=new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.inverse);p.x=drag.base.x+b.x-a.x;p.y=drag.base.y+b.y-a.y;}
    p.x=snapPosition(p.x,drag.global,e.altKey);p.y=snapPosition(p.y,drag.global,e.altKey);change();
  });
  function endDrag(){const current=drag;drag=null;guide.classList.remove('is-dragging');if(current){if(guide.hasPointerCapture(current.pointerId))guide.releasePointerCapture(current.pointerId);endGesture();}}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])guide.addEventListener(event,endDrag);
  for(const event of ['click','input','change','pointerdown'])dialog.addEventListener(event,e=>{if(busy&&e.target.closest('.editor-scroll')){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',e=>{
    if(!opened)return;
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(e.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return;
    const key=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&['z','y'].includes(key)){e.preventDefault();travelHistory(key==='y'||e.shiftKey);return;}
    if(busy||e.ctrlKey||e.metaKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();if(isLocked())return;beginGesture('arrows');
    const p=component(),global=isGlobal(),axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y',r=targetElement()?.getBoundingClientRect(),whole=selected==='whole';
    const space=global?Math.max(1,axis==='x'?innerWidth-(r?.width||0)-2*(whole?hud.config.right:12):innerHeight-(r?.height||0)-2*(whole?hud.config.bottom:12)):1;
    const amount=(e.shiftKey?10:1)*(e.altKey?.1:1)/space;p[axis]+=amount*(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1);change();
  });
  document.addEventListener('keyup',e=>{if(opened&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))endGesture();});
  window.addEventListener('blur',()=>{endDrag();endGesture();});
  window.addEventListener('apex:frame',e=>render(e.detail));
  window.addEventListener('apex:configure',e=>{if(e.detail.preferences&&!opened){saved=P.normalize(e.detail.preferences);apply(saved);}layout();});
  window.addEventListener('resize',layout);
  window.addEventListener('message',e=>{const m=e.data;if(m?.source!=='Apex_Speedometer')return;if(m.action==='editor:open')open(m.preferences);if(m.action==='editor:close')close(false,true);});
  window.apexEditor={open,close,undo:()=>travelHistory(),redo:()=>travelHistory(true),flushHistory:endGesture,exportConfig,get history(){return {limit:historyLimit,undo:undoStack.length,redo:redoStack.length,pending:!!gesture};},get isOpen(){return opened;},get preferences(){return clone(preferences);},get parts(){return parts;},get activeRoot(){return roots[preferences.model];},defer(message){if(opened&&['update','hide'].includes(message.action)){latestMessage=message;return true;}return false;}};
  window.apexCustomization={get ratio(){const g=geometry();return g.w/g.h;},get model(){return preferences.model;},apply,layout};
  document.getElementById('open-editor')?.addEventListener('click',()=>open());
  syncCatalog(window.VeloModels.catalog);
  if(studio&&new URLSearchParams(location.search).get('editor')==='1')requestAnimationFrame(()=>open());
})();
