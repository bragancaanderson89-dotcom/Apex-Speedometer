/* Serializable v4 preferences. The v3 storage key is deliberately retained. */
(() => {
  'use strict';
  const partNames=['dial','speed','gear','fuel','temperature','lamps','assist','secondary','signals','trip'];
  const storageKey='velo:editor:v3',maxBytes=64*1024;
  const safeKey=v=>typeof v==='string'&&/^[-\w]{1,48}$/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
  const clamp=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
  const record=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  const color=(v,fallback)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v.toLowerCase():fallback;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function layout(input){
    const v=record(input),models={},catalog=window.VeloModels?.catalog||[];
    const ids=[...new Set([v.model,'apex','zsx',...catalog.map(d=>d.id),...Object.keys(record(v.models))].filter(safeKey))].slice(0,32);
    for(const id of ids){
      const m=record(record(v.models)[id]),c=record(m.colors),parts={};
      const names=[...new Set([...Object.keys(record(m.parts)),...partNames])].filter(safeKey).slice(0,64);
      for(const name of names){const p=record(record(m.parts)[name]);parts[name]={x:clamp(p.x,-800,800,0),y:clamp(p.y,-800,800,0),scale:clamp(p.scale,.4,2,1),visible:p.visible!==false,locked:p.locked===true};}
      const meta=catalog.find(d=>d.id===id)||{};
      models[id]={x:clamp(m.x,0,1,1),y:clamp(m.y,0,1,1),scale:clamp(m.scale,.5,1.6,1),locked:m.locked===true,colors:{accent:color(c.accent,color(meta.accent,id==='apex'?'#ff1328':'#ed008b')),text:color(c.text,color(meta.text,'#e4eef9'))},parts};
    }
    const s=record(v.shift),c=record(s.colors),l=record(v.lighting),t=record(v.trip);
    const startRpm=clamp(s.startRpm,0,.9,.25),minimumFull=Math.max(.1,Math.round((startRpm+.05)*1e10)/1e10);
    return {model:ids.includes(v.model)?v.model:'apex',models,
      shift:{enabled:s.enabled===true,x:clamp(s.x,0,1,.5),y:clamp(s.y,0,1,.96),scale:clamp(s.scale,.5,2,1),locked:s.locked===true,brightness:clamp(s.brightness,.2,1,.85),material:['carbon','metal','matte','plastic'].includes(s.material)?s.material:'metal',color:color(s.color,'#323c44'),count:Math.floor(clamp(s.count,4,24,12)),startRpm,fullRpm:clamp(s.fullRpm,minimumFull,1,Math.max(.95,minimumFull)),flashHz:clamp(s.flashHz,1,10,5),colors:{green:color(c.green,'#32ed80'),yellow:color(c.yellow,'#ffe048'),red:color(c.red,'#ff1834')}},
      lighting:{auto:l.auto!==false,day:clamp(l.day,.2,1,1),night:clamp(l.night,.2,1,.65),glass:clamp(l.glass,0,1,.35),quality:['low','balanced','high'].includes(l.quality)?l.quality:'balanced'},
      trip:{enabled:t.enabled===true,mode:t.mode==='floating'?'floating':'inline',x:clamp(t.x,0,1,.82),y:clamp(t.y,0,1,.94),scale:clamp(t.scale,.5,2,1),locked:t.locked===true}};
  }
  function normalize(input){
    const v=record(input),presets={};
    for(const [id,value] of Object.entries(record(v.presets)).filter(([id])=>safeKey(id)).slice(0,8)){
      const p=record(value),name=presetName(p.name);
      if(name&&p.layout&&typeof p.layout==='object'&&!Array.isArray(p.layout))presets[id]={name,layout:layout(p.layout)};
    }
    return {version:4,...layout(v),presets};
  }
  function presetName(value){
    const chars=Array.from(typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim():'').slice(0,40);
    while(new TextEncoder().encode(chars.join('')).length>120)chars.pop();
    return chars.join('');
  }
  function parseConfig(text){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)throw Error('O arquivo deve ter no máximo 64 KB.');
    let v;try{v=JSON.parse(text);}catch{throw Error('JSON inválido. Selecione uma configuração exportada pelo editor.');}
    if(!v||v.version!==4||!safeKey(v.model)||!v.models||!v.models[v.model]||!v.shift||!v.lighting||!v.trip)throw Error('Configuração incompatível. É necessário um arquivo do editor v4.');
    const normalized=normalize(v);
    // Supplied known values must be valid. Unknown fields never leave the importer.
    function validate(source,target){
      if(!source||typeof source!=='object'||Array.isArray(source))throw Error('Estrutura de configuração inválida.');
      for(const [key,value] of Object.entries(source)){
        if(!safeKey(key))throw Error('Chave de configuração inválida.');
        if(!Object.prototype.hasOwnProperty.call(target,key))continue;
        const expected=target[key];
        if(expected&&typeof expected==='object')validate(value,expected);
        else if(typeof value!==typeof expected||(typeof value==='number'&&value!==expected)||(typeof value==='string'&&value.toLowerCase()!==String(expected).toLowerCase())||(typeof value==='boolean'&&value!==expected))throw Error('Valor inválido na configuração: '+key+'.');
      }
    }
    validate(v,normalized);
    if(Object.keys(record(v.models)).length>32||Object.values(record(v.models)).some(m=>Object.keys(record(record(m).parts)).length>64)||Object.keys(record(v.presets)).length>8)throw Error('A configuração excede o limite de modelos, componentes ou presets.');
    return normalized;
  }
  window.ApexPreferences={normalize,defaults:()=>normalize({}),layout,parseConfig,presetName,storageKey,maxBytes,partNames,clone};
})();
