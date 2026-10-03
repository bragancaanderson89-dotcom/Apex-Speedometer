VeloTrip = {errors={}}
local active
local storagePrefix='trip:v3.4:'
local maxKm,maxSeconds=1e9,1e12
local navigationCache,navigationCount,rangeHashes = {},0,{}

local function finite(value)
    return type(value)=='number' and value==value and value~=math.huge and value~=-math.huge
end
local function bounded(value,low,high,fallback)
    return finite(value) and math.max(low,math.min(high,value)) or fallback
end
local function settings()
    local config=Config.Trip or {}
    return bounded(config.saveInterval,1000,300000,30000),bounded(config.maxSampleSeconds,.1,5,2),
        bounded(config.maxSpeedMps,1,300,150),bounded(config.teleportSlackMeters,0,20,5)
end
local function clock()
    local now=VeloBridge.safe('GetGameTimer',nil)
    return finite(now) and now or nil
end
local function coordinates(vehicle)
    local value=VeloBridge.safe('GetEntityCoords',nil,vehicle)
    local ok,x,y,z=pcall(function() return value.x,value.y,value.z end)
    if ok and finite(x) and finite(y) and finite(z) then return {x=x,y=y,z=z} end
end
local function snapshot()
    local record=active or {}
    local km,seconds=record.tripKm or 0,record.elapsedSeconds or 0
    return {odometerKm=record.odometerKm or 0,tripKm=km,averageKmh=seconds>0 and km*3600/seconds or 0,elapsedSeconds=seconds}
end
function VeloTrip.flush()
    if not active or not active.dirty then return true end
    if not active.persistent then active.dirty=false;return true end
    local ok,err=pcall(function()
        local value=snapshot();value.version=1
        SetResourceKvp(storagePrefix..active.key,json.encode(value))
    end)
    -- Throttle failed periodic attempts too; dirty data remains available for retry.
    active.savedAt=clock()
    if ok then active.dirty=false;VeloTrip.errors.write=nil
    else VeloTrip.errors.write=tostring(err) end
    return ok
end
local function load(vehicle,key,persistent,now)
    local record={vehicle=vehicle,key=key,persistent=persistent,odometerKm=0,tripKm=0,elapsedSeconds=0,savedAt=now,dirty=false}
    if persistent then
        local ok,raw=pcall(GetResourceKvpString,storagePrefix..key)
        if not ok then VeloTrip.errors.read=tostring(raw)
        elseif type(raw)=='string' and #raw<=2048 then
            local decoded,value,nextByte,err=pcall(json.decode,raw)
            local trailing=type(nextByte)=='number' and raw:sub(nextByte):match('%S')
            if decoded and not err and not trailing and type(value)=='table' and value.version==1 then
                record.odometerKm=bounded(value.odometerKm,0,maxKm,0)
                record.tripKm=bounded(value.tripKm,0,record.odometerKm,0)
                record.elapsedSeconds=bounded(value.elapsedSeconds,0,maxSeconds,0)
            else VeloTrip.errors.decode='Invalid trip KVP' end
        end
    end
    return record
end

function VeloTrip.update(vehicle,speedMps)
    if not vehicle or vehicle==0 then VeloTrip.finish();return snapshot() end
    local key,persistent=VeloProfiles.vehicleKey(vehicle)
    local now=clock()
    if not active or active.key~=key or active.persistent~=persistent or (not persistent and active.vehicle~=vehicle) then
        VeloTrip.flush();active=load(vehicle,key,persistent,now)
    elseif active.vehicle~=vehicle then
        -- Same plate/model respawn keeps history, but never bridges entity positions.
        VeloTrip.flush();active.position=nil;active.at=nil;active.vehicle=vehicle
    end
    local position=coordinates(vehicle)
    local interval,maxDt,maxSpeed,slack=settings()
    local speed=finite(speedMps) and bounded(speedMps,0,maxSpeed,0) or nil
    local dt=now and active.at and ((now-active.at)%4294967296)/1000 or 0
    if dt>0 and dt<=maxDt then
        if position and active.position then
            local dx,dy,dz=position.x-active.position.x,position.y-active.position.y,position.z-active.position.z
            local metres=math.sqrt(dx*dx+dy*dy+dz*dz)
            local expected=math.max(speed or 0,active.speed or 0)
            local limit=math.min(maxSpeed*dt+slack,expected*dt*1.75+slack)
            -- Moving time only. Ignore sub-centimetre jitter, pauses, teleports and unsampled gaps.
            if finite(metres) and metres>.01 and metres<=limit then
                local km=metres/1000
                active.odometerKm=math.min(maxKm,active.odometerKm+km)
                active.tripKm=math.min(active.odometerKm,active.tripKm+km)
                active.elapsedSeconds=math.min(maxSeconds,active.elapsedSeconds+dt);active.dirty=true
            end
        end
    end
    -- Always rebase after teleports, invalid coordinates, clock discontinuities or long gaps.
    active.position=position;active.at=now;active.speed=speed
    if now and active.savedAt and (now-active.savedAt)%4294967296>=interval then VeloTrip.flush() end
    return snapshot()
end

function VeloTrip.finish()
    if active and active.vehicle then
        local vehicle=active.vehicle
        if VeloBridge.boolean(VeloBridge.safe('DoesEntityExist',false,vehicle)) then
            VeloTrip.update(vehicle,VeloBridge.safe('GetEntitySpeed',nil,vehicle))
        end
        VeloTrip.flush()
        active.vehicle=nil;active.position=nil;active.at=nil;active.speed=nil
    else VeloTrip.flush() end
end

function VeloTrip.reset(vehicle)
    if not vehicle or vehicle==0 then return nil,false end
    VeloTrip.update(vehicle,VeloBridge.safe('GetEntitySpeed',nil,vehicle))
    active.tripKm=0;active.elapsedSeconds=0;active.dirty=true
    local saved=VeloTrip.flush()
    return snapshot(),saved
end

local function read(name,...)
    local fn=_G[name]
    if type(fn)~='function' then return nil,'unavailable' end
    local ok,value=pcall(fn,...)
    if ok then return value end
    return nil,tostring(value)
end
local function modelIdentity(value)
    if finite(value) and value%1==0 then return tostring(math.floor(value%4294967296)) end
    if type(value)~='string' then return nil end
    local key=value:match('^%s*(.-)%s*$'):lower()
    local numeric=tonumber(key)
    if numeric then return modelIdentity(numeric) end
    if rangeHashes[key] then return rangeHashes[key] end
    local hashed=read('joaat',key) or read('GetHashKey',key)
    local identity=finite(hashed) and modelIdentity(hashed) or (type(hashed)=='string' and hashed:lower() or nil)
    if identity then rangeHashes[key]=identity end
    return identity
end
local function rangeOverride(value)
    if type(value)=='table' then value=value.fullTankRangeKm end
    if finite(value) and value>0 and value<=100000 then return value end
end
local function fullTankRange(vehicle,config)
    local km=rangeOverride(config.fullTankRangeKm) or 400
    local source='fuel:default'
    local class=read('GetVehicleClass',vehicle)
    local classes=type(config.classes)=='table' and config.classes or {}
    local override=rangeOverride(classes[class] or classes[tostring(class)])
    if override then km=override;source='fuel:class:'..tostring(class) end
    local model=VeloProfiles.modelIdentity(vehicle)
    if not model then return km,source end
    local models=type(config.models)=='table' and config.models or {}
    local numeric=tonumber(model)
    override=rangeOverride(models[model] or (numeric and models[numeric]))
    if not override and numeric then override=rangeOverride(models[numeric-4294967296] or models[tostring(numeric-4294967296)]) end
    if not override then
        local keys={}
        for key in pairs(models) do if type(key)=='string' then keys[#keys+1]=key end end
        table.sort(keys)
        for _,key in ipairs(keys) do
            if modelIdentity(key)==model then
                override=rangeOverride(models[key]);if override then break end
            end
        end
    end
    if override then return override,'fuel:model:'..model end
    return km,source
end
local function navigation(vehicle,config)
    local now=clock()
    if not now then return nil,false end
    local key=VeloProfiles.vehicleKey(vehicle)
    local cache=navigationCache[vehicle]
    local interval=bounded(config.navigationInterval,1000,60000,1000)
    if cache and cache.key==key and (now-cache.at)%4294967296<interval then
        return cache.destinationKm,cache.routeAvailable
    end
    if not cache then
        -- Keep the client cache bounded even when many different entities are visited.
        if navigationCount>=32 then navigationCache[next(navigationCache)]=nil;navigationCount=navigationCount-1 end
        navigationCount=navigationCount+1
    end
    cache={key=key,at=now,routeAvailable=false};navigationCache[vehicle]=cache
    VeloTrip.errors.navigation=nil
    local found,err=read('GetGpsBlipRouteFound')
    if err then VeloTrip.errors.navigation='GetGpsBlipRouteFound: '..err end
    if VeloBridge.boolean(found) then
        local metres,lengthError=read('GetGpsBlipRouteLength')
        if finite(metres) and metres>=0 and metres<=maxKm*1000 then
            cache.destinationKm=metres/1000;cache.routeAvailable=true
        else VeloTrip.errors.navigation='GetGpsBlipRouteLength: '..(lengthError or 'invalid length') end
    end
    return cache.destinationKm,cache.routeAvailable
end

-- Mutates/returns the complete telemetry data. These transient fields never enter the trip KVP.
function VeloTrip.enrich(vehicle,data)
    if type(data)~='table' then return data end
    local trip=type(data.trip)=='table' and data.trip or {};data.trip=trip
    trip.rangeKm=nil;trip.rangeEstimated=true;trip.rangeSource='unavailable'
    trip.destinationKm=nil;trip.etaSeconds=nil;trip.routeAvailable=false;trip.etaEstimated=true
    if not vehicle or vehicle==0 then return data end
    local config=Config.Trip or {}
    local stateRange
    if type(config.rangeStateKey)=='string' and config.rangeStateKey~='' then
        local ok,value=pcall(function() return VeloBridge.state(vehicle)[config.rangeStateKey] end)
        if ok and finite(value) and value>=0 and value<=maxKm then stateRange=value end
    end
    local available=type(data.availability)=='table' and data.availability or {}
    if stateRange~=nil then
        trip.rangeKm=stateRange;trip.rangeEstimated=false;trip.rangeSource='state:'..config.rangeStateKey
    elseif available.fuel==true and finite(data.fuel) and data.fuel>=0 and data.fuel<=100 then
        local tank,source=fullTankRange(vehicle,config)
        trip.rangeKm=data.fuel*tank/100;trip.rangeSource=source
    end
    trip.destinationKm,trip.routeAvailable=navigation(vehicle,config)
    if trip.routeAvailable then
        local speed=trip.averageKmh
        if not finite(speed) or speed<=0 then
            speed=available.speed==true and finite(data.speed) and data.speed>0 and data.speed or nil
            if speed and Config.Unit=='MPH' then speed=speed*1.609344 end
        end
        if finite(speed) and speed>0 then
            local seconds=trip.destinationKm*3600/math.max(5,speed)
            if finite(seconds) then trip.etaSeconds=math.min(maxSeconds,seconds) end
        end
    end
    return data
end
