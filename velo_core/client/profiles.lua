VeloProfiles = {}
local nameHashes = {}

local function finite(value)
    return type(value)=='number' and value==value and value~=math.huge and value~=-math.huge
end
local function bounded(value,low,high,fallback)
    return finite(value) and math.max(low,math.min(high,value)) or fallback
end
local function read(name,...)
    if type(_G[name])~='function' then return nil end
    local ok,value=pcall(_G[name],...)
    if ok then return value end
end
local function text(value,fallback)
    if type(value)~='string' then return fallback end
    local clean=value:match('^%s*(.-)%s*$'):gsub('%c','')
    return clean~='' and clean:sub(1,96) or fallback
end
local function hash(value)
    if finite(value) and value%1==0 then return value%4294967296 end
    if type(value)~='string' then return nil end
    local key=value:match('^%s*(.-)%s*$'):lower()
    local numeric=tonumber(key)
    if numeric then return hash(numeric) end
    if nameHashes[key]~=nil then return nameHashes[key] end
    local result=read('joaat',key) or read('GetHashKey',key)
    -- Real natives return numbers; string identities also allow lightweight Lua mocks.
    result=finite(result) and hash(result) or (type(result)=='string' and result:lower() or nil)
    if result~=nil then nameHashes[key]=result end
    return result
end

function VeloProfiles.modelIdentity(vehicle)
    local model=read('GetEntityModel',vehicle)
    if finite(model) then return tostring(math.floor(model%4294967296)) end
    if type(model)=='string' and model~='' then return model:lower() end
    return nil
end

function VeloProfiles.vehicleKey(vehicle)
    local model=VeloProfiles.modelIdentity(vehicle)
    local plate=read('GetVehicleNumberPlateText',vehicle)
    plate=type(plate)=='string' and plate:match('^%s*(.-)%s*$'):upper():gsub('%c','') or ''
    -- Never persist anonymous entities together under a fabricated shared plate.
    return plate..':'..(model or 'unknown'),model~=nil and model~='0' and plate~=''
end

function VeloProfiles.resolve(vehicle,class)
    local config=Config.VehicleProfiles or {}
    local result={id='default',label='GTA display scale',maxRpm=9000,redline=.78,limiter=.96}
    local function apply(profile,id,label)
        if type(profile)~='table' then return end
        result.id=text(profile.id,id);result.label=text(profile.label,label)
        result.maxRpm=bounded(profile.maxRpm,1000,20000,result.maxRpm)
        result.redline=bounded(profile.redline,.1,.99,result.redline)
        result.limiter=bounded(profile.limiter,.2,1,result.limiter)
    end
    apply(config.default,'default','GTA display scale')
    class=class or read('GetVehicleClass',vehicle)
    local classes=type(config.classes)=='table' and config.classes or {}
    apply(classes[class] or classes[tostring(class)],'class:'..tostring(class),'Class '..tostring(class))
    local model=read('GetEntityModel',vehicle)
    model=finite(model) and hash(model) or (type(model)=='string' and model:lower() or nil)
    local models=type(config.models)=='table' and config.models or {}
    local profile,key
    if model~=nil then
        -- Numeric hashes have explicit precedence over aliases for the same model.
        profile=models[model] or models[tostring(model)]
        if not profile and finite(model) then profile=models[model-4294967296] or models[tostring(model-4294967296)] end
        key=tostring(model)
        if not profile then
            local keys={}
            for candidate in pairs(models) do if type(candidate)=='string' then keys[#keys+1]=candidate end end
            table.sort(keys)
            for _,candidate in ipairs(keys) do
                if hash(candidate)==model then profile=models[candidate];key=candidate;break end
            end
        end
        apply(profile,'model:'..key,text(key,'Vehicle'))
    end
    result.limiter=math.max(result.redline,result.limiter)
    return result
end
