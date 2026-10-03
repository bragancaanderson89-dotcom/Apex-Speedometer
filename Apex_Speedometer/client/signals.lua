VeloSignals = {}
local changedAt, controlled = 0,0
local function vehicle()
    if not VeloFramework.loaded() or VeloBridge.boolean(IsNuiFocused()) then return 0 end
    local ped=PlayerPedId();local v=GetVehiclePedIsIn(ped,false)
    if v==0 or GetPedInVehicleSeat(v,-1)~=ped or Config.ExcludedClasses[GetVehicleClass(v)] then return 0 end
    return v
end
local function set(v,left,right)
    SetVehicleIndicatorLights(v,1,left);SetVehicleIndicatorLights(v,0,right)
    changedAt=GetGameTimer();controlled=v
end
if Config.Signals.enabled then
    for _,entry in ipairs({{'apexLeftIndicator','Seta esquerda',Config.Signals.leftKey,1},{'apexRightIndicator','Seta direita',Config.Signals.rightKey,2},{'apexHazard','Pisca-alerta',Config.Signals.hazardKey,3}}) do
        RegisterCommand('+'..entry[1],function()
            local v=vehicle();if v==0 then return end
            local bits=GetVehicleIndicatorLights(v)
            if entry[4]==1 then set(v,(bits&1)==0,false)
            elseif entry[4]==2 then set(v,false,(bits&2)==0)
            else local enabled=bits~=3;set(v,enabled,enabled) end
        end,false)
        RegisterCommand('-'..entry[1],function() end,false)
        RegisterKeyMapping('+'..entry[1],entry[2],'keyboard',entry[3])
    end
end
function VeloSignals.tick(v)
    if controlled==0 then return end
    if v~=controlled or not VeloBridge.boolean(DoesEntityExist(controlled)) then
        if VeloBridge.boolean(DoesEntityExist(controlled)) then SetVehicleIndicatorLights(controlled,1,false);SetVehicleIndicatorLights(controlled,0,false) end
        controlled=0;changedAt=0;return
    end
    local bits=GetVehicleIndicatorLights(v)
    if bits~=3 and Config.Signals.autoCancel>0 and GetGameTimer()-changedAt>Config.Signals.autoCancel and math.abs(GetEntitySpeedVector(v,true).x)<.5 then set(v,false,false) end
end
AddEventHandler('onClientResourceStop',function(resource) if resource==GetCurrentResourceName() then VeloSignals.tick(0) end end)
