(async function(){
  await window.VeloBoot.ready;
  await new Promise(resolve=>{const check=()=>window.apexEditor?resolve():setTimeout(check,10);check();});
  'use strict';
  const hud=window.apexHud, $=id=>document.getElementById(id);
  const photo={visible:true,engine:true,speed:158,rpm:.705,gear:'4',mode:'M',fuel:72,temperature:100,seatbelt:false,seatbeltAvailable:true,engineWarning:true,handbrake:true,abs:true,traction:true,left:false,right:false};
  let values={...photo},unit='KM/H',playing=false,started=0,driveFrame=null,scale=1;
  const profiles={default:{id:'default',label:'Original',maxRpm:9000,redline:.78,limiter:.96},city:{id:'city',label:'Urbano',maxRpm:6500,redline:.82,limiter:.97},sport:{id:'sport',label:'Esportivo',maxRpm:8000,redline:.86,limiter:.98},bike:{id:'bike',label:'Moto',maxRpm:12000,redline:.88,limiter:.98}};
  let trips={};try{trips=JSON.parse(localStorage.getItem('velo:dev:trips')||'{}');if(!trips||typeof trips!=='object'||Array.isArray(trips))trips={};}catch{}
  const activeProfile=()=>profiles[$('vehicle-profile').value]||profiles.default;
  const travel=()=>{const id=activeProfile().id;if(!trips[id])trips[id]={odometerKm:0,tripKm:0,averageKmh:0,elapsedSeconds:0};return trips[id];};
  let routeRemainingKm=8.4;
  const instrumentation=()=>{
    const t=travel(),route=$('gps-route').checked,missing=$('missing-data').checked,cruise=t.averageKmh>5?t.averageKmh:values.speed;
    return {profile:activeProfile(),vehicleKey:'DEV:'+activeProfile().id,night:$('night-mode').checked,trip:{...t,rangeKm:missing?null:values.fuel*4,rangeEstimated:true,rangeSource:missing?'unavailable':'configured',destinationKm:route?routeRemainingKm:null,routeAvailable:route,etaSeconds:route&&cruise>=5?routeRemainingKm/cruise*3600:null,etaEstimated:true},availability:{speed:true,rpm:!missing,gear:true,fuel:!missing,temperature:!missing}};
  };
  const booleanIds=['engine','seatbelt','engineWarning','handbrake','abs','traction','left','right'];
  const speedFactor=()=>unit==='MPH'?.6213711922:1;
  function fitPreview(){
    if(window.apexEditor?.isOpen)return;
    const area=document.querySelector('.hud-position');
    const fullscreen=Boolean(document.fullscreenElement);
    const ratio=window.apexCustomization?.ratio||472/296;
    const reserve=!fullscreen&&window.apexEditor?.preferences.shift.enabled?Math.min(100,area.clientHeight*.2):0;
    const width=Math.max(100,Math.min(area.clientWidth-20,(area.clientHeight-12-reserve)*ratio,fullscreen?440:1000));
    $('speedometer').style.width=`${width/(fullscreen?1:Math.max(1,scale))}px`;
    if($('stage').classList.contains('is-comparing'))$('reference-frame').style.width=`${width}px`;
  }
  new ResizeObserver(fitPreview).observe(document.querySelector('.hud-position'));
  document.addEventListener('fullscreenchange',fitPreview);
  window.addEventListener('apex:model',fitPreview);
  window.addEventListener('resize',fitPreview);
  function paintInputs(){
    $('speed').max=Math.round(320*speedFactor());
    $('speed').value=Math.round(values.speed*speedFactor());$('rpm').max=hud.config.maxRpm;$('rpm').value=Math.round(values.rpm*hud.config.maxRpm);
    $('fuel').value=values.fuel;$('temperature').value=values.temperature;$('gear').value=values.gear;
    for(const id of booleanIds)$(id).checked=values[id];$('hazard').checked=!!values.left&&!!values.right;
    $('speed-out').innerHTML=`${Math.round(values.speed*speedFactor())} <small>${unit}</small>`;
    $('rpm-out').innerHTML=`${Math.round(values.rpm*hud.config.maxRpm).toLocaleString('pt-BR')} <small>RPM</small>`;
    $('fuel-out').textContent=`${Math.round(values.fuel)}%`;$('temperature-out').textContent=`${Math.round(values.temperature)} °C`;
    $('engine-status').innerHTML=`<i></i> MOTOR ${values.engine?'LIGADO':'DESLIGADO'}`;$('engine-status').classList.toggle('off',!values.engine);
    document.querySelectorAll('input[type=range]').forEach(el=>el.style.setProperty('--fill',`${100*(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))}%`));
  }
  function send(extra={}){hud.update({...values,speed:values.speed*speedFactor(),...instrumentation(),...extra});paintInputs();}
  $('vehicle-profile').addEventListener('change',()=>{stop();label('PERFIL · '+activeProfile().label.toUpperCase());send({ignition:false});});
  for(const id of ['night-mode','missing-data'])$(id).addEventListener('change',()=>send({ignition:false}));
  $('gps-route').addEventListener('change',()=>send({ignition:false}));
  $('route-distance').addEventListener('input',()=>{routeRemainingKm=Number($('route-distance').value);$('route-distance-out').textContent=routeRemainingKm.toFixed(1).replace('.',',')+' km';send({ignition:false});});
  $('travel-minutes').addEventListener('input',()=>{const t=travel();t.elapsedSeconds=Number($('travel-minutes').value)*60;t.averageKmh=t.elapsedSeconds>0?t.tripKm/t.elapsedSeconds*3600:0;send({ignition:false});});
  window.addEventListener('velo:trip-reset',()=>{const t=travel();t.tripKm=0;t.elapsedSeconds=0;t.averageKmh=0;$('travel-minutes').value=0;localStorage.setItem('velo:dev:trips',JSON.stringify(trips));hud.update({...instrumentation(),ignition:false});});
  let tripAt=performance.now(),persistAt=tripAt;
  setInterval(()=>{
    const now=performance.now(),dt=Math.min(.5,Math.max(0,(now-tripAt)/1000));tripAt=now;
    if(!window.apexEditor?.isOpen&&values.engine&&values.speed>1){const t=travel(),distance=values.speed/3600*dt;t.odometerKm+=distance;t.tripKm+=distance;t.elapsedSeconds+=dt;t.averageKmh=t.elapsedSeconds>0?t.tripKm/t.elapsedSeconds*3600:0;if($('gps-route').checked)routeRemainingKm=Math.max(0,routeRemainingKm-distance);hud.update({...instrumentation(),ignition:false});}
    if(now-persistAt>5000){persistAt=now;try{localStorage.setItem('velo:dev:trips',JSON.stringify(trips));}catch{}}
    const stats=window.VeloPerformance.sample();$('performance-readout').textContent=`NUI: ${stats.averageRenderMs.toFixed(2)} ms/frame · limite ${stats.fpsCap} FPS · ${activeProfile().label}`;
  },250);
  function label(text){$('scenario-label').textContent=text;hud.root.classList.toggle('is-reference',text.startsWith('REFERÊNCIA'));}
  function stop(){playing=false;if(driveFrame!==null)cancelAnimationFrame(driveFrame);driveFrame=null;$('drive').querySelector('span').textContent='Simular condução';$('stage').classList.remove('is-driving');}
  window.apexDevStop=stop;
  function preset(next,title){stop();hud.cancelIgnition();values={...photo,...next};label(title);send({ignition:false});}
  $('reference').addEventListener('click',()=>preset(photo,'REFERÊNCIA · 158 KM/H'));
  $('redline').addEventListener('click',()=>preset({speed:247,rpm:.988,gear:'6',seatbelt:true,engineWarning:false,handbrake:false,abs:false,traction:false},'ALTA ROTAÇÃO · LIMITADOR'));
  $('warnings').addEventListener('click',()=>preset({speed:83,rpm:.48,gear:'3',fuel:7,temperature:127},'ALERTAS · COMBUSTÍVEL E TEMPERATURA'));
  $('shutdown').addEventListener('click',()=>preset({engine:false,speed:0,rpm:0,gear:'N',engineWarning:true,handbrake:true,abs:false,traction:false},'MOTOR DESLIGADO'));
  $('ignition').addEventListener('click',()=>{preset({speed:0,rpm:.12,gear:'N',seatbelt:true,handbrake:true,engineWarning:false,abs:false,traction:false},'IGNIÇÃO · AUTOTESTE DO PAINEL');hud.ignite();});
  for(const id of ['speed','rpm','fuel','temperature']) $(id).addEventListener('input',()=>{stop();values[id]=Number($(id).value)/(id==='rpm'?hud.config.maxRpm:id==='speed'?speedFactor():1);label('CONTROLE MANUAL');send({ignition:false});});
  $('gear').addEventListener('change',()=>{stop();values.gear=$('gear').value;label('CONTROLE MANUAL');send({ignition:false});});
  for(const id of booleanIds)$(id).addEventListener('change',()=>{stop();values[id]=$(id).checked;label('CONTROLE MANUAL');send();});
  $('hazard').addEventListener('change',()=>{stop();values.left=values.right=$('hazard').checked;label('CONTROLE MANUAL · PISCA-ALERTA');send({ignition:false});});
  document.querySelectorAll('[data-unit]').forEach(button=>button.addEventListener('click',()=>{unit=button.dataset.unit;hud.configure({unit});document.querySelectorAll('[data-unit]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});send({ignition:false});}));
  document.querySelectorAll('button[data-backdrop]').forEach(button=>button.addEventListener('click',()=>{$('stage').dataset.backdrop=button.dataset.backdrop;document.querySelectorAll('button[data-backdrop]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});}));
  $('compare').addEventListener('click',()=>{const comparing=$('stage').classList.toggle('is-comparing');$('reference-frame').hidden=!comparing;$('compare').setAttribute('aria-pressed',String(comparing));if(comparing){unit='KM/H';hud.configure({unit});document.querySelectorAll('[data-unit]').forEach(b=>{const selected=b.dataset.unit===unit;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});scale=1;$('scale').value=100;$('scale-out').textContent='100%';$('speedometer').style.setProperty('--preview-scale',1);preset(photo,'REFERÊNCIA · MESMA ESCALA');}fitPreview();});
  $('scale').addEventListener('input',()=>{scale=Number($('scale').value)/100;$('speedometer').style.setProperty('--preview-scale',scale);$('scale-out').textContent=`${Math.round(scale*100)}%`;fitPreview();paintInputs();});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{label('TELA CHEIA NÃO DISPONÍVEL NESTE NAVEGADOR');}});
  $('drive').addEventListener('click',()=>{
    if(playing){stop();label('SIMULAÇÃO PAUSADA');return;}
    playing=true;started=performance.now();$('drive').querySelector('span').textContent='Pausar condução';$('stage').classList.add('is-driving');
    values={...photo,temperature:45,speed:0,rpm:.12,gear:'N',seatbelt:true,engineWarning:false,handbrake:true,abs:false,traction:false};send({ignition:true});hud.ignite();
    function tick(now){
      if(!playing)return;
      const t=(now-started)/1000;
      if(t>=32){values={...values,engine:false,speed:0,rpm:0,gear:'N',handbrake:true};send();stop();label('SEQUÊNCIA CONCLUÍDA');$('timeline-progress').style.width='100%';$('demo-time').textContent='00:32 / 00:32';return;}
      if(t<4){label('IGNIÇÃO · AUTOTESTE');}
      else if(t<25){
        const elapsed=t-4,gear=Math.min(6,Math.floor(elapsed/3.5)+1),phase=(elapsed%3.5)/3.5;
        values.engine=true;values.speed=Math.min(262,elapsed*12.5);values.rpm=.38+phase*.61;values.gear=String(gear);values.handbrake=false;
        values.traction=gear===1&&phase>.65;values.fuel=70-elapsed*.06;values.temperature=Math.min(90,45+elapsed*2.2);label(gear===1?'ACELERAÇÃO · SAÍDA':'ACELERAÇÃO · TROCAS DE MARCHA');
      }else if(t<28){values.speed=262+Math.sin(t*9)*2;values.rpm=.985+Math.sin(t*18)*.012;values.traction=false;values.gear='6';label('ALTA ROTAÇÃO · CORTE DE GIRO');}
      else if(t<31){const f=1-(t-28)/3;values.speed=263*f;values.rpm=.12+f*.65;values.gear=String(Math.max(1,Math.ceil(6*f)));values.abs=t<29;label('DESACELERAÇÃO · FRENAGEM');}
      else{values.engine=false;values.speed=0;values.rpm=0;values.gear='N';values.handbrake=true;values.abs=false;label('DESLIGAMENTO');}
      send({ignition:false});$('timeline-progress').style.width=`${t/32*100}%`;$('demo-time').textContent=`00:${String(Math.floor(t)).padStart(2,'0')} / 00:32`;
      driveFrame=requestAnimationFrame(tick);
    }
    driveFrame=requestAnimationFrame(tick);
  });
  document.addEventListener('keydown',e=>{if(window.apexEditor?.isOpen||e.ctrlKey||e.altKey||e.metaKey||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)||e.repeat)return;const key=e.key.toLowerCase();const actions={'i':'ignition','r':'redline',' ':'drive','f':'fullscreen'};if(actions[key]){e.preventDefault();$(actions[key]).click();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();label('SIMULAÇÃO PAUSADA');}});
  label('REFERÊNCIA · 158 KM/H');send({ignition:false});fitPreview();
})();
