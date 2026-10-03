-- Built-in instruments live in this resource. Add a descriptor and publish its files in fxmanifest.lua.
local models = {
    {id='apex',name='APEX',width=472,height=296,accent='#ff1328',text='#e4eef9',
     scripts={'speedometers/apex/web/reference-digits.js','speedometers/apex/web/design.js','speedometers/apex/web/renderer.js'},
     styles={'speedometers/apex/web/hud.css','speedometers/apex/web/model.css'}},
    {id='zsx',name='ZSX',width=324,height=324,accent='#ed008b',text='#e4eef9',
     scripts={'speedometers/zsx/web/zsx.js','speedometers/zsx/web/register.js'},
     styles={'speedometers/zsx/web/zsx.css'}},
    {id='truck',name='Caminhão',width=600,height=285,accent='#e32132',text='#f0f1ed',
     scripts={'speedometers/truck/web/layout-default.js','speedometers/truck/web/renderer.js'},
     styles={'speedometers/truck/web/model.css'}}
}
for _,spec in ipairs(models) do
    local accepted,reason=VeloRegistry.registerLocal(spec)
    if not accepted then print(('[Apex_Speedometer] Modelo %s: %s'):format(spec.id,tostring(reason))) end
end
