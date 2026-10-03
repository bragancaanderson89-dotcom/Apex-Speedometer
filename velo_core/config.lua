Config = {
    Framework = 'auto', -- auto, qbox, qbcore ou standalone; ESX/outras podem usar standalone.
    RequireLogin = true,
    Unit = 'KM/H', UpdateInterval = 50, IdleInterval = 350, DriverOnly = false,
    HideWhenPaused = true, HideWhenDead = true,
    ExcludedClasses = { [13]=true,[14]=true,[15]=true,[16]=true,[21]=true },
    EditorCommand = 'editvelo', ToggleCommand = 'apexhud', DiagnosticCommand = 'velodiag',
    UI = {width=440,right=28,bottom=24,opacity=1,maxRpm=9000,animation=true,ignitionDuration=3000,redline=.78,limiter=.96,lowFuel=15,hotTemperature=115},
    -- GTA RPM is normalized (0..1). maxRpm is a configurable display scale, not physical RPM.
    -- Partial class/model overrides inherit default -> class -> model. Models accept names or hashes.
    VehicleProfiles = {default={maxRpm=9000,redline=.78,limiter=.96},classes={},models={}},
    -- Telemetry cadence; the UI independently controls its rendering FPS through preferences.
    Performance = {activeInterval=50,parkedInterval=120,idleInterval=350},
    -- Local per-model/plate KVP history. Gaps and implausible displacement are discarded.
    Trip = {
        saveInterval=30000,maxSampleSeconds=2,maxSpeedMps=150,teleportSlackMeters=5,
        -- Estimated range = available fuel percentage * full-tank kilometres / 100.
        -- Optional overrides: classes[8]={fullTankRangeKm=250}, models.sultan={fullTankRangeKm=500}.
        -- Models accept names or hashes; rangeStateKey reads an external range in kilometres.
        fullTankRangeKm=400,classes={},models={},rangeStateKey=nil,
        navigationInterval=1000 -- GPS route reads are capped at 1 Hz; no straight-line fallback.
    },
    Fuel = {mode='auto',stateKey='fuel',resource='LegacyFuel',export='GetFuel'},
    Seatbelt = {enabled=true,mode='auto',stateKeys={'seatbelt','seatbeltActive','seatbeltOn'},harnessKey='harness',event='seatbelt:client:ToggleSeatbelt'},
    VehicleState = {rpmKey=nil,temperatureKey=nil},
    -- Auto adds a gradual dashboard warm-up floor; native displays raw GTA temperature.
    -- A configured VehicleState.temperatureKey bypasses the visual warm-up.
    Temperature = {mode='auto',ambient=40,normal=90,idleRise=.12,loadRise=.35,cooling=.18},
    ModelOffers = {
        {id='zsx',resource='zsx_speedometer',name='ZSX',
         description='Adicione este modelo ao seu painel e personalize cada componente.',
         url='', -- Put your full GitHub/store URL here, e.g. https://...
         preview='assets/models/zsx-preview.png'}
    },
    EngineWarningHealth = 450,
    Indicators = {absKey='apexABS',tractionKey='apexTraction',doorThreshold=.08},
    Signals = {enabled=true,leftKey='LEFT',rightKey='RIGHT',hazardKey='UP',autoCancel=10000}
}
