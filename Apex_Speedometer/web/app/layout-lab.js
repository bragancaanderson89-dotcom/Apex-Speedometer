/* DEV-only positioning studio for the truck layout. No executable code is imported. */
(async () => {
  'use strict';
  await window.VeloBoot.ready;
  const $=id=>document.getElementById(id), panel=$('layout-lab'), surface=$('layout-lab-surface');
  const controls={part:$('layout-lab-part'),x:$('layout-lab-x'),y:$('layout-lab-y'),size:$('layout-lab-size'),sizeOut:$('layout-lab-size-out'),text:$('layout-lab-text'),code:$('layout-lab-code'),status:$('layout-lab-status')};
  const key='apex:dev:truck-layout:v1',baseline='truck-integrated-4';
  let view=null,svg=null,targets=new Map(),changes={},selected=null,drag=null,lastFocus=null;
  const finite=n=>typeof n==='number'&&Number.isFinite(n),round=n=>Math.round(n*10)/10;
  const say=message=>{controls.status.textContent=message;};
  function buildTargets(){
    targets=new Map();controls.part.replaceChildren();
    const add=(id,label,element,editable=false)=>{
      if(!element||targets.has(id))return;
      const box=element.getBBox(),item={id,label,element,editable,base:element.getAttribute('transform')||'',text:element.textContent||'',cx:box.x+box.width/2,cy:box.y+box.height/2};
      element.dataset.labId=id;targets.set(id,item);
      const option=document.createElement('option');option.value=id;option.textContent=label;controls.part.append(option);
    };
    for(const element of svg.querySelectorAll('.truck-signals [data-lamp],.truck-lamps [data-lamp]'))add('lamp:'+element.dataset.lamp,'Aviso · '+(element.querySelector('title')?.textContent||element.dataset.lamp),element);
    for(const element of svg.querySelectorAll('.truck-dial .truck-title')){
      const dial=element.closest('[data-dial]').dataset.dial.slice(view.prefix.length);
      add('title:'+dial,'Título · '+dial,element,true);
    }
    for(const element of svg.querySelectorAll('[data-read]'))add('read:'+element.dataset.read,'Leitura · '+element.dataset.read,element);
    for(const element of svg.querySelectorAll('[data-travel]'))add('travel:'+element.dataset.travel,'Viagem · '+element.dataset.travel,element);
    svg.querySelectorAll('.truck-trip-label').forEach((element,index)=>add('travel-label:'+index,'Legenda · '+element.textContent,element,true));
    for(const group of svg.querySelectorAll('[data-scale]')){
      const dial=group.dataset.scale.slice(view.prefix.length);
      group.querySelectorAll('.truck-tick-label').forEach((element,index)=>add(`tick:${dial}:${index}`,`Escala ${dial} · ${element.textContent}`,element,true));
    }
  }
  function validChange(input,item){
    if(!input||typeof input!=='object'||Array.isArray(input))return null;
    const x=Number(input.x??0),y=Number(input.y??0),scale=Number(input.scale??1);
    if(!finite(x)||!finite(y)||!finite(scale)||scale<.5||scale>2.2)return null;
    const result={x:round(x),y:round(y),scale:round(scale*100)/100};
    if(item.editable&&typeof input.text==='string')result.text=input.text.slice(0,40);
    return result;
  }
  function apply(item){
    const change=changes[item.id]||{x:0,y:0,scale:1};
    const transform=`translate(${change.x} ${change.y}) translate(${item.cx} ${item.cy}) scale(${change.scale}) translate(${-item.cx} ${-item.cy})`;
    item.element.setAttribute('transform',(item.base+' '+transform).trim());
    if(item.editable)item.element.textContent=typeof change.text==='string'?change.text:item.text;
  }
  function applyAll(){for(const id of Object.keys(changes)){const item=targets.get(id);if(item)apply(item);}}
  function exportCode(){
    const parts={};for(const [id] of targets)if(changes[id])parts[id]=changes[id];
    return JSON.stringify({version:5,model:'truck',baseline,parts},null,2);
  }
  function parseLayout(data){
    if(!data||data.model!=='truck'||!data.parts||typeof data.parts!=='object'||Array.isArray(data.parts)||![1,2,3,4,5].includes(data.version))throw Error('Código de layout inválido.');
    if(data.version===2&&data.baseline!=='truck-integrated-1'||data.version===3&&data.baseline!=='truck-integrated-2'||data.version===4&&data.baseline!=='truck-integrated-3'||data.version===5&&data.baseline!==baseline)throw Error('O código usa outra versão do painel.');
    const imported={};
    for(const [id,value] of Object.entries(data.parts)){
      const item=targets.get(id);if(!item)continue;
      const first=window.VeloTruckLayoutDefault?.parts?.[id]||{x:0,y:0,scale:1};
      const second=window.VeloTruckLayoutDefault?.refinements?.[id]||{x:0,y:0,scale:1};
      const third=window.VeloTruckLayoutDefault?.adjustments?.[id]||{x:0,y:0,scale:1};
      const fourth=window.VeloTruckLayoutDefault?.arrangement?.[id]||{x:0,y:0,scale:1};
      const offset=[first,second,third,fourth].slice(data.version-1).reduce((sum,part)=>({x:sum.x+(part.x??0),y:sum.y+(part.y??0),scale:sum.scale*(part.scale??1)}),{x:0,y:0,scale:1});
      const relative=data.version<5?{...value,x:round(Number(value.x??0)-offset.x),y:round(Number(value.y??0)-offset.y),scale:round(Number(value.scale??1)/offset.scale)}:value;
      const valid=validChange(relative,item);if(!valid)throw Error('Valor inválido em '+id);
      if(valid.x||valid.y||valid.scale!==1||typeof valid.text==='string'&&valid.text!==item.text)imported[id]=valid;
    }
    return imported;
  }
  function persist(){localStorage.setItem(key,exportCode());controls.code.value=exportCode();}
  function select(id){
    if(!targets.has(id))return;
    if(selected)targets.get(selected)?.element.classList.remove('lab-selected');
    selected=id;const item=targets.get(id),change=changes[id]||{x:0,y:0,scale:1};
    item.element.classList.add('lab-selected');controls.part.value=id;
    controls.x.value=change.x;controls.y.value=change.y;controls.size.value=Math.round(change.scale*100);controls.sizeOut.textContent=Math.round(change.scale*100)+'%';
    controls.text.disabled=!item.editable;controls.text.value=typeof change.text==='string'?change.text:item.text;
    controls.text.placeholder=item.editable?'Texto exibido':'Leitura automática; ajuste posição e tamanho';
  }
  function update(patch){
    const item=targets.get(selected);if(!item)return;
    const previous=changes[selected]||{x:0,y:0,scale:1};
    const next=validChange({...previous,...patch},item);if(!next)return;
    changes[selected]=next;apply(item);select(selected);persist();
  }
  function coords(event){const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse());}
  function pointerMove(event){if(!drag)return;const here=coords(event);update({x:round(drag.x+here.x-drag.start.x),y:round(drag.y+here.y-drag.start.y)});}
  function pointerUp(){drag=null;window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);}
  function onFrame(event){if(panel.hidden||!view)return;view.render({...event.detail,tripSettings:{enabled:true,mode:'inline'}});applyAll();}
  function open(){
    if(window.apexEditor?.isOpen){say('Feche o editor geral antes de abrir o ajuste fino.');return;}
    const model=window.VeloModels.catalog.find(entry=>entry.id==='truck');if(!model){say('O layout de caminhão ainda não carregou.');return;}
    window.apexDevStop?.();window.apexHud.cancelIgnition();lastFocus=document.activeElement;
    panel.hidden=false;
    if(!view){view=model.create(surface);svg=view.root.querySelector('svg');view.theme({accent:model.accent,text:model.text});view.render({...window.apexHud.currentFrame,tripSettings:{enabled:true,mode:'inline'}});buildTargets();
      svg.addEventListener('pointerdown',event=>{
        const element=event.target.closest?.('[data-lab-id]');if(!element)return;
        const id=element.dataset.labId;if(!targets.has(id))return;
        event.preventDefault();select(id);const point=coords(event),current=changes[id]||{x:0,y:0};drag={start:point,x:current.x,y:current.y};
        window.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp,{once:true});
      });
    }
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved)changes=parseLayout(saved);}catch{changes={};}
    applyAll();select(selected&&targets.has(selected)?selected:'title:speed');controls.code.value=exportCode();say('Arraste ou ajuste X, Y e tamanho. Copie o código ao terminar.');controls.part.focus();
  }
  function close(){pointerUp();panel.hidden=true;lastFocus?.focus?.();}
  $('layout-lab-open').addEventListener('click',open);$('layout-lab-close').addEventListener('click',close);
  controls.part.addEventListener('change',()=>select(controls.part.value));
  controls.x.addEventListener('input',()=>update({x:Number(controls.x.value)}));
  controls.y.addEventListener('input',()=>update({y:Number(controls.y.value)}));
  controls.size.addEventListener('input',()=>update({scale:Number(controls.size.value)/100}));
  controls.text.addEventListener('input',()=>update({text:controls.text.value}));
  $('layout-lab-reset-part').addEventListener('click',()=>{const item=targets.get(selected);if(!item)return;delete changes[selected];apply(item);select(selected);persist();say('Item restaurado.');});
  $('layout-lab-reset-all').addEventListener('click',()=>{changes={};for(const item of targets.values())apply(item);select(selected);persist();say('Layout original restaurado.');});
  $('layout-lab-copy').addEventListener('click',async()=>{const code=exportCode();controls.code.value=code;try{await navigator.clipboard.writeText(code);say('Código copiado. Envie o texto completo para eu aplicar o layout.');}catch{controls.code.select();say('Selecionei o código. Use Ctrl+C para copiar.');}});
  $('layout-lab-import').addEventListener('click',()=>{
    try{if(controls.code.value.length>65536)throw Error('Código muito grande.');const data=JSON.parse(controls.code.value);
      changes=parseLayout(data);for(const item of targets.values())apply(item);select(selected);persist();say('Código importado e salvo neste navegador.');
    }catch(error){say(error.message||'Não foi possível importar.');}
  });
  document.addEventListener('keydown',event=>{if(panel.hidden)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
    event.preventDefault();const change=changes[selected]||{x:0,y:0},step=event.shiftKey?10:1;update({x:change.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:change.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)});
  }},true);
  window.addEventListener('apex:frame',onFrame);
})();
