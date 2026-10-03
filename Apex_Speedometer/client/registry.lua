VeloRegistry = {models={}}
local function slug(v) return type(v)=='string' and #v<=48 and v:match('^[%w_-]+$') end
local function files(v,resource)
    if type(v)~='table' or #v>12 then return nil end
    local out={}
    for _,path in ipairs(v) do
        local own=resource==GetCurrentResourceName()
        if type(path)~='string' or #path>160 or not (path:match('^web/[%w_./%-]+$') or (own and path:match('^speedometers/[%w_./%-]+$'))) or path:find('..',1,true) then return nil end
        if not LoadResourceFile(resource,path) then return nil end
        out[#out+1]=path
    end
    return out
end
function VeloRegistry.list()
    local out={}
    for _,model in pairs(VeloRegistry.models) do out[#out+1]=model end
    table.sort(out,function(a,b) return a.id<b.id end)
    return out
end
function VeloRegistry.offers()
    local out={}
    for _,spec in ipairs(Config.ModelOffers or {}) do
        if type(spec)=='table' and type(spec.resource)=='string' then
            local offer={};for key,value in pairs(spec) do offer[key]=value end
            offer.resourceState=GetResourceState(spec.resource);out[#out+1]=offer
        end
    end
    return out
end
function VeloRegistry.broadcast()
    SendNUIMessage({source='Apex_Speedometer',action='catalog',models=VeloRegistry.list(),offers=VeloRegistry.offers()})
end
local function register(spec,resource)
    if not resource or type(spec)~='table' or not slug(spec.id) or type(spec.name)~='string' then return false,'invalid_descriptor' end
    local scripts,styles=files(spec.scripts,resource),files(spec.styles,resource)
    if not scripts or #scripts==0 or not styles then return false,'missing_assets' end
    local existing=VeloRegistry.models[spec.id]
    if existing and existing.resource~=resource then return false,'duplicate_model_id' end
    local function dimension(n) return type(n)=='number' and n==n and n>=100 and n<=2000 end
    if not dimension(spec.width) or not dimension(spec.height) then return false,'invalid_dimensions' end
    VeloRegistry.models[spec.id]={id=spec.id,name=spec.name:sub(1,64),resource=resource,scripts=scripts,styles=styles,width=spec.width,height=spec.height,accent=spec.accent,text=spec.text}
    VeloRegistry.broadcast()
    return true
end
function VeloRegistry.registerLocal(spec) return register(spec,GetCurrentResourceName()) end
exports('RegisterSpeedometer',function(spec) return register(spec,GetInvokingResource()) end)
AddEventHandler('onClientResourceStop',function(resource)
    local changed=false
    for id,model in pairs(VeloRegistry.models) do if model.resource==resource then VeloRegistry.models[id]=nil;changed=true end end
    if changed then VeloRegistry.broadcast() end
end)
exports('GetSpeedometers',VeloRegistry.list)
AddEventHandler('onClientResourceStart',function(resource)
    for _,offer in ipairs(Config.ModelOffers or {}) do
        if offer.resource==resource then VeloRegistry.broadcast();break end
    end
end)
