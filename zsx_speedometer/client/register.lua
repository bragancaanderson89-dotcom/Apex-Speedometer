local function register()
    if GetResourceState('velo_core')~='started' then return end
    local ok,accepted,reason=pcall(function() return exports.velo_core:RegisterSpeedometer({id='zsx',name='ZSX',width=324,height=324,accent='#ed008b',text='#e4eef9',scripts={'web/zsx.js','web/register.js'},styles={'web/zsx.css'}}) end)
    if not ok or not accepted then print('[zsx_speedometer] Falha no registro: '..tostring(reason or accepted)) end
end
CreateThread(function() Wait(0);register() end)
AddEventHandler('onClientResourceStart',function(resource) if resource=='velo_core' then register() end end)
