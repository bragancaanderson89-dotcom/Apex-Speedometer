VeloTelemetry = {}
local ready,shown,manualHidden,externalHidden = false,false,false,false
local lastVehicle,lastEngine = 0,false
local pendingIgnition,lastPollAt,lastSampleAt,lastSample = false,nil,nil,nil
local sampleInterval=0
function VeloTelemetry.performance()
    local config=Config.Performance or {}
    local n=VeloBridge.number
    local active=n(config.activeInterval,16,1000,50)
    local parked=n(config.parkedInterval,active,2000,math.max(active,120))
    local idle=n(config.idleInterval,parked,5000,math.max(parked,350))
    return {activeInterval=active,parkedInterval=parked,idleInterval=idle}
end
local function interval(data,previous)
    local performance=VeloTelemetry.performance()
    local changed=previous and (math.abs(data.rpm-previous.rpm)>.025 or math.abs(data.speed-previous.speed)>.75)
    if changed or data.rpm>.25 or data.speed>.5 then return performance.activeInterval end
    -- Back off failed/unsupported reads while parked, then retry on the next sample.
    if VeloBridge.readFailures>0 or not data.engine then return performance.idleInterval end
    return performance.parkedInterval
end
function VeloTelemetry.hide()
    if ready and shown then SendNUIMessage({source='velo_core',action='hide'}) end
    shown=false
end
RegisterNUICallback('ready',function(_,cb)
    ready=true;shown=false;lastSampleAt=nil;pendingIgnition=pendingIgnition or lastEngine
    local config={};for k,v in pairs(Config.UI) do config[k]=v end
    config.unit=Config.Unit;config.preferences=VeloEditor.getPreferences();config.models=VeloRegistry.list();config.offers=VeloRegistry.offers()
    config.performance=VeloTelemetry.performance()
    cb({ok=true,config=config});SendNUIMessage({source='velo_core',action='configure',config=config});VeloEditor.onReady()
end)
RegisterCommand(Config.ToggleCommand,function() manualHidden=not manualHidden;if manualHidden then VeloTelemetry.hide() end end,false)
exports('SetHidden',function(value) externalHidden=value==true;if externalHidden then VeloTelemetry.hide() end end)
RegisterNUICallback('tripReset',function(_,cb)
    local vehicle=GetVehiclePedIsIn(PlayerPedId(),false)
    if vehicle==0 or not VeloBridge.boolean(DoesEntityExist(vehicle)) then cb({ok=false,error='no_vehicle'});return end
    local data,saved=VeloTrip.reset(vehicle)
    lastSampleAt=nil
    cb({ok=saved,data=data,vehicleKey=VeloProfiles.vehicleKey(vehicle),error=not saved and 'storage_failed' or nil})
end)
RegisterCommand(Config.DiagnosticCommand,function()
    local vehicle=GetVehiclePedIsIn(PlayerPedId(),false)
    local report={version=GetResourceMetadata(GetCurrentResourceName(),'version',0),framework=VeloFramework.name(),loaded=VeloFramework.loaded(),nuiReady=ready,models=VeloRegistry.list(),nativeErrors=VeloBridge.errors,shift=VeloEditor.getPreferences().shift,performance=VeloTelemetry.performance(),tripErrors=VeloTrip.errors}
    if vehicle~=0 then
        report.vehicle=VeloBridge.read(vehicle,GetVehicleClass(vehicle));report.rawNatives=VeloBridge.lastRead
        report.sources=report.vehicle.sources;report.profile=report.vehicle.profile
    end
    print('[velo_core] Diagnóstico '..json.encode(report))
end,false)
AddEventHandler('onClientResourceStop',function(resource)
    if resource==GetCurrentResourceName() then VeloTrip.finish();VeloEditor.close();VeloTelemetry.hide() end
end)
CreateThread(function()
    while true do
        local performance=VeloTelemetry.performance()
        local now=GetGameTimer()
        if lastPollAt and now<lastPollAt then lastSampleAt=nil end
        lastPollAt=now
        local ped=PlayerPedId();local vehicle=GetVehiclePedIsIn(ped,false)
        local exists=vehicle~=0 and VeloBridge.boolean(DoesEntityExist(vehicle))
        VeloSignals.tick(exists and vehicle or 0)
        if not exists then
            VeloTrip.finish();VeloTelemetry.hide();lastVehicle=0;lastEngine=false;pendingIgnition=false
            lastSampleAt=nil;lastSample=nil;VeloBridge.reset()
            Wait(performance.idleInterval)
        else
            local class=GetVehicleClass(vehicle)
            local visible=ready and VeloFramework.loaded() and not manualHidden and not externalHidden and not Config.ExcludedClasses[class]
                and (not Config.DriverOnly or GetPedInVehicleSeat(vehicle,-1)==ped)
                and (not Config.HideWhenPaused or not VeloBridge.boolean(IsPauseMenuActive())) and (not Config.HideWhenDead or not VeloBridge.boolean(IsEntityDead(ped)))
            local changedVehicle=vehicle~=lastVehicle
            if changedVehicle then
                VeloBridge.reset();pendingIgnition=false;lastEngine=false;lastSample=nil;lastSampleAt=nil
            end
            -- Poll ignition and exits at the active cadence even when packets are delayed/hidden.
            local engineValue,engineAvailable=VeloBridge.safe('GetIsVehicleEngineRunning',nil,vehicle)
            engineAvailable=engineAvailable and (type(engineValue)=='boolean' or engineValue==0 or engineValue==1)
            local engine=lastEngine
            if engineAvailable then engine=VeloBridge.boolean(engineValue) end
            local changedEngine=engineAvailable and engine~=lastEngine
            if changedEngine then
                if engine then pendingIgnition=true end
                lastSampleAt=nil
            end
            if visible and not shown then lastSampleAt=nil end
            if not lastSampleAt or (now-lastSampleAt)%4294967296>=sampleInterval then
                local speed=VeloBridge.number(VeloBridge.safe('GetEntitySpeed',0,vehicle),0,500,0)
                local trip=VeloTrip.update(vehicle,speed)
                if visible then
                    -- Every instrument is independent; a null read cannot discard healthy fields.
                    local data=VeloBridge.read(vehicle,class)
                    data.trip=trip
                    VeloTrip.enrich(vehicle,data)
                    data.visible=true;data.ignition=data.engine and pendingIgnition
                    SendNUIMessage({source='velo_core',action='update',data=data});shown=true
                    if data.ignition then pendingIgnition=false end
                    sampleInterval=interval(data,lastSample);lastSample=data
                else sampleInterval=performance.idleInterval end
                lastSampleAt=now
            end
            if not visible then VeloTelemetry.hide() end
            if VeloBridge.boolean(IsEntityDead(ped)) and VeloEditor.isOpen() then VeloEditor.close() end
            lastVehicle=vehicle;lastEngine=engine
            Wait(performance.activeInterval)
        end
    end
end)
