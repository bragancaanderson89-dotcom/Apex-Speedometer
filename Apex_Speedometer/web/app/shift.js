/* Optional shift-light instrument. The parent owns the clock and wrapper. */
(function () {
  'use strict';

  const LED_COUNT = 12;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback, min, max) =>
    typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
  const defaults = Object.freeze({
    count: LED_COUNT, startRpm: .25, fullRpm: .95, flashHz: 5,
    brightness: .85, material: 'metal', color: '#323c44',
    colors: Object.freeze({green: '#32ed80', yellow: '#ffe048', red: '#ff1834'})
  });
  const hex = (value, fallback) => /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
  function normalize(settings = {}) {
    const startRpm = number(settings.startRpm, defaults.startRpm, 0, 1);
    return {
      count: Math.round(number(settings.count, LED_COUNT, 4, 24)), startRpm,
      fullRpm: Math.max(startRpm, number(settings.fullRpm, defaults.fullRpm, 0, 1)),
      flashHz: number(settings.flashHz, defaults.flashHz, 1, 10),
      brightness: number(settings.brightness, defaults.brightness, 0, 1),
      material: settings.material, color: settings.color, enabled: settings.enabled === true,
      colors: Object.fromEntries(Object.keys(defaults.colors).map(key =>
        [key, hex((settings.colors || {})[key], defaults.colors[key])]))
    };
  }
  // Vehicle thresholds may also arrive in physical RPM, relative to maxRpm.
  function thresholds(frame, settings) {
    const config = frame.config || {};
    const scale = number(config.maxRpm, 9000, 1, Number.MAX_VALUE);
    const fraction = (value, fallback) => typeof value === 'number' && Number.isFinite(value)
      ? clamp(value > 1 ? value / scale : value, 0, 1) : fallback;
    const redline = fraction(config.redline, .78);
    // A profile without a limiter retains the original .18 redline headroom.
    const limiter = fraction(config.limiter, Math.min(1, redline + .18));
    const full = Math.min(settings.fullRpm, limiter);
    return {redline, limiter, start: Math.min(settings.startRpm, full), full};
  }
  const ledThreshold = (index, count, start, full) => start + index * (full - start) / (count - 1);
  let nextId = 0;
  const assetBase = new URL('../assets/materials/', document.currentScript.src);
  const materials = Object.freeze({
    carbon: {name:'Fibra de carbono 5D',file:'carbon-fiber.jpg',tile:100,angle:45,gain:1.7,lift:.03,description:'Trama diagonal com profundidade e verniz brilhante.'},
    metal: {name:'Metálico',file:'metal.jpg',tile:220,angle:0,gain:1.75,lift:.08,description:'Metal com microtextura e reflexos de luz.'},
    matte: {name:'Fosco',file:'matte.jpg',tile:140,angle:0,gain:.32,lift:.77,description:'Acabamento acetinado, com grão fino e pouco brilho.'},
    plastic: {name:'Plástico',file:'plastic.jpg',tile:150,angle:0,gain:1.05,lift:.35,description:'Plástico moldado com textura e reflexo suave.'}
  });

  // Pure sampling: no clock reads, ignition detection, or retained telemetry.
  // `flash` means the red pulse is ON; `off` means no emitters are lit.
  function sample(frame = {}, settings = {}) {
    return sampleResolved(frame, normalize(settings));
  }

  function sampleResolved(frame, settings) {
    const state = frame.state || {};
    const config = frame.config || {};
    const result = (count, flash, phase) => ({count, flash, off: count === 0, phase});
    if (!state.engine || state.visible === false) return result(0, false, 'off');

    const animated = config.animation !== false;
    if (frame.boot && animated) {
      // A missing shared progress must never start a local ignition sequence.
      const progress = number(frame.progress, 0, 0, 1);
      if (progress < .12) return result(0, false, 'ignition-dark');
      if (progress < .46) {
        const count = Math.min(settings.count, 1 + Math.floor((progress - .12) / .34 * settings.count));
        return result(count, false, 'ignition-fill');
      }
      if (progress < .68) {
        // Six half-cycles give exactly three red pulses on the shared timeline.
        const flash = Math.floor((progress - .46) / .22 * 6 + 1e-10) % 2 === 0;
        return result(flash ? settings.count : 0, flash, 'ignition-flash');
      }
      return result(0, false, 'ignition-hold');
    }

    if ((state.availability || {}).rpm === false) return result(0, false, 'off');

    const liveRpm = number(state.rpm, 0, 0, 1);
    // With motion disabled, ignore the HUD's possibly synthetic boot RPM.
    const rpm = animated ? number((frame.current || {}).rpm, liveRpm, 0, 1) : liveRpm;
    const {limiter, start, full} = thresholds(frame, settings);
    if (animated && rpm > limiter) {
      const flash = Math.floor(number(frame.now, 0, 0, Number.MAX_VALUE) * settings.flashHz * 2 / 1000) % 2 === 0;
      return result(flash ? settings.count : 0, flash, 'limiter');
    }
    let count = 0;
    for (let i = 0; i < settings.count; i++) if (rpm >= ledThreshold(i, settings.count, start, full)) count++;
    return result(count, false, 'live');
  }

  function ledMarkup(id, count) {
    const paint = name => `url(#${id}-${name})`;
    const spacing = 286 / (count - 1), scale = Math.min(1, spacing * .48 / 12);
    return Array.from({length: count}, (_, i) => {
      const color = i < Math.ceil(count / 2) ? 'green' : i < Math.ceil(count * .75) ? 'yellow' : 'red';
      return `<g class="shift-led" data-index="${i}" data-color="${color}" transform="translate(${37 + i * spacing} 31) scale(${scale})">
        <circle r="12" fill="${paint('bezel')}" stroke="#070a0c" stroke-width=".7"/>
        <circle r="10.2" fill="#030708" stroke="#677078" stroke-opacity=".25" stroke-width=".6"/>
        <circle r="9.1" class="shift-led-tint"/>
        <circle r="9.1" class="shift-led-glass" fill="${paint('glass')}"/>
        <g class="shift-led-emission">
          <circle r="9.6" class="shift-led-bloom" filter="${paint('bloom')}"/>
          <circle r="8.5" class="shift-led-light"/>
          <circle r="7.5" fill="${paint('core')}"/>
          <circle r="8.65" fill="none" stroke="currentColor" stroke-opacity=".46" stroke-width=".55"/>
        </g>
        <circle r="9.1" class="shift-led-coat" fill="${paint('coat')}"/>
        <path d="M-6.6-4.7 A8.1 8.1 0 0 1 4.8-6.6" class="shift-led-highlight"/>
        <ellipse class="shift-led-reflection" cx="-3.8" cy="-5.5" rx="2.1" ry=".75" fill="#f2f8ff" opacity=".2" transform="rotate(-25 -3.8 -5.5)"/>
        <path d="M-5.2 6.7 A8.5 8.5 0 0 0 5.5 6.4" fill="none" stroke="#d2e4eb" stroke-opacity=".09" stroke-width=".55"/>
      </g>`;
    }).join('');
  }

  function markup(id) {
    const paint = name => `url(#${id}-${name})`;
    const screws = [[14, 15], [346, 15], [14, 47], [346, 47]].map(([x, y], i) =>
      `<g class="shift-screw" transform="translate(${x} ${y}) rotate(${i % 2 ? 32 : -24})">
        <circle r="4" fill="#090d10" stroke="#626b72" stroke-opacity=".3" stroke-width=".6"/>
        <circle r="3" fill="${paint('screw')}" stroke="#070a0c" stroke-width=".5"/>
        <path d="M-1.9-.45 H1.9 V.45 H-1.9Z" fill="#080c0f"/>
        <path d="M-1.8 .85 H1.8" stroke="#b2bcc2" stroke-opacity=".25" stroke-width=".4"/>
      </g>`).join('');

    return `<svg class="shift-lights-svg" viewBox="0 0 360 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${id}-case" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#465057"/><stop offset=".08" stop-color="#2b333a"/>
          <stop offset=".46" stop-color="#20272d"/><stop offset=".86" stop-color="#151b20"/><stop offset="1" stop-color="#303941"/>
        </linearGradient>
        <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#839099" stop-opacity=".55"/><stop offset=".45" stop-color="#59656d" stop-opacity=".13"/><stop offset="1" stop-color="#020405" stop-opacity=".95"/>
        </linearGradient>
        <pattern id="${id}-texture" class="shift-case-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
          <image class="shift-case-image" width="100" height="100" preserveAspectRatio="none" filter="${paint('tint')}"/>
        </pattern>
        <filter id="${id}-tint" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix class="shift-case-tint" type="matrix"/></filter>
        <linearGradient id="${id}-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".22"/><stop offset=".09" stop-color="#fff" stop-opacity=".04"/><stop offset=".5" stop-color="#000" stop-opacity=".03"/><stop offset=".93" stop-color="#000" stop-opacity=".52"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
        <linearGradient id="${id}-reflection" x1="0" y1="0" x2="1" y2=".38"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".28" stop-color="#fff" stop-opacity=".08"/><stop offset=".4" stop-color="#fff" stop-opacity=".7"/><stop offset=".46" stop-color="#fff" stop-opacity=".08"/><stop offset=".64" stop-color="#fff" stop-opacity="0"/><stop offset=".86" stop-color="#fff" stop-opacity=".17"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="${id}-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#53606a"/><stop offset=".16" stop-color="#242d34"/><stop offset=".62" stop-color="#080d11"/><stop offset="1" stop-color="#39424a"/>
        </linearGradient>
        <radialGradient id="${id}-glass" cx="38%" cy="28%" r="75%">
          <stop stop-color="#9fb8c4" stop-opacity=".16"/><stop offset=".5" stop-color="#10191c" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".76"/>
        </radialGradient>
        <radialGradient id="${id}-core" cx="46%" cy="43%" r="56%">
          <stop stop-color="#ffffee" stop-opacity=".95"/><stop offset=".19" stop-color="#fffde3" stop-opacity=".76"/>
          <stop offset=".47" stop-color="#fffde3" stop-opacity=".17"/><stop offset="1" stop-color="#fffde3" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${id}-coat" x1="0" y1="0" x2=".35" y2="1">
          <stop stop-color="#eaf4ff" stop-opacity=".2"/><stop offset=".42" stop-color="#eaf4ff" stop-opacity=".015"/>
          <stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>
        </linearGradient>
        <linearGradient id="${id}-screw" x1="0" y1="0" x2=".4" y2="1">
          <stop stop-color="#8b969e"/><stop offset=".4" stop-color="#4b555d"/><stop offset="1" stop-color="#242c33"/>
        </linearGradient>
        <filter id="${id}-bloom" x="-65%" y="-65%" width="230%" height="230%" color-interpolation-filters="sRGB">
          <feGaussianBlur stdDeviation="2.3"/>
        </filter>
      </defs>
      <rect x="3" y="8" width="354" height="51" rx="10" fill="#020406" opacity=".55"/>
      <rect class="shift-case-base" x="2" y="4" width="356" height="53" rx="10" fill="#323c44" stroke="${paint('rim')}" stroke-width="1"/>
      <rect class="shift-case-texture" x="3" y="5" width="354" height="51" rx="9" fill="${paint('texture')}"/>
      <rect class="shift-case-shade" x="3" y="5" width="354" height="51" rx="9" fill="${paint('shade')}"/>
      <rect class="shift-case-reflection" x="3" y="5" width="354" height="51" rx="9" fill="${paint('reflection')}"/>
      <path d="M14 6 H346 M16 54 H344" fill="none" stroke="#a2b1bb" stroke-opacity=".11" stroke-width=".65"/>
      <rect x="22" y="14" width="316" height="34" rx="16" fill="#070b0f" stroke="#78848c" stroke-opacity=".14" stroke-width=".7"/>
      <path d="M37 47.5 H323" stroke="#a9b9c3" stroke-opacity=".1" stroke-width=".5"/>
      <g class="shift-led-bank">${ledMarkup(id, LED_COUNT)}</g>${screws}
    </svg>`;
  }

  class ApexShiftLights {
    constructor(host) {
      this.root = document.createElement('div');
      this.root.className = 'apex-shift-lights';
      this.root.setAttribute('aria-hidden', 'true');
      this.id = `apex-shift-${++nextId}`;
      this.root.innerHTML = markup(this.id);
      this.bank = this.root.querySelector('.shift-led-bank');
      this.leds = Array.from(this.root.querySelectorAll('.shift-led'));
      this.cache = new Map();
      this.emissionMask = 0;
      this.flash = false;
      this.colorKey = '';
      this.materialKey = '';
      this.materialParts = Object.fromEntries(['base','image','pattern','tint'].map(key=>[key,this.root.querySelector('.shift-case-'+key)]));
      this.motionQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      host.appendChild(this.root);
      this.render({}, {});
    }

    static sample(frame, settings) { return sample(frame, settings); }
    static get defaults() { return defaults; }
    static get materials() { return materials; }
    static textureURL(id) { return new URL(materials[id]?.file || materials.metal.file, assetBase).href; }

    applyMaterial(settings) {
      const id = Object.hasOwn(materials,settings.material) ? settings.material : 'metal';
      const color = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color.toLowerCase() : '#323c44';
      if(this.materialKey===id+color)return;
      this.materialKey=id+color;this.root.dataset.material=id;this.root.dataset.caseColor=color;
      const m=materials[id],p=this.materialParts;
      p.base.setAttribute('fill',color);
      p.image.setAttribute('href',ApexShiftLights.textureURL(id));
      for(const key of ['width','height']){p.pattern.setAttribute(key,m.tile);p.image.setAttribute(key,m.tile);}
      p.pattern.setAttribute('patternTransform',`rotate(${m.angle})`);
      // Recolor the original map's luminance while preserving weave/grain details.
      const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
      p.tint.setAttribute('values',rgb.flatMap(v=>[.2126*v*m.gain,.7152*v*m.gain,.0722*v*m.gain,0,v*m.lift]).concat([0,0,0,1,0]).join(' '));
    }

    render(frame = {}, settings = {}) {
      settings = normalize(settings);
      if (this.leds.length !== settings.count) {
        this.bank.innerHTML = ledMarkup(this.id, settings.count);
        this.leds = Array.from(this.bank.children);
        this.emissionMask = 0;
        this.flash = false;
        this.colorKey = '';
      }
      this.applyMaterial(settings);
      const reduced = !!(this.motionQuery && this.motionQuery.matches) || (frame.config || {}).animation === false;
      // Resolve the environment here so the public sampler remains deterministic.
      const input = reduced ? {...frame, config: {...frame.config, animation: false}} : frame;
      const sampled = settings.enabled ? sampleResolved(input, settings)
        : {count: 0, flash: false, off: true, phase: 'disabled'};
      const update = (key, value, write) => {
        if (this.cache.get(key) === value) return;
        this.cache.set(key, value); write(value);
      };
      const style = (key, value) => update(key, String(value), v => this.root.style.setProperty(key, v));
      style('--shift-brightness', settings.brightness);
      style('--shift-environment', typeof frame.lightingBrightness === 'number' && Number.isFinite(frame.lightingBrightness)
        ? number(frame.lightingBrightness, 1, 0, 1) : 'var(--velo-light-brightness, 1)');
      for (const [color, value] of Object.entries(settings.colors)) style('--shift-' + color, value);
      const quality = ['low', 'balanced', 'high'].includes(frame.quality) ? frame.quality : '';
      update('quality', quality, v => v ? this.root.dataset.quality = v : this.root.removeAttribute('data-quality'));
      update('phase', sampled.phase, v => this.root.dataset.phase = v);
      update('lit', sampled.count, v => this.root.dataset.lit = String(v));
      update('off', sampled.off, v => this.root.classList.toggle('is-off', v));
      update('flashing', sampled.flash, v => this.root.classList.toggle('is-flashing', v));
      update('motion', reduced, v => this.root.classList.toggle('reduce-motion', v));
      const limits = thresholds(frame, settings);
      // Ignition always uses the original green/yellow/red proportions. Live
      // red LEDs follow the vehicle redline; the default profile remains 6/3/3.
      const colorKey = sampled.phase.startsWith('ignition-') ? 'ignition'
        : [limits.redline, limits.start, limits.full].join(':');
      if (this.colorKey !== colorKey) {
        this.colorKey = colorKey;
        const yellow = limits.start + (limits.redline - limits.start) * .65;
        this.leds.forEach((led, i) => {
          const rpm = ledThreshold(i, settings.count, limits.start, limits.full);
          const color = colorKey === 'ignition'
            ? i < Math.ceil(settings.count / 2) ? 'green' : i < Math.ceil(settings.count * .75) ? 'yellow' : 'red'
            : rpm >= limits.redline ? 'red' : rpm >= yellow ? 'yellow' : 'green';
          if (led.dataset.color !== color) led.dataset.color = color;
        });
      }
      const mask = (1 << sampled.count) - 1, changed = mask ^ this.emissionMask;
      this.leds.forEach((led, i) => {
        if (changed & (1 << i)) led.classList.toggle('is-lit', i < sampled.count);
        if (this.flash !== sampled.flash) led.classList.toggle('is-red', sampled.flash);
      });
      this.emissionMask = mask;
      this.flash = sampled.flash;
    }
  }

  window.ApexShiftLights = ApexShiftLights;
})();
