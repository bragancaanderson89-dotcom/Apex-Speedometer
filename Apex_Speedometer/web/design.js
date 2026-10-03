/* Reference geometry in the original image's 472 x 296 coordinate system. */
(function(){
  'use strict';
  const profiles={
    fuel:{cx:205,cy:181,rx:153,ry:130,side:-1,start:107,end:231,width:6.6,redAt:207,
      cuts:[[143.8,1.6,1],[153.2,1,.98],[173.2,1.8,1],[205.7,1.4,1],[219.4,1.1,1],[226,1,1]],notches:[[158.7,.8,.44],[164,.9,.48],[184.5,1.2,.47],[195.5,1.3,.44]]},
    temperature:{cx:266,cy:152,rx:169,ry:169,side:1,start:182,end:257,width:5.4,redAt:237,
      cuts:[[208.2,1.5,1],[236.1,1.35,1]],notches:[[222,1.2,.46],[230.1,1.05,.39],[246.7,1.05,.4]]}
  };
  // Every fill, border and cut follows the same smooth elliptical arc.
  function pointAtY(p,y,offset=0){
    const angle=Math.asin(Math.max(-1,Math.min(1,(y-p.cy)/p.ry)));
    return [p.cx+p.side*(p.rx+offset)*Math.cos(angle),p.cy+(p.ry+offset)*Math.sin(angle)];
  }
  function edges(profile,y){
    const half=profile.width/2;
    return {left:pointAtY(profile,y,-profile.side*half),right:pointAtY(profile,y,profile.side*half)};
  }
  const f=p=>p.map(v=>v.toFixed(3)).join(',');
  function arcTo(p,y,offset,sweep){
    return `A${(p.rx+offset).toFixed(3)},${(p.ry+offset).toFixed(3)} 0 0 ${sweep} ${f(pointAtY(p,y,offset))}`;
  }
  function ribbon(p,start,end,width=p.width){
    const left=-p.side*width/2,right=-left,sweep=p.side===1?1:0;
    return `M${f(pointAtY(p,start,left))} ${arcTo(p,end,left,sweep)} L${f(pointAtY(p,end,right))} ${arcTo(p,start,right,1-sweep)} Z`;
  }
  function centerLine(p,offset=0){
    return `M${f(pointAtY(p,p.start,offset))} ${arcTo(p,p.end,offset,p.side===1?1:0)}`;
  }
  function gaugeTrack(kind){
    const p=profiles[kind],fuel=kind==='fuel';
    return `<g class="gauge-housing" stroke-linejoin="round" stroke-linecap="round">
      <path class="${fuel?'fuel':'temp'}-track" d="${centerLine(p)}" fill="none" stroke="#61717e" stroke-width="${p.width+.8}" stroke-linecap="butt" opacity=".12"/>
      <path d="${ribbon(p,p.start,p.end,p.width+1.2)}" fill="none" stroke="#b3c4d1" stroke-width=".55" opacity=".34"/>
      <path d="${centerLine(p,p.width/2+3.1)}" fill="none" stroke="#9aaebc" stroke-width=".65" opacity=".3"/>
    </g>`;
  }
  function gaugeCuts(kind){
    const p=profiles[kind];
    return `<g class="gauge-cuts" fill="none" stroke="#111921" stroke-linecap="butt">${[...p.cuts,...p.notches].map(([y,w,fraction])=>{
      const e=edges(p,y),inside=kind==='fuel'?e.right:e.left,outside=kind==='fuel'?e.left:e.right;
      const end=[inside[0]+(outside[0]-inside[0])*fraction,inside[1]+(outside[1]-inside[1])*fraction];
      return `<path d="M${f(inside)} L${f(end)}" stroke-width="${w}"/>`;
    }).join('')}</g>`;
  }
  function buildGauge(host,kind){
    const p=profiles[kind],start=p.start,end=p.end,n=64,bars=[];
    let total=0,previous=pointAtY(p,start);const distances=[0];
    for(let i=1;i<=n;i++){const pt=pointAtY(p,start+(end-start)*i/n);total+=Math.hypot(pt[0]-previous[0],pt[1]-previous[1]);distances.push(total);previous=pt;}
    for(let i=0;i<n;i++){
      const y0=start+(end-start)*i/n,y1=start+(end-start)*(i+1)/n;
      const el=document.createElementNS('http://www.w3.org/2000/svg','path');
      const color=(y0+y1)/2>=p.redAt?'#f3182c':kind==='fuel'?'url(#fuel-face)':'#c6d5e4';
      el.setAttribute('d',ribbon(p,y0,Math.min(end,y1+.3)));el.setAttribute('fill',color);el.setAttribute('stroke',color);el.setAttribute('stroke-width','.12');
      el.dataset.threshold=String(1-(distances[i]+distances[i+1])/(2*total));el.style.opacity='0';host.append(el);bars.push(el);
    }
    return bars;
  }

  // Beveled continuous automotive numerals, including a narrow flagged 1.
  const glyphs={
    '-':{w:20,d:'M0 17H20V23H0Z'},
    '0':{w:27,d:'M6 0H21L27 6V34L21 40H6L0 34V6Z M8 5L5.5 7.5V32.5L8 35H19L21.5 32.5V7.5L19 5Z'},
    '1':{w:20,d:'M12 0H19V40H13V7L3 14L0 9Z'},
    '2':{w:27,d:'M6 0H21L27 6V15L22 21L6 32V35H27V40H0V30L4 26L20 15L21.5 13V8L19 5H8L5.5 8V11H0V6Z'},
    '3':{w:27,d:'M1 0H21L27 6V15L23 20L27 25V34L21 40H5L0 35V30H5.5V33L8 35H19L21.5 32.5V25L18 22.5H9V17.5H18L21.5 15V7.5L19 5H1Z'},
    '4':{w:27,d:'M15 0H22V27H27V32H22V40H16V32H0V26Z M6.5 27H16V10Z'},
    '5':{w:27,d:'M3 0H27V5H8V16H20L27 23V34L21 40H6L0 34V30H6V32L9 35H18L21.5 32V24.5L18.5 21H2Z'},
    '6':{w:27,d:'M7 0H23V5H9L5.5 8V17H20L27 24V34L21 40H6L0 34V7Z M5.5 22V32L8.5 35H18.5L21.5 32V25L18.5 22Z'},
    '7':{w:27,d:'M0 0H27V5L12 40H5.5L20.5 5H0Z'},
    '8':{w:27,d:'M6 0H21L27 6V15L23 20L27 25V34L21 40H6L0 34V25L4 20L0 15V6Z M8 5L5.5 7.5V14L8.5 17.5H18.5L21.5 14V7.5L19 5Z M8.5 22.5L5.5 25.5V32L8.5 35H18.5L21.5 32V25.5L18.5 22.5Z'},
    '9':{w:27,d:'M6 0H21L27 6V33L20 40H3V35H18L21.5 32V23H6L0 17V6Z M8 5L5.5 7.5V15.5L8 18H21.5V7.5L19 5Z'},
    'N':{w:28,d:'M0 40V0H6L22 28V0H28V40H22L6 12V40Z'},
    'R':{w:28,d:'M0 40V0H21L27 6V17L21 23L28 40H21.5L14.5 23H6V40Z M6 5V18H18.5L21.5 15V8L18.5 5Z'}
  };
  function drawDigits(host,value,height,cx,top,stretch=1){
    const text=String(value);if(host.dataset.value===text)return;host.dataset.value=text;
    const list=[...text].map(c=>window.ApexReferenceDigits?.[c]||glyphs[c]||glyphs['0']);
    const sy=height/40,sx=sy*stretch;
    let pen=0,min=Infinity,max=-Infinity;
    for(const g of list){const bounds=g.bounds||[-4,g.w];min=Math.min(min,pen+bounds[0]);max=Math.max(max,pen+bounds[1]);pen+=g.w+3;}
    const left=cx-(min+max)*sx/2;
    let x=0;host.innerHTML=`<g transform="translate(${left} ${top}) skewX(-9) scale(${sx} ${sy})">${list.map(g=>{const out=`<path d="${g.d}" transform="translate(${x} 0)" fill-rule="evenodd"/>`;x+=g.w+3;return out;}).join('')}</g>`;
  }
  function icon(name){return `<path d="${window.ApexReferenceIcons[name]}" fill="currentColor" fill-rule="evenodd" stroke="none"/>`;}
  window.ApexDesign={buildGauge,gaugeTrack,gaugeCuts,drawDigits,icon};
})();
