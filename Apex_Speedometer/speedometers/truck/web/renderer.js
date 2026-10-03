/* Five-dial truck cluster inspired by the supplied dashboard photograph. */
(() => {
  'use strict';
  const carbonUrl=new URL('../../../web/assets/materials/carbon-fiber.jpg',document.currentScript?.src||location.href).href;
  let serial=0;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const finite=(n,f=0)=>typeof n==='number'&&Number.isFinite(n)?n:f;
  const point=(cx,cy,r,a)=>{const t=a*Math.PI/180;return [cx+Math.sin(t)*r,cy-Math.cos(t)*r];};
  const arc=(cx,cy,r,a,b)=>{const p=point(cx,cy,r,a),q=point(cx,cy,r,b);return `M${p[0].toFixed(2)} ${p[1].toFixed(2)} A${r} ${r} 0 ${b-a>180?1:0} 1 ${q[0].toFixed(2)} ${q[1].toFixed(2)}`;};
  const label=(n)=>String(Number.isInteger(n)?n:Number(n.toFixed(1)));
  function ticks(cx,cy,r,max,step,unit='',redFrom=Infinity,labelEvery=step*2){let out='';for(let value=0;value<=max+.0001;value+=step){const fraction=value/max,a=-128+fraction*256,major=Math.abs(value/labelEvery-Math.round(value/labelEvery))<.001||Math.abs(value-max)<.001,mid=Math.abs(value/(labelEvery/2)-Math.round(value/(labelEvery/2)))<.001,p=point(cx,cy,r,a),q=point(cx,cy,r-(major?9:mid?6:3),a);out+=`<path class="truck-tick${major?' major':mid?' medium':' micro'}${value>=redFrom?' danger':''}" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`;if(major){const edge=(cx===260&&(value===0||value===max))?r-12:r-21,t=point(cx,cy,edge,a);out+=`<text class="truck-tick-label${value>=redFrom?' danger':''}" x="${t[0].toFixed(1)}" y="${(t[1]+3).toFixed(1)}">${label(value)}${unit}</text>`;}}
    return out;
  }
  function dial(id,cx,cy,r,title,scale){const small=id.endsWith('fuel')||id.endsWith('temp')||id.endsWith('health'),titleY=small?cy+r*.45:id.endsWith('rpm')?cy+r*.39:cy-r*.33,redStart=id.endsWith('rpm') ? .76 : id.endsWith('temp') ? .78 : id.endsWith('fuel') ? .88 : id.endsWith('health') ? .85 : 1.1;return `<g class="truck-dial" data-dial="${id}"><circle cx="${cx}" cy="${cy}" r="${r+8}" class="truck-rim-highlight" stroke="url(#${id}-metal)"/><circle cx="${cx}" cy="${cy}" r="${r+6}" class="truck-rim-outer" stroke="url(#${id}-metal)"/><circle cx="${cx}" cy="${cy}" r="${r+2}" class="truck-rim-inner"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-face)" class="truck-face"/><circle cx="${cx}" cy="${cy}" r="${r-1}" fill="url(#${id}-carbon)" class="truck-carbon-face"/><circle cx="${cx}" cy="${cy}" r="${r-3}" class="truck-inner-line"/><path class="truck-arc" d="${arc(cx,cy,r-3,-128,128)}"/>${redStart<1?`<path class="truck-warning-arc" d="${arc(cx,cy,r-4,-128+redStart*256,128)}"/>`:''}<path data-boot-scan class="truck-boot-scan" pathLength="100" d="${arc(cx,cy,r-4,-128,128)}"/><g data-scale="${id}">${scale}</g><g data-needle="${id}" class="truck-needle" transform="rotate(-128 ${cx} ${cy})"><path d="M${cx-2} ${cy+8} L${cx-1} ${cy-r+16} L${cx+1} ${cy-r+16} L${cx+2} ${cy+8} Z"/><circle cx="${cx}" cy="${cy}" r="4"/></g><text class="truck-title" x="${cx}" y="${titleY}">${title}</text><circle cx="${cx}" cy="${cy}" r="${r-1}" fill="url(#${id}-glass)" class="truck-dial-glass" pointer-events="none"/></g>`;}
  function markup(prefix){
    const slots=['P','R','N','1','2','3','4','5','6','7','8','9'].map((gear,index)=>`<text data-gear-slot="${gear}" x="${216+index*8}" y="209">${gear}</text>`).join('');
    const face=id=>`<pattern id="${id}-carbon" patternUnits="userSpaceOnUse" width="96" height="96"><image href="${carbonUrl}" width="96" height="96" preserveAspectRatio="xMidYMid slice"/></pattern><radialGradient id="${id}-face" cx="42%" cy="35%" r="72%"><stop stop-color="#0b0d0e"/><stop offset=".52" stop-color="#060809"/><stop offset="1" stop-color="#010304"/></radialGradient><linearGradient id="${id}-metal" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#18282e"/><stop offset=".13" stop-color="#d7e2e5"/><stop offset=".27" stop-color="#576a71"/><stop offset=".48" stop-color="#a5b8bc"/><stop offset=".75" stop-color="#35474e"/><stop offset=".9" stop-color="#e4eef0"/><stop offset="1" stop-color="#111d22"/></linearGradient><linearGradient id="${id}-glass" x1="5%" y1="0%" x2="84%" y2="100%"><stop stop-color="#e4f6ff" stop-opacity=".075"/><stop offset=".36" stop-color="#bfdce9" stop-opacity=".009"/><stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".025"/></linearGradient>`;
    return `<svg class="truck-instrument" viewBox="0 0 600 285" role="img" aria-label="Painel de caminhão com cinco mostradores">
      <defs>${['speed','rpm','fuel','temp','health'].map(v=>face(prefix+v)).join('')}</defs>
      <g data-edit-part="rpm" data-pivot-x="78" data-pivot-y="161">${dial(prefix+'rpm',78,161,72,'RPM ×1000',ticks(78,161,67,9,.1,'',7,1))}</g>
      <g data-edit-part="speed" data-pivot-x="260" data-pivot-y="143">${dial(prefix+'speed',260,143,110,'KM/H',ticks(260,143,104,140,2,'',Infinity,20))}<text data-read="speed" class="truck-speed" x="260" y="178">0</text>
        <g data-edit-part="gear" data-pivot-x="260" data-pivot-y="204" class="truck-gear-strip"><rect x="210" y="196" width="100" height="17" rx="3"/><path data-gear-caret d="M-2.5 194 L0 198 L2.5 194 Z" transform="translate(232 0)"/>${slots}</g>
      </g>
      <g data-edit-part="fuel" data-pivot-x="438" data-pivot-y="96">${dial(prefix+'fuel',438,96,53,'COMB.',ticks(438,96,49,100,2,'',90,20))}<g class="truck-fixed-symbol" transform="translate(437 78)"><path d="M-4-5 h7 v11 h-7 Z M-2-2 h3 M3-3 q4-2 4 2 v5 q3 2 3-2 v-7"/></g><text data-read="fuelPct" class="truck-gauge-value" x="438" y="136">--%</text></g>
      <g data-edit-part="temperature" data-pivot-x="438" data-pivot-y="200">${dial(prefix+'temp',438,200,51,'',ticks(438,200,46,140,4,'',120,40))}<g class="truck-fixed-symbol" transform="translate(438 216)"><path d="M-2-6 v10 a4 4 0 1 0 4 0 v-10 q-2-3-4 0 M0-3 v9"/></g><text data-read="tempC" class="truck-gauge-value" x="438" y="239">--°C</text></g>
      <g data-edit-part="health" data-pivot-x="550" data-pivot-y="164">${dial(prefix+'health',550,164,38,'MOTOR',ticks(550,164,34,100,5,'',85,50))}</g>
      <g data-edit-part="trip" data-pivot-x="260" data-pivot-y="217" class="truck-trip">
       <rect x="214" y="218" width="92" height="17" rx="2.5" class="truck-trip-screen"/>
       <text class="truck-trip-label" x="220" y="230">ODO</text><text data-travel="odometer" class="truck-odometer" x="300" y="231">000000.0 km</text>
       <g class="truck-trip-extra"><text class="truck-trip-label" x="199" y="267">MOV</text><text data-travel="time" class="truck-trip-value" x="248" y="267">0 min</text>
       <text class="truck-trip-label" x="263" y="267">AUT</text><text data-travel="range" class="truck-trip-value" x="320" y="267">-- km</text>
       <text class="truck-trip-label" x="199" y="278">GPS</text><text data-travel="destination" class="truck-trip-value" x="248" y="278">--</text>
       <text class="truck-trip-label" x="263" y="278">ETA</text><text data-travel="eta" class="truck-trip-value" x="320" y="278">Sem rota</text></g>
      </g>
      <g data-edit-part="signals" data-pivot-x="260" data-pivot-y="126" class="truck-signals"><path data-lamp="left" d="M218 126 l8-6 v4 h10 v4 h-10 v4Z"/><g data-lamp="hazard" class="truck-hazard" transform="translate(260 126)"><path d="M0-10 L10 8 H-10 Z"/><path d="M0-4 V2 M0 5 V5.4"/></g><path data-lamp="right" d="M302 126 l-8-6 v4 h-10 v4 h10 v4Z"/></g>
      <g data-edit-part="lamps" data-pivot-x="300" data-pivot-y="164" class="truck-lamps">
        <g data-lamp="engine" transform="translate(78 64)"><title>Motor</title><path d="M-9-4 h4 v-4 h8 v4 h4 l3 3 v6 h-3 l-2 3 h-11 l-2-3 h-3 v-7Z"/></g>
        <g data-lamp="battery" transform="translate(46 64)"><title>Bateria</title><path d="M-9-5 h18 v12 h-18 Z M-6-5 v-3 h3 v3 M3-5 v-3 h3 v3 M-5 1 h4 M4-1 v4 M2 1 h4"/></g>
        <g data-lamp="oil" transform="translate(110 64)"><title>Óleo</title><path d="M-8-4 h9 l3-3 h4 v3 l5-2 v3 l-4 6 h-17 Z M-4-7 h5 M12 2 q-3 6 0 6 q3 0 0-6"/></g>
        <g data-lamp="temperature" transform="translate(408 266)"><title>Temperatura</title><path d="M-3 2 v-9 q3-4 6 0 v9 a5 5 0 1 1 -6 0 M0-5 v9 M6-5 h4 M6-1 h4"/></g>
        <g data-lamp="fuel" transform="translate(406 17)"><title>Combustível</title><path d="M-6 7 v-13 h8 v13 M-8 7 h12 M-4-3 h4 M2-4 q5-3 5 3 v6 q4 4 4-2 v-8"/></g>
        <g data-lamp="handbrake" transform="translate(181 263)"><title>Freio de mão</title><circle r="8"/><path d="M-3 4 v-8 h4 q4 0 4 3 t-4 3 h-4 M-11-5 q-3 5 0 10 M11-5 q3 5 0 10"/></g>
        <g data-lamp="seatbelt" transform="translate(338 263)"><title>Cinto de segurança</title><circle cx="-1" cy="-9" r="2.4"/><path d="M-5-4 Q-1-6 3-3 L5 3 M-5-4 L-6 5 L5 5 L8 9 M-9 9 H7 M-8-1 L4 8 M4 6 H8 V10 H4 Z"/></g>
        <g data-lamp="abs" transform="translate(407 17)"><title>ABS</title><circle r="8"/><text x="0" y="3">ABS</text></g>
        <g data-lamp="traction" transform="translate(407 266)"><title>Tração</title><path d="M-9-4 h18 v8 h-18 Z M-11 7 l4-3 M2 7 l4-3 M10 7 l4-3"/><text x="0" y="2">TC</text></g>
        <g data-lamp="headlights" transform="translate(530 80)"><title>Faróis</title><path d="M-3-6 q11 6 0 12 Z M-10-5 h5 M-10-1 h5 M-10 3 h5 M-10 7 h5"/></g>
        <g data-lamp="door" transform="translate(564 80)"><title>Porta aberta</title><path d="M-7-7 h14 v14 h-14 Z M-3-5 h6 v9 h-6 Z M-9-2 l-4 3 M9-2 l4 3"/></g>
      </g>
    </svg>`;
  }
  function applyDefaultLayout(root,prefix){
    const parts=window.VeloTruckLayoutDefault?.parts;if(!parts)return;
    const targets=new Map();
    for(const el of root.querySelectorAll('.truck-signals [data-lamp],.truck-lamps [data-lamp]'))targets.set('lamp:'+el.dataset.lamp,el);
    for(const el of root.querySelectorAll('.truck-dial .truck-title'))targets.set('title:'+el.closest('[data-dial]').dataset.dial.slice(prefix.length),el);
    for(const el of root.querySelectorAll('[data-read]'))targets.set('read:'+el.dataset.read,el);
    for(const el of root.querySelectorAll('[data-travel]'))targets.set('travel:'+el.dataset.travel,el);
    root.querySelectorAll('.truck-trip-label').forEach((el,index)=>targets.set('travel-label:'+index,el));
    for(const layer of [parts,window.VeloTruckLayoutDefault.refinements||{},window.VeloTruckLayoutDefault.adjustments||{},window.VeloTruckLayoutDefault.arrangement||{}])for(const [id,position] of Object.entries(layer)){
      const el=targets.get(id);if(!el)continue;
      const {x=0,y=0,scale=1,text}=position,box=el.getBBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
      const base=el.getAttribute('transform')||'';
      el.setAttribute('transform',`${base} translate(${x} ${y}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`.trim());
      if(typeof text==='string'&&!el.hasAttribute('data-read')&&!el.hasAttribute('data-travel'))el.textContent=text;
    }
  }
  class TruckView {
    constructor(host){this.root=document.createElement('div');this.root.className='truck-view';this.prefix=`truck-${++serial}-`;this.root.innerHTML=markup(this.prefix);host.append(this.root);this.nodes={};this.root.querySelectorAll('[data-read],[data-travel],[data-lamp],[data-needle],[data-scale],[data-dial]').forEach(el=>{const key=el.dataset.read||el.dataset.travel||el.dataset.lamp||el.dataset.needle||el.dataset.scale||el.dataset.dial;(this.nodes[key]??=[]).push(el);});this.scanNodes=[...this.root.querySelectorAll('[data-boot-scan]')];this.motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');this.scanning=false;this.lastScale='';this.layoutApplied=false;}
    theme(colors={}){this.root.style.setProperty('--model-accent',colors.accent||'#e32132');this.root.style.setProperty('--model-text',colors.text||'#f0f1ed');}
    text(name,value){for(const node of this.nodes[name]||[]){const str=String(value);if(node.textContent!==str)node.textContent=str;}}
    angle(name,fraction,cx,cy){for(const el of this.nodes[name]||[])if(el.matches('[data-needle]'))el.setAttribute('transform',`rotate(${-128+clamp(finite(fraction),0,1)*256} ${cx} ${cy})`);}
    render({state:s={},current:c={},config:k={},boot=false,phase='idle',progress=null,shifting=false,now=0,tripSettings={}}={}){
      const known=name=>boot||s.availability?.[name]!==false,engine=s.engine===true;
      const animated=k.animation!==false&&!this.motionQuery.matches;
      const unit=String(k.unit).toUpperCase()==='MPH'?'MPH':'KM/H',maxSpeed=unit==='MPH'?90:140;
      const gaugeKey=`${maxSpeed}:${k.maxRpm}:${k.redline}`;
      if(gaugeKey!==this.lastScale){this.lastScale=gaugeKey;const speed=this.root.querySelector(`[data-scale="${this.prefix}speed"]`);speed.innerHTML=ticks(260,143,104,maxSpeed,2,'',Infinity,unit==='MPH'?10:20);const title=this.root.querySelector(`[data-dial="${this.prefix}speed"] .truck-title`);title.textContent=unit;const rpm=this.root.querySelector(`[data-scale="${this.prefix}rpm"]`);const values=window.VeloRpmScale?.ticks(k.maxRpm)||[];let content='';for(let i=0;i<=90;i++){const fraction=i/90,a=-128+fraction*256,p=point(78,161,67,a),q=point(78,161,64,a);content+=`<path class="truck-tick micro${fraction>=finite(k.redline,.78)?' danger':''}" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`;}for(const v of values){const a=-128+v.fraction*256,p=point(78,161,67,a),q=point(78,161,v.major?58:62,a),danger=v.fraction>=finite(k.redline,.78);content+=`<path class="truck-tick${v.major?' major':' medium'}${danger?' danger':''}" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`;if(v.major){const t=point(78,161,47,a);content+=`<text class="truck-tick-label${danger?' danger':''}" x="${t[0].toFixed(1)}" y="${(t[1]+3).toFixed(1)}">${v.label}</text>`;}}rpm.innerHTML=content;}
      this.root.classList.toggle('truck-boot',animated&&boot);this.root.classList.toggle('truck-reduced-motion',!animated);this.root.classList.toggle('truck-shifting',animated&&!!shifting&&!boot);this.root.classList.toggle('truck-engine-off',!engine);this.root.classList.toggle('truck-lamp-test',animated&&boot&&['up','peak','down','zero'].includes(phase));this.root.classList.toggle('truck-low-fuel',known('fuel')&&s.fuel<=finite(k.lowFuel,15));this.root.classList.toggle('truck-hot',known('temperature')&&s.temperature>=finite(k.hotTemperature,115));this.root.classList.toggle('truck-redline',known('rpm')&&engine&&!boot&&s.rpm>=finite(k.redline,.78));
      const scanning=animated&&boot&&['raster','up','peak','down'].includes(phase),sweep=clamp(finite(progress),0,1);
      if(scanning)for(let i=0;i<this.scanNodes.length;i++){const node=this.scanNodes[i],position=clamp((sweep-.025-i*.035)/.55,0,1);node.style.opacity=position>0&&position<1?'1':'0';node.style.strokeDashoffset=String(96-position*102);}
      else if(this.scanning)for(const node of this.scanNodes)node.style.opacity='0';
      this.scanning=scanning;
      this.angle(this.prefix+'speed',finite(c.speed)/maxSpeed,260,143);this.angle(this.prefix+'rpm',engine?finite(c.rpm):0,78,161);this.angle(this.prefix+'fuel',finite(c.fuel)/100,438,96);this.angle(this.prefix+'temp',boot?(finite(c.temperature,40)-40)/90:finite(c.temperature,40)/140,438,200);this.angle(this.prefix+'health',boot?finite(c.rpm):finite(s.engineHealth,0)/1000,550,164);
      for(const [id,name] of [[this.prefix+'speed','speed'],[this.prefix+'rpm','rpm'],[this.prefix+'fuel','fuel'],[this.prefix+'temp','temperature'],[this.prefix+'health','engineHealth']])for(const el of this.nodes[id]||[])if(el.matches('[data-needle]'))el.style.visibility=known(name)?'':'hidden';
      this.text('speed',known('speed')?Math.round(finite(c.speed)):'--');
      this.text('fuelPct',known('fuel')?Math.round(finite(c.fuel))+'%':'--%');this.text('tempC',known('temperature')?Math.round(finite(c.temperature))+'°C':'--°C');
      const gear=known('gear')?String(s.gear||'N'):'-',lastSlot=this.root.querySelector('[data-gear-slot="9"]');
      lastSlot.textContent=/^(?:9|1[0-2])$/.test(gear)?gear:'9';
      const slots=this.root.querySelectorAll('[data-gear-slot]');let activeIndex=2;
      slots.forEach((slot,index)=>{const active=slot.dataset.gearSlot===gear||slot===lastSlot&&/^(?:9|1[0-2])$/.test(gear);slot.classList.toggle('is-current',active);if(active)activeIndex=index;});
      this.root.querySelector('[data-gear-caret]').setAttribute('transform',`translate(${216+activeIndex*8} 0)`);
      const display=window.VeloTravelDisplay?.format(s.trip||{},k)||{odometer:'000000.0 km',time:'0 min',range:'-- km',eta:'Sem rota',destination:'--'};
      this.text('odometer',display.odometer);
      const short=value=>String(value||'--').replace(/Sem rota|Chegou/g,'--').replace(/\s+(?:min|km|mi)\b/g,unit=>unit.trim()==='min'?'m':unit.trim()).replace(/\s+/g,'');
      for(const key of ['time','range','eta','destination'])this.text(key,short(display[key]));
      const showExtras=tripSettings.enabled===true&&tripSettings.mode!=='floating'&&!boot;
      this.root.querySelector('.truck-trip-extra').style.display=showExtras?'':'none';
      const blink=k.animation===false||Math.floor(finite(now)/400)%2===0;
      for(const [key,on] of Object.entries({left:s.left&&blink,right:s.right&&blink,hazard:s.left&&s.right&&blink,engine:s.engineWarning,battery:s.batteryWarning,oil:s.oilWarning,temperature:known('temperature')&&s.temperature>=finite(k.hotTemperature,115),fuel:known('fuel')&&s.fuel<=finite(k.lowFuel,15),handbrake:s.handbrake,seatbelt:s.seatbeltAvailable!==false&&!s.seatbelt&&engine,abs:s.abs,traction:s.traction,headlights:s.headlights||s.highbeam,door:s.doorOpen}))for(const el of this.nodes[key]||[])if(el.matches('[data-lamp]'))el.classList.toggle('is-on',animated&&boot?true:!!on);
      if(!this.layoutApplied&&this.root.getBoundingClientRect().width>0){applyDefaultLayout(this.root,this.prefix);this.layoutApplied=true;}
    }
  }
  window.VeloModels.register({id:'truck',create:host=>new TruckView(host)});
})();
