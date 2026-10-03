# Desempenho

`Apex_Speedometer` coleta telemetria em um único cliente e compartilha os dados entre APEX, ZSX, Caminhão, editor e shift lights. Os intervalos ficam em `Config.Performance`: ativo 50 ms, parado 120 ms, ocioso 350 ms por padrão. A NUI reduz a taxa de renderização conforme a preferência de qualidade (30/45/60 FPS de interface); isso não define o FPS do jogo.

Use `/velodiag` no F8 para ver modelo ativo, fontes, sensores indisponíveis e configuração. No FiveM, use `resmon 1` em três situações: fora do veículo, parado e dirigindo. Meça também durante ignição e no editor. `DEV.html` mostra apenas a medição do navegador; não a use como substituto para `resmon` na sua base.

Quando um dado falta, o painel mantém os outros instrumentos funcionando e indica o sensor indisponível. A estimativa de autonomia e a ETA são calculadas com dados já amostrados; a leitura da rota GPS é limitada por `Config.Trip.navigationInterval`.
