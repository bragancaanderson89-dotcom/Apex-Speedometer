VeloBridge = {errors={},readFailures=0}
local knownBelt,legacyBelt,overrideBelt = false,false,nil
local thermalVehicle,thermalFloor,thermalAt = nil,nil,nil
-- Legacy Lua natives return 1/false; OAL may return true/false.
-- Compare explicitly: Lua's numeric zero is truthy too.
function VeloBridge.boolean(value) return value==true or value==1 end
function VeloBridge.number(v,min,max,fallback)
    if type(v)~='number' or v~=v or v==math.huge or v==-math.huge then return fallback end
    return math.max(min,math.min(max,v))
end
function VeloBridge.safe(name,fallback,...)
    local fn=_G[name]
    local ok,value=false,nil
    if type(fn)=='function' then ok,value=pcall(fn,...) end
    if not ok or value==nil then
        if not VeloBridge.errors[name] then print(('[Apex_Speedometer] Falha na leitura %s; os outros instrumentos continuam funcionando.'):format(name)) end
        VeloBridge.errors[name]=true
        VeloBridge.readFailures=VeloBridge.readFailures+1
        return fallback,false
    end
    return value,true
end
local function numeric(value)
    return type(value)=='number' and value==value and value~=math.huge and value~=-math.huge
end
local function instrument(name,low,high,fallback,...)
    local raw,readAvailable=VeloBridge.safe(name,nil,...)
    local available=numeric(raw)
    if readAvailable and not available then
        VeloBridge.errors[name]=true;VeloBridge.readFailures=VeloBridge.readFailures+1
    end
    return VeloBridge.number(raw,low,high,fallback),available,raw
end
local function stateValue(state,key)
    if not key then return nil end
    local ok,value=pcall(function() return state[key] end)
    if ok then return value end
end
function VeloBridge.state(vehicle)
    local ok,value=pcall(function() return Entity(vehicle).state end)
    return ok and value or {}
end
function VeloBridge.fuel(vehicle,state)
    local value,source,mode=nil,nil,Config.Fuel.mode
    local function external(resource,method)
        local ok,result=pcall(function() return exports[resource][method](exports[resource],vehicle) end)
        if ok and numeric(result) then return result,'export:'..resource..':'..method end
    end
    if mode=='state' then value=stateValue(state,Config.Fuel.stateKey);source='state:'..tostring(Config.Fuel.stateKey)
    elseif mode=='export' then
        value,source=external(Config.Fuel.resource,Config.Fuel.export)
    elseif mode=='auto' then
        if VeloBridge.safe('GetResourceState','missing','ox_fuel')=='started' then
            value=stateValue(state,Config.Fuel.stateKey);source='state:'..tostring(Config.Fuel.stateKey)
        else
            for _,resource in ipairs({'cdn-fuel','LegacyFuel','ps-fuel','qb-fuel'}) do
                if VeloBridge.safe('GetResourceState','missing',resource)=='started' then
                    value,source=external(resource,'GetFuel')
                    if numeric(value) then break end
                end
            end
        end
    end
    if numeric(value) then return VeloBridge.number(value,0,100,0),true,source end
    local fuel,available=instrument('GetVehicleFuelLevel',0,100,0,vehicle)
    return fuel,available,available and 'native:GetVehicleFuelLevel' or 'unavailable'
end
function VeloBridge.belt()
    if overrideBelt~=nil then return overrideBelt end
    local state=LocalPlayer.state
    if VeloBridge.boolean(state[Config.Seatbelt.harnessKey]) then return true end
    if Config.Seatbelt.mode=='event' or (Config.Seatbelt.mode=='auto' and knownBelt and GetResourceState('qbx_seatbelt')~='started') then return legacyBelt end
    for _,key in ipairs(Config.Seatbelt.stateKeys) do local value=state[key];if type(value)=='boolean' or value==0 or value==1 then return VeloBridge.boolean(value) end end
    return legacyBelt
end
RegisterNetEvent(Config.Seatbelt.event,function(value) knownBelt=true;if type(value)=='boolean' or value==0 or value==1 then legacyBelt=VeloBridge.boolean(value) else legacyBelt=not legacyBelt end end)
exports('SetSeatbelt',function(value) if value==nil or type(value)=='boolean' then overrideBelt=value end end)
function VeloBridge.reset() knownBelt=false;legacyBelt=false;overrideBelt=nil;thermalVehicle=nil;thermalFloor=nil;thermalAt=nil end
function VeloBridge.temperature(vehicle,raw,engine,rpm,custom)
    local n=VeloBridge.number
    local value=n(raw,-40,180,85)
    local config=Config.Temperature or {}
    if custom or config.mode=='native' then return value end
    local ambient,normal=n(config.ambient,-40,80,40),n(config.normal,80,110,90)
    local now=GetGameTimer()
    if thermalVehicle~=vehicle or thermalFloor==nil then
        thermalVehicle=vehicle;thermalFloor=math.max(ambient,math.min(normal,value));thermalAt=now
    end
    -- Time-based display floor; never writes the vehicle's engine temperature.
    local dt=math.max(0,math.min(2,(now-thermalAt)/1000));thermalAt=now
    if engine then
        local rate=n(config.idleRise,0,5,.12)+n(config.loadRise,0,5,.35)*n(rpm,0,1,0)
        thermalFloor=math.min(normal,thermalFloor+rate*dt)
    else thermalFloor=math.max(ambient,thermalFloor-n(config.cooling,0,5,.18)*dt) end
    return math.max(value,thermalFloor)
end
function VeloBridge.read(vehicle,class)
    local safe,n=VeloBridge.safe,VeloBridge.number
    VeloBridge.readFailures=0
    local profile=VeloProfiles.resolve(vehicle,class)
    local state=VeloBridge.state(vehicle)
    local rawEngine=safe('GetIsVehicleEngineRunning',false,vehicle)
    local engine=VeloBridge.boolean(rawEngine)
    local speed,speedAvailable,rawSpeed=instrument('GetEntitySpeed',0,500,0,vehicle)
    local customRpm=stateValue(state,Config.VehicleState.rpmKey)
    local rpm,rpmAvailable,rawRpm,rpmSource
    if numeric(customRpm) then
        rawRpm=customRpm;rpmAvailable=true;rpmSource='state:'..Config.VehicleState.rpmKey
        -- Optional state feeds may use display-scale units. GTA's native never does.
        rpm=n(customRpm>1 and customRpm/profile.maxRpm or customRpm,0,1,0)
    else
        rpm,rpmAvailable,rawRpm=instrument('GetVehicleCurrentRpm',0,1,0,vehicle)
        rpmSource=rpmAvailable and 'native:GetVehicleCurrentRpm (normalized GTA)' or 'unavailable'
    end
    local customTemperature=stateValue(state,Config.VehicleState.temperatureKey)
    local rawTemperature,temperatureAvailable,temperatureSource
    if numeric(customTemperature) then
        rawTemperature=customTemperature;temperatureAvailable=true;temperatureSource='state:'..Config.VehicleState.temperatureKey
    else
        local unused
        unused,temperatureAvailable,rawTemperature=instrument('GetVehicleEngineTemperature',-40,180,85,vehicle)
        temperatureSource=temperatureAvailable and 'native:GetVehicleEngineTemperature' or 'unavailable'
    end
    local approximate=not numeric(customTemperature) and (Config.Temperature or {}).mode~='native'
    local temperature=VeloBridge.temperature(vehicle,rawTemperature,engine,rpm,numeric(customTemperature))
    local velocity=safe('GetEntitySpeedVector',{y=0},vehicle,true)
    local currentGear,gearAvailable,rawGear=instrument('GetVehicleCurrentGear',0,12,0,vehicle)
    local fuel,fuelAvailable,fuelSource=VeloBridge.fuel(vehicle,state)
    local sources={speed=speedAvailable and 'native:GetEntitySpeed' or 'unavailable',rpm=rpmSource,gear=gearAvailable and 'native:GetVehicleCurrentGear' or 'unavailable',fuel=fuelSource,temperature=temperatureSource}
    if approximate then sources.temperature=sources.temperature..' + simulated display floor' end
    VeloBridge.lastRead={vehicle=vehicle,profile=profile,sources=sources,engine={value=rawEngine,type=type(rawEngine)},
        speed={value=rawSpeed,type=type(rawSpeed),source=sources.speed,available=speedAvailable},
        rpm={value=rawRpm,type=type(rawRpm),source=rpmSource,available=rpmAvailable,normalized=rpm},
        gear={value=rawGear,type=type(rawGear),source=sources.gear,available=gearAvailable},
        fuel={value=fuel,source=fuelSource,available=fuelAvailable},
        temperature={value=rawTemperature,type=type(rawTemperature),display=temperature,source=sources.temperature,available=temperatureAvailable,approximate=approximate}}
    local reverse=false
    local ok,forward=pcall(function() return velocity.y end)
    if ok and numeric(forward) then reverse=forward<-.35 end
    local gear=reverse and 'R' or ((not engine or (currentGear==0 and speed<.5)) and 'N' or tostring(math.max(1,math.floor(currentGear))))
    local dashboard=math.floor(n(safe('GetVehicleDashboardLights',0),0,65535,0))
    local indicators=math.floor(n(safe('GetVehicleIndicatorLights',0,vehicle),0,3,0))
    local lights,highbeam=false,false
    if GetVehicleLightsState then local ok,_,a,b=pcall(GetVehicleLightsState,vehicle);if ok then lights=VeloBridge.boolean(a);highbeam=VeloBridge.boolean(b) end end
    local door=false
    if class~=8 then for i=0,5 do if n(safe('GetVehicleDoorAngleRatio',0,vehicle,i),0,1,0)>Config.Indicators.doorThreshold then door=true;break end end end
    local healthRaw,healthAvailable=safe('GetVehicleEngineHealth',nil,vehicle)
    local health=n(healthRaw,-4000,1000,1000)
    local hour,hourAvailable=instrument('GetClockHours',0,23,12)
    return {engine=engine,speed=speed*(Config.Unit=='MPH' and 2.2369362921 or 3.6),rpm=engine and rpm or 0,gear=gear,mode='M',
        profile=profile,vehicleKey=VeloProfiles.vehicleKey(vehicle),night=hourAvailable and (hour>=20 or hour<6) or false,
        availability={speed=speedAvailable,rpm=rpmAvailable,gear=gearAvailable,fuel=fuelAvailable,temperature=temperatureAvailable,engineHealth=healthAvailable and type(healthRaw)=='number' and healthRaw==healthRaw},sources=sources,temperatureApproximate=approximate,engineHealth=healthAvailable and health or nil,
        fuel=fuel,temperature=n(temperature,-40,180,85),seatbelt=VeloBridge.belt(),seatbeltAvailable=Config.Seatbelt.enabled and class~=8,
        handbrake=VeloBridge.boolean(safe('GetVehicleHandbrake',false,vehicle)) or (dashboard&4)~=0,engineWarning=health<Config.EngineWarningHealth or (dashboard&8)~=0,
        abs=VeloBridge.boolean(state[Config.Indicators.absKey]) or (dashboard&16)~=0,traction=VeloBridge.boolean(state[Config.Indicators.tractionKey]) or VeloBridge.boolean(state.tractionControlActive),
        left=(indicators&1)~=0,right=(indicators&2)~=0,headlights=lights or (dashboard&128)~=0,highbeam=highbeam or (dashboard&256)~=0,
        oilWarning=(dashboard&64)~=0,batteryWarning=(dashboard&512)~=0,doorOpen=door,police=class==18,emergencyLights=class==18 and VeloBridge.boolean(safe('IsVehicleSirenOn',false,vehicle))}
end
