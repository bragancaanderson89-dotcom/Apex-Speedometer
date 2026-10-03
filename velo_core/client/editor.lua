VeloEditor = {}

local storageKey = 'layout:v3'
local maxJsonBytes = 65536
local partNames = { 'dial', 'speed', 'gear', 'fuel', 'temperature', 'lamps', 'assist', 'secondary', 'signals', 'trip' }
local opened = false
local nuiReady = false
local loginOverride = nil

local function object(value)
    return type(value) == 'table' and value or {}
end

local function number(value, low, high, fallback)
    if type(value) ~= 'number' or value ~= value or value == math.huge or value == -math.huge then
        return fallback
    end
    return math.max(low, math.min(high, value))
end

local function color(value, fallback)
    if type(value) == 'string' and value:match('^#%x%x%x%x%x%x$') then return value:lower() end
    return fallback
end

-- Reconstrói apenas as chaves permitidas, sem reter referências do NUI.
local function sanitize(value, nested)
    value = object(value)
    local result = { version = 4, model = type(value.model)=='string' and value.model:match('^[%w_-]+$') and value.model or 'apex', models = {} }
    local models={}
    for key,v in pairs(object(value.models)) do models[key]=v end
    models.apex = models.apex or {}; models.zsx = models.zsx or {}
    local modelCount=0
    for name, _ in pairs(models) do
      if type(name)=='string' and #name<=48 and name:match('^[%w_-]+$') and modelCount<32 then
        modelCount=modelCount+1
        local model = object(models[name])
        local colors, parts = object(model.colors), object(model.parts)
        local clean = {
            x = number(model.x, 0, 1, 1), y = number(model.y, 0, 1, 1),
            scale = number(model.scale, 0.5, 1.6, 1), locked = model.locked == true,
            colors = {
                accent = color(colors.accent, name == 'apex' and '#ff1328' or '#ed008b'),
                text = color(colors.text, '#e4eef9')
            },
            parts = {}
        }
        local names={}
        for _,key in ipairs(partNames) do names[key]=true end
        for key in pairs(parts) do if type(key)=='string' and #key<=48 and key:match('^[%w_-]+$') then names[key]=true end end
        local partCount=0
        for partName in pairs(names) do
          if partCount<64 then partCount=partCount+1
            local part = object(parts[partName])
            clean.parts[partName] = {
                x = number(part.x, -800, 800, 0), y = number(part.y, -800, 800, 0),
                scale = number(part.scale, 0.4, 2, 1), visible = part.visible ~= false, locked = part.locked == true
            }
        end
          end
        result.models[name] = clean
    end
      end
    local shift = object(value.shift)
    result.shift = {
        enabled = shift.enabled == true,
        x = number(shift.x, 0, 1, 0.5), y = number(shift.y, 0, 1, 0.96),
        scale = number(shift.scale, 0.5, 2, 1), brightness = number(shift.brightness, 0.2, 1, 0.85),
        material = ({carbon=true,metal=true,matte=true,plastic=true})[shift.material] and shift.material or 'metal',
        color = color(shift.color, '#323c44'), locked = shift.locked == true,
        count = math.floor(number(shift.count,4,24,12)),
        startRpm = number(shift.startRpm,0,0.9,0.25),
        fullRpm = number(shift.fullRpm,0.1,1,0.95),
        flashHz = number(shift.flashHz,1,10,5),
        colors = {green=color(object(shift.colors).green,'#32ed80'),yellow=color(object(shift.colors).yellow,'#ffe048'),red=color(object(shift.colors).red,'#ff1834')}
    }
    result.shift.fullRpm = math.max(result.shift.fullRpm,result.shift.startRpm+0.05)
    local lighting=object(value.lighting)
    result.lighting={auto=lighting.auto~=false,day=number(lighting.day,0.2,1,1),night=number(lighting.night,0.2,1,0.65),glass=number(lighting.glass,0,1,0.35),quality=({low=true,balanced=true,high=true})[lighting.quality] and lighting.quality or 'balanced'}
    local trip=object(value.trip)
    result.trip={enabled=trip.enabled==true,mode=trip.mode=='floating' and 'floating' or 'inline',x=number(trip.x,0,1,0.82),y=number(trip.y,0,1,0.94),scale=number(trip.scale,0.5,2,1),locked=trip.locked==true}
    if not nested then
        result.presets={};local count=0
        for key,preset in pairs(object(value.presets)) do
            if count<8 and type(key)=='string' and #key<=48 and key:match('^[%w_-]+$') and type(preset)=='table' and type(preset.name)=='string' and #preset.name>0 and #preset.name<=120 then
                count=count+1
                local layout=sanitize(preset.layout,true)
                layout.version=nil
                result.presets[key]={name=preset.name:sub(1,120),layout=layout}
            end
        end
    end
    return result
end

local function validPreferences(value)
    if type(value) ~= 'table' or (value.version ~= nil and value.version ~= 4 and value.version ~= 3 and value.version ~= 2) then return false end
    -- Listas JSON não são objetos de preferências.
    local meta = getmetatable(value)
    if type(meta) == 'table' and meta.__jsontype == 'array' then return false end
    local allowed={version=true,model=true,models=true,shift=true,lighting=true,trip=true,presets=true}
    for key in pairs(value) do if type(key) ~= 'string' or not allowed[key] then return false end end
    return true
end

local function encode(value)
    local ok, encoded = pcall(json.encode, value)
    if ok and type(encoded) == 'string' and #encoded <= maxJsonBytes then return encoded end
end

local function load()
    local ok, stored = pcall(GetResourceKvpString, storageKey)
    if not ok or type(stored) ~= 'string' or #stored > maxJsonBytes then return sanitize(nil) end
    local decoded, value, position, decodeError = pcall(json.decode, stored)
    if not decoded or decodeError or not validPreferences(value) then return sanitize(nil) end
    -- dkjson também pode retornar só o primeiro valor e sua posição final.
    if type(position) == 'number' and stored:sub(position):find('[^ \t\r\n]') then return sanitize(nil) end
    return sanitize(value)
end

local preferences = load()

function VeloEditor.getPreferences()
    return sanitize(preferences)
end

function VeloEditor.isOpen()
    return opened
end

function VeloEditor.close()
    if not opened then return end
    opened = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ source = 'velo_core', action = 'editor:close' })
end

local function loaded() return VeloFramework.loaded() end

local function sendOpen()
    SendNUIMessage({ source = 'velo_core', action = 'editor:open', preferences = VeloEditor.getPreferences() })
end

function VeloEditor.onReady()
    nuiReady = true
    -- Reenvia o editor após um reload do NUI que já estava com foco.
    if opened then
        if loaded() then sendOpen() else VeloEditor.close() end
    end
end

RegisterCommand(Config.EditorCommand, function()
    if not nuiReady or not loaded() or opened then return end
    opened = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    sendOpen()
end, false)

RegisterNUICallback('editorSave', function(data, cb)
    if type(data) ~= 'table' or not validPreferences(data.preferences) or not encode(data) then
        cb({ ok = false, error = 'invalid_preferences', preferences = VeloEditor.getPreferences() })
        return
    end
    local clean = sanitize(data.preferences)
    local encoded = encode(clean)
    local saved = encoded and pcall(SetResourceKvp, storageKey, encoded)
    if not saved then
        cb({ ok = false, error = 'persistence_failed', preferences = VeloEditor.getPreferences() })
        return
    end
    preferences = clean
    cb({ ok = true, preferences = VeloEditor.getPreferences() })
end)

RegisterNUICallback('editorClose', function(_, cb)
    VeloEditor.close()
    cb({ ok = true })
end)

AddEventHandler('QBCore:Client:OnPlayerLoaded', function() loginOverride = true end)
local function logout()
    loginOverride = false
    VeloEditor.close()
end
RegisterNetEvent('qbx_core:client:playerLoggedOut', logout)
RegisterNetEvent('QBCore:Client:OnPlayerUnload', logout)
AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then VeloEditor.close() end
end)
