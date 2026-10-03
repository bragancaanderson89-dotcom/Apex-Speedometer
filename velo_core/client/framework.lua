VeloFramework = {}
local loginOverride, qb, cached, nextRead = nil, nil, false, 0
function VeloFramework.name()
    if Config.Framework ~= 'auto' then return Config.Framework end
    if GetResourceState('qbx_core') == 'started' then return 'qbox' end
    if GetResourceState('qb-core') == 'started' then return 'qbcore' end
    return 'standalone'
end
function VeloFramework.loaded()
    if not Config.RequireLogin or VeloFramework.name() == 'standalone' then return true end
    if loginOverride ~= nil then return loginOverride end
    if LocalPlayer.state.isLoggedIn == true then return true end
    if VeloFramework.name() == 'qbox' then return false end
    local now=GetGameTimer()
    if now < nextRead then return cached end
    nextRead=now+500
    local ok,data=pcall(function() return exports['qb-core']:GetPlayerData() end)
    if not ok then
        ok,data=pcall(function()
            qb=qb or exports['qb-core']:GetCoreObject()
            return qb.Functions.GetPlayerData()
        end)
    end
    cached=ok and type(data)=='table' and type(data.citizenid)=='string' and data.citizenid~=''
    return cached
end
RegisterNetEvent('QBCore:Client:OnPlayerLoaded',function() loginOverride=true end)
local function logout()
    loginOverride=false;cached=false
    if VeloEditor then VeloEditor.close() end
    if VeloTelemetry then VeloTelemetry.hide() end
end
RegisterNetEvent('QBCore:Client:OnPlayerUnload',logout)
RegisterNetEvent('qbx_core:client:playerLoggedOut',logout)
AddEventHandler('onClientResourceStart',function(resource)
    if resource=='qb-core' or resource=='qbx_core' then qb=nil;nextRead=0;loginOverride=nil end
end)
