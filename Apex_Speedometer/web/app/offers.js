/* Offline offer configuration. In FiveM, Config.ModelOffers replaces this list. */
(() => {
  'use strict';
  const defaults=[]; // Future optional layouts may be offered through Config.ModelOffers.
  const base=new URL('../',document.currentScript.src);
  let entries=[];
  function webURL(value){
    if(typeof value!=='string'||!/^https?:\/\//i.test(value.trim()))return null;
    try{const u=new URL(value.trim());return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
  }
  function set(input){
    const seen=new Set();entries=(Array.isArray(input)?input:[]).filter(d=>d&&/^[-\w]{1,48}$/.test(d.id)&&/^[-\w]{1,80}$/.test(d.resource)&&!seen.has(d.id)&&seen.add(d.id)).map(d=>({
      id:d.id,resource:d.resource,name:String(d.name||d.id).slice(0,80),
      description:String(d.description||'Adicione este modelo ao seu painel.').slice(0,300),url:webURL(d.url),
      installed:['started','starting','stopped','stopping'].includes(d.resourceState),
      preview:typeof d.preview==='string'&&/^assets\/[\w/.-]+\.(png|jpe?g|webp)$/i.test(d.preview)&&!d.preview.includes('..')?new URL(d.preview,base).href:null
    }));
    window.dispatchEvent(new Event('velo:offers'));
  }
  window.VeloOffers={set,get list(){return entries.map(d=>({...d}));}};
  window.addEventListener('message',e=>{if(e.data?.source==='Apex_Speedometer'&&e.data.action==='catalog'&&e.data.offers)set(e.data.offers);});
  set(defaults);
})();
