# Apex Speedometer Versão 3.4.0 — APEX + ZSX

## 📸 Preview

![Preview 1](preview/Preview1.png)

![Preview 2](preview/Preview2.png)

![Preview 3](preview/Preview3.png)

![Preview 4](preview/Preview4.png)

![Preview 5](preview/Preview5.png)

![Preview 6](preview/Preview6.png)

![Preview 7](preview/Preview7.png)

Velocímetros FiveM com editor `/editvelo`, telemetria compartilhada, modelos em recursos independentes e shift lights opcionais. APEX reproduz a referência fornecida em SVG, com vidro translúcido, marcadores curvos e escala de RPM 0–9.

## Atualização 3.4

- Perfis de veículo por modelo/hash e classe: escala RPM, faixa vermelha e limitador. APEX e ZSX redesenham números e marcações conforme o perfil. O padrão permanece 0–9.
- Editor com desfazer/refazer, Ctrl+Z/Ctrl+Y, grade, alinhamento, bloqueio de componentes, ajuste fino com Alt e presets Original/Compacto/Corrida. Até oito presets personalizados e importação/exportação JSON com prévia antes de aplicar.
- Shift lights com 4–24 lentes circulares, cores independentes, faixa de acendimento e flash de 1–10 Hz. A sequência de ignição continua verde → amarelo → vermelho, flashes vermelhos e apagamento. Movimento reduzido elimina flashes.
- Brilho automático de dia/noite pelo relógio do jogo, reflexo do vidro ajustável e qualidade baixa/equilibrada/alta. Os limites de renderização são 30/45/60 FPS da interface, sem alterar FPS do jogo.
- Odômetro compacto dentro do painel, abaixo de KM/H no APEX. No editor, escolha esse modo ou o computador de viagem completo e posicionável, com parcial, média e tempo em movimento. Guardado localmente por modelo e placa, com gravação periódica e descarte de teleporte ou intervalos sem leitura.
- ZSX com formato compacto quadrado: setas, pisca-alerta, avisos e combustível dentro do mostrador. Todos continuam ajustáveis pelo editor.
- Instrumentos indisponíveis mostram traços/ponteiro oculto e explicam quais dados faltam. Leituras saudáveis continuam ativas. Após dois segundos sem pacotes no jogo, a NUI indica telemetria sem resposta.
- Coleta adaptativa: mais rápida em movimento, mais espaçada estacionado e sem envio de instrumentos quando oculto. Diagnóstico inclui fonte de dados e calibração.

### Instalação e atualização

O ZIP completo continua contendo **três recursos separados**. Atualize `velo_core`, `apex_speedometer` e `zsx_speedometer` e mantenha a ordem de início do `server.cfg.example`. Preserve suas configurações de combustível, cinto, comandos e links de ofertas ao incorporar os novos campos de `config.lua`. Reinicie o core e depois os modelos. Não é necessário excluir KVP: layouts v2/v3 são migrados para preferências v4 mantendo a chave `layout:v3`.

Use `/editvelo` para os controles novos. O botão **Zerar viagem** é imediato e não depende de salvar o layout; ele preserva o odômetro. Presets personalizados, como os outros ajustes, só ficam permanentes ao **Salvar e fechar**. Compartilhar configuração exporta somente layout/preferências, sem quilometragem ou credenciais.

### Calibração por veículo

Em `Config.VehicleProfiles`, a prioridade é padrão → classe → modelo. Exemplo:

```lua
VehicleProfiles = {
    default = {maxRpm=9000, redline=.78, limiter=.96, label='Padrão'},
    classes = {[8]={maxRpm=12000, redline=.88, limiter=.98, label='Moto'}},
    models = {
        sultan = {maxRpm=8000, redline=.86, limiter=.98, label='Sultan'},
        blista = {maxRpm=6500, redline=.82, limiter=.97, label='Urbano'}
    }
},
```

Esses valores são calibrações de exibição que você escolhe. O native do GTA fornece RPM normalizado 0–1, sem informar a rotação física máxima de cada motor. Um script de mecânica pode fornecer RPM absoluto por `Config.VehicleState.rpmKey`, e o core o normaliza usando o perfil correspondente. A temperatura `auto` mantém o aquecimento visual anterior; `sources`/diagnóstico identifica essa aproximação. Para temperatura externa real, configure `temperatureKey`, ou use `Temperature.mode='native'`.

### Histórico e desempenho

O odômetro representa a distância medida a partir desta instalação, não o histórico anterior do veículo. É local à instalação do FiveM; clientes diferentes não compartilham o registro e veículos com a mesma placa/modelo usam a mesma identidade. Uma placa vazia não é persistida. Gravações ocorrem a cada 30 segundos, ao trocar/sair do veículo e ao parar o recurso; um fechamento abrupto pode perder o trecho ainda não salvo. Não há alteração do motor, combustível ou handling.


