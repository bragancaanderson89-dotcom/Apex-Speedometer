fx_version 'cerulean'
game 'gta5'
author 'Felipe Becker'
version '4.0.0'
description 'APEX Speedometer: telemetry, editor, shift lights and built-in instrument layouts'
ui_page 'web/index.html'
client_scripts {'config.lua','client/framework.lua','client/registry.lua','client/models.lua','client/profiles.lua','client/bridge.lua','client/trip.lua','client/editor.lua','client/signals.lua','client/main.lua'}
files {
  'web/index.html','web/app/*.js','web/app/*.css','web/assets/*.ttf','web/assets/*.png','web/assets/materials/*.jpg','web/assets/models/*.png',
  'speedometers/apex/web/*.js','speedometers/apex/web/*.css','speedometers/apex/web/assets/*.ttf',
  'speedometers/zsx/web/*.js','speedometers/zsx/web/*.css','speedometers/zsx/web/assets/zsx/*.ttf',
  'speedometers/truck/web/*.js','speedometers/truck/web/*.css'
}
