/* Original ZSX artwork; the parent owns visibility, telemetry and the clock. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const GAUGE_MAX = 9000;
  const BOOT_PHASES = new Set(['raster', 'up', 'peak', 'down', 'zero', 'settle']);
  const TEST_PHASES = new Set(['up', 'peak', 'down', 'zero']);
  let instance = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const polar = (radius, angle) => {
    const radians = angle * Math.PI / 180;
    return [154 + Math.sin(radians) * radius, 168 - Math.cos(radians) * radius];
  };
  const text = (node, value) => {
    const next = String(value);
    if (node.textContent !== next) node.textContent = next;
  };
  const createSvg = (tag, attributes, value) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, attribute] of Object.entries(attributes)) node.setAttribute(key, attribute);
    if (value !== undefined) node.textContent = value;
    return node;
  };
  // Shared settings use fractions. Also accept thresholds expressed in RPM.
  const threshold = (value, fallback, maxRpm) => {
    const rpm = number(value, fallback);
    return clamp(rpm > 1 ? rpm / maxRpm : rpm, 0, 1);
  };
  const pulse = (now, duration, windows) => {
    const phase = ((now % duration) + duration) % duration / duration;
    return windows.some(([start, end]) => phase >= start && phase < end) ? '1' : '.08';
  };

  function markup(id) {
    return `<svg class="zsx-instrument" viewBox="0 0 324 324" preserveAspectRatio="xMidYMid meet" xmlns="${NS}" role="img" aria-label="Instrumentos do veículo">
      <defs>
        <radialGradient id="${id}horizon-shadow"><stop offset=".3" stop-color="#12141b" stop-opacity=".12"/><stop offset=".73" stop-color="#0b1018" stop-opacity=".13"/><stop offset="1" stop-color="#0b1018" stop-opacity="0"/></radialGradient>
        <filter id="${id}emergency-soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <g data-edit-part="dial" data-pivot-x="154" data-pivot-y="168">
        <ellipse cx="154" cy="168" rx="126" ry="126" fill="url(#${id}horizon-shadow)"/>
        <g class="zsx-emergency-halo" aria-hidden="true">
          <path class="zsx-emergency-left" filter="url(#${id}emergency-soft)" d="M47.641 186.754 A108 108 0 0 1 108.357 70.119"/>
          <path class="zsx-emergency-right" filter="url(#${id}emergency-soft)" d="M154.000 60.000 A108 108 0 0 1 260.359 149.246"/>
        </g>
        <g class="zsx-emergency-rim" aria-hidden="true">
          <path class="zsx-emergency-left" d="M41 196 A116 116 0 0 1 108 62"/>
          <path class="zsx-emergency-right" d="M166 53 A116 116 0 0 1 269 153"/>
        </g>
        <path class="zsx-startup-raster" id="${id}startup-raster" d="M96 268.459 A116 116 0 1 1 270 168" pathLength="100" stroke-dasharray="13 87"/>
        <path class="zsx-rpm-track" d="M96.000 268.459 A116 116 0 1 1 270.000 168.000"/>
        <path id="${id}rpm-redline" class="zsx-rpm-redline"/>
        <g id="${id}rpm-scale" class="zsx-rpm-scale" aria-hidden="true"></g>
        <g id="${id}rpm-needle" transform="rotate(-150 154 168)" aria-hidden="true"><path class="zsx-needle" d="M152.7 99 L153.35 52 L154.65 52 L155.3 99 Z"/></g>
      </g>
      <g class="zsx-assist-labels" data-edit-part="assist" data-pivot-x="154" data-pivot-y="118">
        <text class="zsx-assist" x="118" y="123" transform="rotate(-37 118 123)">LC</text>
        <text id="${id}tcs-indicator" class="zsx-assist" x="154" y="113">TCR</text>
        <text id="${id}abs-indicator" class="zsx-assist" x="190" y="123" transform="rotate(37 190 123)">ABS</text>
      </g>
      <g data-edit-part="gear" data-pivot-x="154" data-pivot-y="154">
        <circle class="zsx-gear-ring" cx="154" cy="154" r="21"/>
        <text id="${id}gear" class="zsx-gear" x="153" y="165">N</text>
      </g>
      <g data-edit-part="speed" data-pivot-x="154" data-pivot-y="214">
        <text id="${id}speed-unit" class="zsx-speed-unit" x="154" y="189">KM/H</text>
        <g transform="translate(154 239)"><text id="${id}digital-speed" class="zsx-digital-speed" x="0" y="0">0</text></g>
      </g>
      <g class="zsx-signal-symbols" data-edit-part="signals" data-pivot-x="154" data-pivot-y="94">
        <g id="${id}left-indicator" class="zsx-turn-arrow" transform="translate(121 94) scale(.8)"><title>Seta esquerda</title><path d="M-9 0 L-1-6 V-2 H8 V2 H-1 V6Z"/></g>
        <g id="${id}right-indicator" class="zsx-turn-arrow" transform="translate(187 94) scale(.8)"><title>Seta direita</title><path d="M9 0 L1-6 V-2 H-8 V2 H1 V6Z"/></g>
        <g id="${id}hazard-indicator" class="zsx-hazard" transform="translate(154 90)"><title>Pisca-alerta</title><path d="M0-7 7 6 H-7 Z M0-2 3 3 H-3 Z" fill-rule="evenodd"/></g>
      </g>
      <g class="zsx-vehicle-symbols" aria-label="Indicadores" data-edit-part="lamps" data-pivot-x="154" data-pivot-y="164">
        <g id="${id}handbrake-indicator" class="zsx-status-icon" transform="translate(84 136) scale(.65)"><title>Freio de mão</title><circle r="8.5"/><path d="M-12-6 Q-15 0-12 6 M12-6 Q15 0 12 6"/><path class="zsx-parking-letter" d="M-2.5 4 V-4 H.7 C4.2-4 4.2 .5 .7 .5 H-2.5"/></g>
        <g id="${id}seatbelt-indicator" class="zsx-status-icon" transform="translate(84 161) scale(.75)"><title>Cinto de segurança</title><circle cx="0" cy="-7" r="2.4"/><path d="M-5 8 L-5-1 Q0-5 5-1 L5 8 M-6 2 L6 5 M-6 7 L7-5"/></g>
        <g id="${id}engine-indicator" class="zsx-status-icon zsx-engine-indicator" transform="translate(84 188) scale(.65)"><title>Motor</title><path d="M-9-4 H-5 V-7 H3 V-4 H7 L10-1 H12 V6 H8 L5 9 H-5 V6 H-9 Z M-12-2 V4 M-2-10 V-7 M-5-10 H1"/></g>
        <g id="${id}headlight-indicator" class="zsx-status-icon zsx-headlight-indicator" transform="translate(224 136) scale(.7)"><title>Faróis</title><path d="M1-6 Q13 0 1 6 Z M-10-5 H-2 M-10-1.5 H-2 M-10 2 H-2 M-10 5.5 H-2"/></g>
      </g>
      <g class="zsx-secondary-symbols" aria-label="Condição do veículo" data-edit-part="secondary" data-pivot-x="154" data-pivot-y="185">
        <g id="${id}oil-indicator" class="zsx-status-icon" transform="translate(224 160) scale(.65)"><title>Pressão de óleo</title><path d="M-10-3 H-4 L-1-6 H5 V-2 L10-5 L12-2 L7 3 H-7 Z M-5-8 H2 M-2-8 V-5 M-11-3 L-14-6 H-9"/><path d="M12 2 Q8 8 12 8 Q16 8 12 2Z"/></g>
        <g id="${id}battery-indicator" class="zsx-status-icon" transform="translate(224 185) scale(.65)"><title>Bateria</title><path d="M-10-5 H10 V7 H-10 Z M-7-5 V-8 H-3 V-5 M3-5 V-8 H7 V-5 M-7 1 H-3 M3 1 H7 M5-1 V3"/></g>
        <g id="${id}temperature-indicator" class="zsx-status-icon" transform="translate(224 210) scale(.65)"><title>Temperatura do motor</title><path d="M-3 2 V-7 Q0-10 3-7 V2 A5 5 0 1 1-3 2 M0-5 V5 M5-6 H8 M5-2 H8 M-11 10 Q-8 7-5 10 M5 10 Q8 7 11 10"/></g>
        <g id="${id}door-indicator" class="zsx-status-icon" transform="translate(84 210) scale(.65)"><title>Porta ou tampa aberta</title><path d="M-5-8 H5 L7-4 V7 H-7 V-4 Z M-4-4 H4 V3 H-4 Z M-8-2 L-13 3 M8-2 L13 3"/></g>
      </g>
      <g data-edit-part="fuel" data-pivot-x="154" data-pivot-y="264">
        <g class="zsx-fuel-strip" transform="translate(110 264) scale(.65)">
          <g id="${id}fuel-icon" class="zsx-status-icon zsx-fuel-icon"><title>Combustível</title><path d="M-6 5 V-7 H2 V5 M-8 5 H4 M-5-5 H0 V-2 H-5 Z M2-3 Q7-3 7 0 V3 Q10 6 10 1 V-5 L6-9"/></g>
          <path class="zsx-fuel-track" d="M23 0 H110"/>
          <path id="${id}fuel-progress" class="zsx-fuel-progress" d="M23 0 H110" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/>
          <text id="${id}fuel-value" class="zsx-fuel-value" x="121" y="4">100%</text>
        </g>
      </g>
      <g class="zsx-trip-inline" data-edit-part="trip" data-pivot-x="154" data-pivot-y="253"><text id="${id}odometer" x="154" y="253">ODO 000000.0 km</text></g>
    </svg>`;
  }

  class ApexZsx {
    constructor(host) {
      this.host = host;
      this.root = document.createElement('div');
      this.root.className = 'zsx-view zsx-engine-off';
      this.root.dataset.bootPhase = 'idle';
      const prefix = `zsx-${++instance}-`;
      this.root.innerHTML = markup(prefix);
      this.svg = this.root.querySelector('.zsx-instrument');
      this.nodes = Object.fromEntries(Array.from(this.root.querySelectorAll('[id]'), node => [node.id.slice(prefix.length), node]));
      this.emergencyLeft = this.root.querySelectorAll('.zsx-emergency-left');
      this.emergencyRight = this.root.querySelectorAll('.zsx-emergency-right');
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.scaleKey = null;
      host.appendChild(this.root);
      // Fixed pivots and source geometry work even when the host is detached.
      this.buildScale(7500 / GAUGE_MAX);
    }

    buildScale(redline, maxRpm=GAUGE_MAX) {
      const scaleKey=`${redline}:${maxRpm}`;
      if (this.scaleKey === scaleKey) return;
      this.scaleKey = scaleKey;
      const scale = this.nodes['rpm-scale'];
      const ticks = document.createDocumentFragment();
      const entries=window.VeloRpmScale?.ticks(maxRpm)||Array.from({length:19},(_,i)=>({fraction:i/18,major:i%2===0,label:String(i/2)}));
      for (const entry of entries) {
        const angle = -150 + entry.fraction * 240;
        const major = entry.major;
        const danger = entry.fraction >= redline;
        const [x1, y1] = polar(116, angle);
        const [x2, y2] = polar(major ? 109 : 112, angle);
        ticks.appendChild(createSvg('line', { x1, y1, x2, y2,
          class: `zsx-tick${major ? ' zsx-major' : ''}${danger ? ' zsx-redline' : ''}` }));
        if (major) {
          const [x, y] = polar(101, angle);
          ticks.appendChild(createSvg('text', { x, y, class: `zsx-rpm-number${danger ? ' zsx-redline' : ''}` }, entry.label));
        }
      }
      scale.replaceChildren(ticks);
      const begin = polar(116, -150 + redline * 240);
      const end = polar(116, 90);
      this.nodes['rpm-redline'].setAttribute('d', `M${begin.join(' ')} A116 116 0 ${240 * (1 - redline) > 180 ? 1 : 0} 1 ${end.join(' ')}`);
    }

    /** Paint one shared frame; no timers, smoothing, visibility or ignition ownership. */
    render({ state = {}, current = {}, config = {}, boot = false, phase = 'idle', progress = null, now = 0, tripSettings={} } = {}) {
      const n = this.nodes;
      const engine = state.engine === true;
      const reduced = this.motionQuery.matches || config.animation === false;
      const starting = engine && boot === true && !reduced;
      const bootPhase = starting && BOOT_PHASES.has(phase) ? phase : 'idle';
      const testing = starting && TEST_PHASES.has(bootPhase);
      const maxRpm = Math.max(1, number(config.maxRpm, GAUGE_MAX));
      const redline = threshold(config.redline, 7500 / GAUGE_MAX, maxRpm);
      const limiter = threshold(config.limiter, .96, maxRpm);
      // Reduced motion displays live telemetry immediately, including mid-boot.
      const values = reduced ? state : current;
      const speed = clamp(number(values.speed, number(state.speed)), 0, 999);
      const rpm = engine ? clamp(number(values.rpm, number(state.rpm)), 0, 1) : 0;
      const fuel = clamp(number(values.fuel, number(state.fuel)), 0, 100);
      const temperature = number(values.temperature, number(state.temperature, number(state.temp, 40)));
      const liveFuel = clamp(number(state.fuel, fuel), 0, 100);
      const liveTemperature = number(state.temperature, number(state.temp, temperature));
      const known=key=>starting||state.availability?.[key]!==false;
      const hot = !starting && known('temperature') && liveTemperature >= number(config.hotTemperature, 115);
      const seatbeltAvailable = state.seatbeltAvailable !== false;
      const emergency = !!state.police && !!state.emergencyLights;
      const toggle = (key, name, on) => n[key].classList.toggle(`zsx-${name}`, !!on);
      const rootToggle = (name, on) => this.root.classList.toggle(`zsx-${name}`, !!on);

      this.buildScale(redline,maxRpm);
      // The shared normalized RPM sweeps the complete original 0..9 dial.
      n['rpm-needle'].setAttribute('transform', `rotate(${-150 + rpm * 240} 154 168)`);
      n['rpm-needle'].style.visibility=known('rpm')?'':'hidden';
      text(n['digital-speed'], known('speed')?Math.round(speed):'--');
      text(n['speed-unit'], String(config.unit).toUpperCase() === 'MPH' ? 'MPH' : 'KM/H');
      const gear = String(state.gear ?? 'N');
      text(n.gear, known('gear')&&/^(?:N|R|[0-9]|1[0-2])$/.test(gear) ? gear : '-');
      text(n['fuel-value'], known('fuel')?`${Math.round(fuel)}%`:'--%');
      n['fuel-progress'].setAttribute('stroke-dashoffset', String(known('fuel')?100-fuel:100));
      const odo=number(state.trip?.odometerKm),imperial=config.unit==='MPH';
      text(n.odometer,'ODO '+(Math.max(0,odo)*(imperial?.6213711922:1)).toFixed(1).padStart(8,'0')+(imperial?' mi':' km'));
      n.odometer.style.display=tripSettings.enabled===true&&tripSettings.mode!=='floating'&&!starting?'':'none';

      this.root.dataset.bootPhase = bootPhase;
      this.root.dataset.mode = state.mode === 'A' ? 'A' : 'M';
      rootToggle('engine-off', !engine);
      rootToggle('cold-start', starting);
      rootToggle('lamp-test', testing);
      rootToggle('scanning', starting && bootPhase === 'raster');
      rootToggle('reduced-motion', reduced);
      rootToggle('low-fuel', !starting && known('fuel') && liveFuel <= number(config.lowFuel, 15));
      rootToggle('hot', hot);
      rootToggle('at-redline', known('rpm') && engine && !starting && rpm >= redline);
      rootToggle('at-limiter', known('rpm') && engine && !starting && rpm >= limiter);
      rootToggle('emergency', emergency);
      // progress is the parent's full ignition progress; raster occupies 0..18%.
      n['startup-raster'].setAttribute('stroke-dashoffset', String(-100 * (starting ? clamp(number(progress) / .18, 0, 1) : 0)));

      toggle('left-indicator', 'active', state.left);
      toggle('right-indicator', 'active', state.right);
      toggle('hazard-indicator', 'active', state.left&&state.right);
      toggle('handbrake-indicator', 'warning', state.handbrake);
      toggle('seatbelt-indicator', 'not-applicable', !seatbeltAvailable);
      toggle('seatbelt-indicator', 'warning', seatbeltAvailable && state.seatbelt === false && engine);
      toggle('seatbelt-indicator', 'active', seatbeltAvailable && state.seatbelt === true);
      toggle('engine-indicator', 'warning', state.engineWarning);
      toggle('headlight-indicator', 'active', state.headlights || state.highbeam);
      toggle('headlight-indicator', 'highbeam', state.highbeam);
      toggle('abs-indicator', 'active', state.abs);
      toggle('tcs-indicator', 'active', state.traction);
      toggle('oil-indicator', 'warning', state.oilWarning);
      toggle('battery-indicator', 'warning', state.batteryWarning);
      toggle('temperature-indicator', 'warning', hot);
      toggle('door-indicator', 'warning', state.doorOpen);

      // Preserve the author's turn/emergency flash pattern using only frame.now.
      const clock = number(now);
      const turnOpacity = reduced || testing || ((clock % 760) + 760) % 760 < 380 ? '1' : '.16';
      n['left-indicator'].style.opacity = state.left ? turnOpacity : '1';
      n['right-indicator'].style.opacity = state.right ? turnOpacity : '1';
      n['hazard-indicator'].style.opacity = state.left&&state.right ? turnOpacity : '1';
      const redOpacity = reduced || !emergency ? '1' : pulse(clock, 800, [[0, .09], [.17, .26], [.34, .43]]);
      const blueOpacity = reduced || !emergency ? '1' : pulse(clock, 800, [[.5, .59], [.67, .76], [.84, .93]]);
      for (const node of this.emergencyLeft) node.style.opacity = redOpacity;
      for (const node of this.emergencyRight) node.style.opacity = blueOpacity;
    }

    destroy() { this.root.remove(); }
  }

  window.ApexZsx = ApexZsx;
})();
