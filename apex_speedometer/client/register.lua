local function register()
    if GetResourceState('velo_core')~='started' then return end
    local ok,accepted,reason=pcall(function() return exports.velo_core:RegisterSpeedometer({id='apex',name='APEX',width=472,height=296,accent='#ff1328',text='#e4eef9',scripts={'web/reference-digits.js','web/design.js','web/renderer.js'},styles={'web/hud.css','web/model.css'}}) end)
    if not ok or not accepted then print('[apex_speedometer] Falha no registro: '..tostring(reason or accepted)) end
end
CreateThread(function() Wait(0);register() end)
AddEventHandler('onClientResourceStart',function(resource) if resource=='velo_core' then register() end end)
