/* APEX model plugin; the clock, data and editor belong to velo_core. */
(() => {'use strict';let instance=0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const polar=(cx,cy,r,angle)=>{const a=angle*Math.PI/180;return[cx+Math.sin(a)*r,cy-Math.cos(a)*r];};
const arc=(cx,cy,r,a,b)=>{const p=polar(cx,cy,r,a),q=polar(cx,cy,r,b);return `M${p} A${r},${r} 0 ${b-a>180?1:0} 1 ${q}`;};
  function markup() {
    let ticks = '',spokes='';
    for (let i=0;i<=18;i++) {
      const a=-128+i*256/18,major=i%2===0,red=i>=14,outer=polar(233,174,red?112.2:113,a),inner=polar(233,174,major?106.5:108.7,a);
      ticks+=`<path class="tick ${major?'major':''} ${red?'red':''}" d="M${inner} L${outer}"/>`;
      if(major){const p=polar(233,174,68,a),q=polar(233,174,91,a);spokes+=`<path d="M${p} L${q}"/>`;}
    }
    return `<div class="cluster" aria-hidden="true"><svg viewBox="0 0 472 296" xmlns="http://www.w3.org/2000/svg" aria-label="Velocímetro e conta-giros">
      <defs>
        <radialGradient id="glass" cx="47%" cy="40%" r="66%"><stop offset="0" stop-color="#050b10" stop-opacity=".42"/><stop offset=".65" stop-color="#050b10" stop-opacity=".5"/><stop offset="1" stop-color="#030911" stop-opacity=".67"/></radialGradient>
        <clipPath id="lens-clip"><ellipse cx="232" cy="168" rx="124" ry="118"/></clipPath>
        <linearGradient id="lens-coat" x1="146" y1="60" x2="296" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="#dcecff" stop-opacity=".07"/><stop offset=".43" stop-color="#a9c7df" stop-opacity=".012"/><stop offset=".72" stop-color="#162b3c" stop-opacity=".025"/><stop offset="1" stop-color="#020912" stop-opacity=".19"/></linearGradient>
        <radialGradient id="lens-reflection" cx="29%" cy="9%" r="83%"><stop stop-color="#eef6ff" stop-opacity=".105"/><stop offset=".47" stop-color="#cce4f8" stop-opacity=".04"/><stop offset="1" stop-color="#cce4f8" stop-opacity="0"/></radialGradient>
        <linearGradient id="lens-edge" x1="147" y1="65" x2="304" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="#e7f3ff" stop-opacity=".33"/><stop offset=".48" stop-color="#c5dbe9" stop-opacity=".045"/><stop offset=".78" stop-color="#c5dbe9" stop-opacity=".025"/><stop offset="1" stop-color="#b0cee4" stop-opacity=".12"/></linearGradient>
        <linearGradient id="digital-face" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop stop-color="#eaf2fd"/><stop offset=".35" stop-color="#e4edf9"/><stop offset="1" stop-color="#c2d1e3"/></linearGradient>
        <linearGradient id="white-arc" x1="122" y1="230" x2="250" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#cedce6"/><stop offset=".63" stop-color="#dcebf9"/><stop offset="1" stop-color="#f3f5fa"/></linearGradient>
        <linearGradient id="fuel-face" x1="0" y1="139" x2="0" y2="207" gradientUnits="userSpaceOnUse"><stop stop-color="#fbfbf9"/><stop offset=".54" stop-color="#efedef"/><stop offset="1" stop-color="#d6bfc5"/></linearGradient>
        <linearGradient id="core" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#03080d" stop-opacity=".75"/><stop offset="1" stop-color="#050c12" stop-opacity=".08"/></linearGradient>
        <linearGradient id="inner-rim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e3edf4" stop-opacity=".52"/><stop offset=".5" stop-color="#9bb3c3" stop-opacity=".2"/><stop offset="1" stop-color="#7e97ac" stop-opacity="0"/></linearGradient>
        <radialGradient id="red-aura"><stop stop-color="#ff142e" stop-opacity="0"/><stop offset=".67" stop-color="#ff142e" stop-opacity=".015"/><stop offset=".94" stop-color="#ff142e" stop-opacity=".3"/><stop offset="1" stop-color="#ff142e" stop-opacity="0"/></radialGradient>
        <linearGradient id="needle-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff3442"/><stop offset=".55" stop-color="#ff1429"/><stop offset="1" stop-color="#fa1630" stop-opacity=".4"/></linearGradient>
        <filter id="text-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/><feComponentTransfer><feFuncA type="linear" slope=".2"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="red-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="needle-glow" x="-100%" y="-50%" width="300%" height="200%"><feGaussianBlur stdDeviation="2.2"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="red-text-glow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ff142e" flood-opacity=".9"/></filter>
        <mask id="needle-mask"><rect width="472" height="296" fill="white"/><circle cx="233" cy="174" r="60" fill="black"/></mask>
        <clipPath id="panel-clip"><rect x="32" y="45" width="427" height="241" rx="18"/></clipPath>
        <linearGradient id="raster-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#cdeaff" stop-opacity="0"/><stop offset=".85" stop-color="#cdeaff" stop-opacity=".11"/><stop offset="1" stop-color="#eaf7ff" stop-opacity=".5"/></linearGradient>
      </defs>
      <g class="dial-shell" data-edit-part="dial" data-pivot-x="233" data-pivot-y="174"><ellipse cx="232" cy="168" rx="124" ry="118" fill="url(#glass)"/><circle class="redline-aura" cx="233" cy="174" r="132" fill="url(#red-aura)"/>
      <g class="instrument-light">
        <path data-part="normal-arc" d="${arc(233,174,113,-128,-128+7*256/9)}" fill="none" stroke="url(#white-arc)" stroke-width="1.55"/>
        <path data-part="normal-rim" d="${arc(233,174,111.3,-128,-128+7*256/9)}" fill="none" stroke="#718a9d" stroke-width=".65" opacity=".25"/>
        <path data-part="red-arc" d="${arc(233,174,108.8,-128+7*256/9,128)}" fill="none" stroke="#fc1024" stroke-width="6.8" class="red-band"/>
        <path d="${arc(233,174,122,69,132)}" fill="none" stroke="#ff2036" stroke-width=".7" opacity=".16"/>
        <g data-part="scale-ticks"><g class="inner-spokes">${spokes}</g>${ticks}</g><g data-part="numbers"></g>
        <path class="sweep-ring" d="${arc(233,174,118,-128,128)}" fill="none" stroke="#e9f6ff" stroke-width="2"/>
      </g>
      <g mask="url(#needle-mask)"><g class="needle" data-part="needle"><path d="M231.1 118 L231.5 71 L234.9 71 L235 118 Z" fill="url(#needle-fill)" filter="url(#needle-glow)"/></g></g>
      <circle cx="233" cy="174" r="65" fill="url(#core)" stroke="url(#inner-rim)" stroke-width="1.1"/>
      <path d="M210 144 Q209 130 224 127 Q241 122 252 135 L251 170 H210Z" fill="#667789" opacity=".065"/>
      <path d="M184 176 H280" stroke="#b1c5d5" stroke-width=".6" opacity=".32"/>
      <path class="shift-flash" d="M184 175 H280 V177 H184Z"/>
      <g data-edit-part="gear" data-pivot-x="233" data-pivot-y="149">
      <g transform="translate(233 0) skewX(-9)"><text class="gear-value readout" data-part="gear" x="0" y="164">N</text></g>
      <g class="gear-ink readout" data-part="gear-ink"></g>
      <text class="small-label" data-part="mode" x="259" y="164">M</text>
      </g><g data-edit-part="speed" data-pivot-x="233" data-pivot-y="216">
      <g transform="translate(231 0) skewX(-9)"><text class="speed-value readout" data-part="speed" x="0" y="231">0</text></g>
      <g class="speed-ink readout" data-part="speed-ink"></g>
      <text class="small-label" data-part="unit" x="233" y="251">KM/H</text>
      <text class="warning-readout" data-part="warning" x="233" y="271"></text>
      </g>
      <g class="apex-trip-inline" data-edit-part="trip" data-pivot-x="233" data-pivot-y="264"><text data-part="odometer" x="233" y="265">ODO 000000.0 km</text></g>
      <text class="rpm-label" x="149" y="259">RPM<tspan x="149" dy="10">x1000</tspan></text></g>
      <g class="instrument-light">
        <g class="fuel-gauge" data-edit-part="fuel" data-pivot-x="64" data-pivot-y="174">
        ${ApexDesign.gaugeTrack('fuel')}
        <g data-part="fuel-bars"></g>${ApexDesign.gaugeCuts('fuel')}<text class="side-label" x="85" y="103">F</text><text class="side-label" x="70" y="240">E</text>
        <g class="fuel-symbol">${ApexDesign.icon('fuel')}</g>
        </g>
        <g data-edit-part="temperature" data-pivot-x="422" data-pivot-y="220">
        ${ApexDesign.gaugeTrack('temperature')}
        <g data-part="temp-bars"></g>${ApexDesign.gaugeCuts('temperature')}<text class="side-label" x="428" y="176" style="fill:#ff273c!important">H</text><text class="side-label" x="440" y="183" opacity=".5">H</text><text class="side-label" x="387" y="265">C</text>
        <g class="temp-symbol">${ApexDesign.icon('temperature')}</g>
        </g>
      </g>
      <g data-edit-part="lamps" data-pivot-x="378" data-pivot-y="161">
      <g class="lamp lamp-red lamp-seatbelt" data-lamp="seatbelt">${ApexDesign.icon('seatbelt')}</g>
      <g class="lamp lamp-engine" data-lamp="engineWarning">${ApexDesign.icon('engineWarning')}</g>
      <g class="lamp lamp-red lamp-brake" data-lamp="handbrake">${ApexDesign.icon('handbrake')}</g>
      <g class="lamp lamp-abs" data-lamp="abs">${ApexDesign.icon('abs')}</g>
      <g class="lamp lamp-traction" data-lamp="traction">${ApexDesign.icon('traction')}</g>
      <g class="lamp lamp-red lamp-temperature" data-lamp="temperatureWarning" transform="translate(368 233)"><path d="M8 3 V12 A4 4 0 1 0 13 12 V3 Q10.5 -1 8 3 M13 4 H16 M13 8 H16 M10.5 7 V15"/><path d="M1 21 Q3 19 5 21 T9 21 T13 21 T17 21"/></g>
      </g>
      <g class="signal-lights" data-edit-part="signals" data-pivot-x="233" data-pivot-y="115">
        <g class="lamp lamp-signal" data-lamp="left" transform="translate(191 96)"><path d="M0 6 7 0 V3 H17 V9 H7 V12 Z" fill="currentColor" stroke="none"/></g>
        <g class="lamp lamp-signal" data-lamp="right" transform="translate(256 96)"><path d="M17 6 10 0 V3 H0 V9 H10 V12 Z" fill="currentColor" stroke="none"/></g>
        <g class="lamp lamp-red lamp-hazard" data-lamp="hazard" transform="translate(226 87)"><path d="M7 0 14 13 H0 Z M7 4 10.5 10 H3.5 Z" fill="currentColor" fill-rule="evenodd" stroke="none"/></g>
      </g>
      <g class="glass-lens" aria-hidden="true" pointer-events="none">
        <g clip-path="url(#lens-clip)">
          <ellipse cx="232" cy="168" rx="124" ry="118" fill="url(#lens-coat)"/>
          <path d="M100 137 C160 109 237 99 348 125 L366 46 H98Z" fill="url(#lens-reflection)"/>
        </g>
        <ellipse cx="232" cy="168" rx="123.7" ry="117.7" fill="none" stroke="url(#lens-edge)" stroke-width=".65"/>
      </g>
      <g class="startup-raster" clip-path="url(#panel-clip)"><g data-part="raster"><rect x="32" y="-28" width="427" height="28" fill="url(#raster-light)"/><path d="M34 0 H457" stroke="#d6f0ff" stroke-width=".8" opacity=".7"/></g></g>
    </svg></div>`;
  }

class ApexView {
 constructor(host){
  this.prefix=`apex-${++instance}-`;
  let html=markup().replace(/id="([^"]+)"/g,(_,id)=>`id="${this.prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${this.prefix}${id})`);
  host.innerHTML=html;this.root=host.firstElementChild;
  for(const [key,id]of Object.entries({'--digit-fill':'digital-face','--text-filter':'text-glow','--red-filter':'red-glow','--limiter-filter':'red-text-glow'}))this.root.style.setProperty(key,`url(#${this.prefix}${id})`);
  this.parts=Object.fromEntries([...host.querySelectorAll('[data-part]')].map(e=>[e.dataset.part,e]));
  this.lamps=Object.fromEntries([...host.querySelectorAll('[data-lamp]')].map(e=>[e.dataset.lamp,e]));
  this.root.querySelector('.dial-shell').append(this.root.querySelector('.glass-lens'));
  this.bars={fuel:ApexDesign.buildGauge(this.parts['fuel-bars'],'fuel'),temperature:ApexDesign.buildGauge(this.parts['temp-bars'],'temperature')};
  // Fill URLs are generated by the geometry helper and must also be instance-local.
  this.bars.fuel.forEach(e=>{for(const attr of ['fill','stroke'])if(e.getAttribute(attr)==='url(#fuel-face)')e.setAttribute(attr,`url(#${this.prefix}fuel-face)`);});
  this.key='';this.colors={};this.signalKey='';this.signalAt=0;
 }
 theme(colors={}){
  const accent=colors.accent||'#ff1328',ink=colors.text||'#e4eef9';this.root.style.setProperty('--model-accent',accent);this.root.style.setProperty('--model-text',ink);
  const stops=id=>this.root.querySelectorAll(`#${this.prefix}${id} stop`);
  stops('needle-fill').forEach(s=>s.setAttribute('stop-color',accent));stops('red-aura').forEach(s=>s.setAttribute('stop-color',accent));stops('digital-face').forEach(s=>s.setAttribute('stop-color',ink));
 }
 render({state:s={},current:v={},config:c={},boot=false,phase='idle',progress=0,now=0,shifting=false,tripSettings={}}={}){
  this.root.classList.toggle('is-visible',!!s.visible);this.root.setAttribute('aria-hidden',String(!s.visible));
  this.root.classList.toggle('is-off',!s.engine);this.root.classList.toggle('reduce-motion',c.animation===false);
  this.root.classList.toggle('is-shifting',shifting&&!boot&&c.animation!==false);
  this.root.classList.toggle('is-booting',boot);this.root.classList.toggle('is-raster',phase==='raster');this.root.classList.toggle('is-testing',boot&&['up','peak','down','zero'].includes(phase));this.root.dataset.bootPhase=phase;
  const scaleKey=`${c.maxRpm}:${c.redline}`;
  if(this.key!==scaleKey){
   this.key=scaleKey;const redline=clamp(c.redline??.78,.1,.99),end=-128+redline*256;
   const entries=window.VeloRpmScale?.ticks(c.maxRpm)||Array.from({length:19},(_,i)=>({fraction:i/18,major:i%2===0,label:String(i/2)}));
   this.parts.numbers.innerHTML=entries.filter(t=>t.major).map(t=>{const p=polar(233,174,96,-128+t.fraction*256);return `<text class="dial-label ${t.fraction>=redline?'red':''}" x="${p[0]}" y="${p[1]+5}">${t.label}</text>`;}).join('');
   this.parts['scale-ticks'].innerHTML=entries.map(t=>{const a=-128+t.fraction*256,red=t.fraction>=redline,outer=polar(233,174,red?112.2:113,a),inner=polar(233,174,t.major?106.5:108.7,a);return `<path class="tick ${t.major?'major':''} ${red?'red':''}" d="M${inner} L${outer}"/>`;}).join('')+'<g class="inner-spokes">'+entries.filter(t=>t.major).map(t=>{const p=polar(233,174,68,-128+t.fraction*256),q=polar(233,174,91,-128+t.fraction*256);return `<path d="M${p} L${q}"/>`;}).join('')+'</g>';
   this.parts['normal-arc'].setAttribute('d',arc(233,174,113,-128,end));this.parts['normal-rim'].setAttribute('d',arc(233,174,111.3,-128,end));this.parts['red-arc'].setAttribute('d',arc(233,174,108.8,end,128));
  }
  const valid=s.availability||{},known=key=>boot||valid[key]!==false;
  const jitter=known('rpm')&&s.engine&&!boot&&c.animation!==false&&s.rpm>=c.limiter?Math.sin(now*.085)*.48:0;
  this.parts.needle.setAttribute('transform',`rotate(${-128+clamp(v.rpm||0,0,1)*256+jitter} 233 174)`);
  this.parts.needle.style.visibility=known('rpm')?'':'hidden';
  const speed=known('speed')?String(Math.round(v.speed||0)):'--',gear=known('gear')?s.gear||'N':'-';this.parts.speed.textContent=speed;this.parts.gear.textContent=gear;this.parts.mode.textContent=s.mode||'M';this.parts.unit.textContent=c.unit||'KM/H';
  ApexDesign.drawDigits(this.parts['speed-ink'],speed,40.5,233,190);ApexDesign.drawDigits(this.parts['gear-ink'],gear,31.5,231.8,132.5);
  const low=!boot&&known('fuel')&&(s.fuel||0)<=c.lowFuel,hot=!boot&&known('temperature')&&s.temperature>=c.hotTemperature;
  for(const [key,on] of Object.entries({'is-low-fuel':low,'is-hot':hot,'is-redline':known('rpm')&&s.engine&&!boot&&s.rpm>=c.redline,'is-limiter':known('rpm')&&s.engine&&!boot&&s.rpm>=c.limiter,'is-unbuckled':!boot&&s.speed>15&&!s.seatbelt,'is-abs':!boot&&s.abs,'is-traction':!boot&&s.traction}))this.root.classList.toggle(key,!!on);
  const signalKey=`${!!s.left}:${!!s.right}`;if(signalKey!==this.signalKey){this.signalKey=signalKey;this.signalAt=now;}
  const flash=c.animation===false||Math.floor(Math.max(0,now-this.signalAt)/420)%2===0;
  for(const [key,el] of Object.entries(this.lamps)){const active=key==='seatbelt'?s.seatbeltAvailable!==false&&!s.seatbelt:key==='temperatureWarning'?hot:key==='engineWarning'?s.engineWarning||!s.engine||hot:key==='hazard'?s.left&&s.right&&flash:['left','right'].includes(key)?s[key]&&flash:s[key];el.classList.toggle('is-on',!boot&&!!active);}
  this.parts.warning.textContent=hot?(low?'TEMP. ALTA · RESERVA':'TEMPERATURA ALTA'):low?'COMBUSTÍVEL NA RESERVA':'';
  const odo=Number.isFinite(s.trip?.odometerKm)?Math.max(0,s.trip.odometerKm):0,imperial=c.unit==='MPH';
  const odoText='ODO '+(odo*(imperial?.6213711922:1)).toFixed(1).padStart(8,'0')+(imperial?' mi':' km');
  if(this.parts.odometer.textContent!==odoText)this.parts.odometer.textContent=odoText;
  this.parts.odometer.style.display=tripSettings.enabled===true&&tripSettings.mode!=='floating'&&!boot&&!hot&&!low?'':'none';
  for(const [kind,amount] of [['fuel',known('fuel')?(v.fuel||0)/100:0],['temperature',known('temperature')?clamp(((v.temperature||40)-40)/90,0,1):0]])this.bars[kind].forEach(e=>{const opacity=amount>=Number(e.dataset.threshold)?'1':'0';if(e.style.opacity!==opacity)e.style.opacity=opacity;});
  for(const key of ['rpm','fuel','temperature'])this.root.classList.toggle('data-missing-'+key,!known(key));
  this.parts.raster.setAttribute('transform',`translate(0 ${40+clamp((progress||0)/.18,0,1)*256})`);
 }
}
window.VeloModels.register({id:'apex',create:host=>new ApexView(host)});
})();
