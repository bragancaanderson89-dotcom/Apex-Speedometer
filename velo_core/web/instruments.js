/* Vehicle calibration, day/night presentation and optional travel instrument. */
(() => {
 'use strict';
 const hud=window.apexHud;
 const clamp=(v,min,max,f)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
 const available=()=>({speed:true,rpm:true,gear:true,fuel:true,temperature:true});
 const tripDefaults=()=>({odometerKm:0,tripKm:0,averageKmh:0,elapsedSeconds:0,rangeKm:null,rangeEstimated:true,rangeSource:'unavailable',destinationKm:null,etaSeconds:null,routeAvailable:false,etaEstimated:true});
 let baseProfile={maxRpm:hud.config.maxRpm,redline:hud.config.redline,limiter:hud.config.limiter};
 let lastTelemetry=performance.now(),stale=false,cssKey='',nextPaintAt=0,capKey='',metrics={frames:0,totalMs:0,maxMs:0};
 const lighting={auto:true,day:1,night:.65,glass:.35,quality:'balanced'};
 hud.state.availability=available();hud.state.trip=tripDefaults();hud.state.night=false;
 hud.setPresentation=(input={})=>{
  if(!input||typeof input!=='object')return;
  if(typeof input.auto==='boolean')lighting.auto=input.auto;
  for(const[key,min,max]of[['day',.2,1],['night',.2,1],['glass',0,1]])lighting[key]=clamp(input[key],min,max,lighting[key]);
  if(['low','balanced','high'].includes(input.quality))lighting.quality=input.quality;
  hud.wake();
 };
 const configure=hud.configure.bind(hud);
 hud.configure=(input={})=>{
  configure(input);
  hud.config.maxRpm=clamp(input.maxRpm,1000,20000,hud.config.maxRpm);
  for(const key of ['maxRpm','redline','limiter'])if(typeof input[key]==='number')baseProfile[key]=hud.config[key];
  if(input.preferences)hud.setPresentation(input.preferences.lighting);
 };
 const update=hud.update.bind(hud);
 hud.update=(data={})=>{
  if(!data||typeof data!=='object')return;
  lastTelemetry=performance.now();stale=false;
  if(typeof data.vehicleKey==='string'&&data.vehicleKey!==hud.state.vehicleKey){hud.state.availability=available();hud.state.trip=tripDefaults();hud.state.vehicleKey=data.vehicleKey.slice(0,160);Object.assign(hud.config,baseProfile);}
  if(data.profile&&typeof data.profile==='object'){
   hud.state.profile={id:String(data.profile.id||'default').slice(0,64),label:String(data.profile.label||'Padrão').slice(0,80)};
   hud.config.maxRpm=clamp(data.profile.maxRpm,1000,20000,baseProfile.maxRpm);
   hud.config.redline=clamp(data.profile.redline,.1,.99,baseProfile.redline);
   hud.config.limiter=Math.max(hud.config.redline,clamp(data.profile.limiter,.2,1,baseProfile.limiter));
  }
  if(typeof data.night==='boolean')hud.state.night=data.night;
  if(data.availability&&typeof data.availability==='object')for(const key of Object.keys(available()))if(typeof data.availability[key]==='boolean')hud.state.availability[key]=data.availability[key];
  if(data.trip&&typeof data.trip==='object'){
   for(const key of ['odometerKm','tripKm','averageKmh','elapsedSeconds'])hud.state.trip[key]=clamp(data.trip[key],0,key==='averageKmh'?1000:100000000,hud.state.trip[key]);
   for(const key of ['rangeKm','destinationKm','etaSeconds'])hud.state.trip[key]=clamp(data.trip[key],0,100000000,null);
   hud.state.trip.routeAvailable=data.trip.routeAvailable===true;
   hud.state.trip.rangeEstimated=data.trip.rangeEstimated!==false;hud.state.trip.etaEstimated=data.trip.etaEstimated!==false;
   hud.state.trip.rangeSource=typeof data.trip.rangeSource==='string'?data.trip.rangeSource.slice(0,64):'unavailable';
  }
  if(data.sources&&typeof data.sources==='object')hud.state.sources={...data.sources};
  update(data);
 };
 const loop=hud.loop;
 hud.loop=now=>{
  const fps=lighting.quality==='low'?30:lighting.quality==='high'?60:45;
  if(capKey!==lighting.quality){capKey=lighting.quality;nextPaintAt=now;}
  if(hud.state.visible&&now<nextPaintAt-.5){hud.frame=requestAnimationFrame(hud.loop);return;}
  nextPaintAt=Math.max(now-1000/fps,nextPaintAt)+1000/fps;
  const start=performance.now();loop(now);
  const elapsed=performance.now()-start;metrics.frames++;metrics.totalMs+=elapsed;metrics.maxMs=Math.max(metrics.maxMs,elapsed);
 };
 window.addEventListener('apex:frame',e=>{
  const frame=e.detail;
  if(typeof GetParentResourceName==='function'&&!window.apexEditor?.isOpen&&frame.state.visible&&frame.now-lastTelemetry>2000&&!stale){stale=true;for(const key of Object.keys(hud.state.availability))hud.state.availability[key]=false;Object.assign(hud.state.trip,{rangeKm:null,destinationKm:null,etaSeconds:null,routeAvailable:false});}
  frame.lightingBrightness=lighting.auto&&frame.state.night?lighting.night:lighting.day;frame.quality=lighting.quality;frame.stale=stale;
  const next=[frame.lightingBrightness,lighting.glass,lighting.quality].join(':');
  if(next!==cssKey){cssKey=next;document.documentElement.style.setProperty('--velo-light-brightness',frame.lightingBrightness);document.documentElement.style.setProperty('--velo-glass-opacity',lighting.glass);document.body.dataset.veloQuality=lighting.quality;}
 });
 window.VeloRpmScale={ticks(maxRpm=9000){
  const max=clamp(maxRpm,1000,20000,9000),step=max>10000?1000:500,majorStep=step*2,values=[];
  for(let rpm=0;rpm<=max;rpm+=step)values.push({rpm,fraction:rpm/max,major:rpm%majorStep===0,label:String(rpm/1000)});
  if(values.at(-1).rpm!==max)values.push({rpm:max,fraction:1,major:true,label:String(Math.round(max/100)/10)});else values.at(-1).major=true;
  return values;
 }};
 window.VeloPerformance={sample:()=>({frames:metrics.frames,averageRenderMs:metrics.frames?metrics.totalMs/metrics.frames:0,maxRenderMs:metrics.maxMs,quality:lighting.quality,fpsCap:lighting.quality==='low'?30:lighting.quality==='high'?60:45,telemetryAgeMs:Math.max(0,performance.now()-lastTelemetry),stale,profile:hud.state.profile?.label||'Padrão'}),reset:()=>{metrics={frames:0,totalMs:0,maxMs:0};}};
 window.VeloTravelDisplay={format(value={},config={}){
  const imperial=String(config.unit).toUpperCase()==='MPH',factor=imperial?.6213711922:1,unit=imperial?'mi':'km';
  const minutes=seconds=>{const m=Math.floor(clamp(seconds,0,100000000,0)/60);return m<60?`${m} min`:`${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}`;};
  const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const distance=n=>(clamp(n,0,100000000,0)*factor).toFixed(1);
  const hasRoute=value.routeAvailable===true&&finite(value.destinationKm);
  const eta=hasRoute&&value.destinationKm<=.02?'Chegou':hasRoute&&finite(value.etaSeconds)?(value.etaEstimated===false?'':'~')+minutes(Math.max(60,Math.ceil(value.etaSeconds/60)*60)):hasRoute?'--':'Sem rota';
  return {odometer:distance(value.odometerKm).padStart(8,'0')+' '+unit,time:minutes(value.elapsedSeconds),range:finite(value.rangeKm)?(value.rangeEstimated===false?'':'~')+Math.round(value.rangeKm*factor)+' '+unit:'-- '+unit,eta,destination:hasRoute?distance(value.destinationKm)+' '+unit:'--',hasRoute};
 }};
 class VeloTripWidget{
  constructor(host){
   this.root=document.createElement('div');this.root.className='velo-trip-instrument';this.root.innerHTML='<div class="trip-top"><span>VIAGEM</span><small data-trip="profile">Padrão</small></div><div class="trip-values"><div><span>ODÔMETRO</span><strong data-trip="odometer">0.0</strong><small data-trip="distance-unit">km</small></div><div><span>PARCIAL</span><strong data-trip="distance">0.0</strong><small data-trip="distance-unit">km</small></div><div><span>MÉDIA</span><strong data-trip="average">0</strong><small data-trip="speed-unit">km/h</small></div></div><div class="trip-extra"><div><span>EM MOVIMENTO</span><strong data-trip="time">0 min</strong></div><div><span>AUTONOMIA</span><strong data-trip="range">-- km</strong></div></div><div class="trip-duration"><span>GPS <b data-trip="destination">--</b></span><span>Chegada <b data-trip="eta">Sem rota</b></span></div>';
   this.nodes={};this.root.querySelectorAll('[data-trip]').forEach(e=>(this.nodes[e.dataset.trip]??=[]).push(e));this.key='';host.append(this.root);
  }
  render(frame={},settings={}){
   const s=frame.state||{},v=s.trip||tripDefaults(),imperial=frame.config?.unit==='MPH',factor=imperial?.6213711922:1;
   const distance=n=>(clamp(n,0,100000000,0)*factor).toFixed(1),display=window.VeloTravelDisplay.format(v,frame.config);
   const data={odometer:distance(v.odometerKm),distance:distance(v.tripKm),average:String(Math.round(clamp(v.averageKmh,0,1000,0)*factor)),'distance-unit':imperial?'mi':'km','speed-unit':imperial?'mph':'km/h',profile:s.profile?.label||'Padrão',time:display.time,range:display.range,destination:display.destination,eta:display.eta};
   const key=JSON.stringify(data);if(key!==this.key){this.key=key;for(const[name,text]of Object.entries(data))for(const node of this.nodes[name]||[])node.textContent=text;}
   const scale=clamp(settings.scale,.5,2,1);this.root.style.setProperty('--trip-scale',String(scale));
   this.root.style.opacity=String(frame.lightingBrightness??1);this.root.hidden=settings.enabled===false||s.visible===false;
  }
 }
 window.VeloTripWidget=VeloTripWidget;
 // A compact status capsule gives a reason for dashes/empty gauges, not a fake reading.
 const status=document.createElement('div');status.className='velo-data-status';status.hidden=true;hud.host.append(status);let statusKey='';
 const names={speed:'Velocidade',rpm:'RPM',gear:'Marcha',fuel:'Combustível',temperature:'Temperatura'};
 window.addEventListener('apex:frame',e=>{
  const f=e.detail,missing=Object.entries(f.state.availability||{}).filter(([,on])=>on===false).map(([key])=>names[key]).filter(Boolean);
  const text=f.stale?'Telemetria sem resposta':missing.length?`${missing.join(' · ')} sem dados`:'';
  status.hidden=!f.state.visible||f.boot||!text;if(text!==statusKey){statusKey=text;status.textContent=text;}
 });
})();
