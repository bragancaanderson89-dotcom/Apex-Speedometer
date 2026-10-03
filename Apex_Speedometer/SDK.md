# Como adicionar um velocímetro

Os layouts vivem em `speedometers/<id>/web/`. Há apenas um recurso FiveM, uma NUI, um editor e um loop de telemetria. Para criar um quarto painel, copie a estrutura de `speedometers/truck/web/`, use um ID novo e acrescente o descritor a `client/models.lua` **e** a lista de prévia local em `web/app/catalog.js`. Publique `speedometers/<id>/web/*.js` e `*.css` em `fxmanifest.lua`. Não crie outro `ui_page` ou coletor de veículo.

O script do modelo registra uma fábrica:

```js
window.VeloModels.register({
  id: 'meu-painel',
  create(host) {
    const root = document.createElement('div');
    host.append(root);
    return {
      root,
      theme({accent, text}) { /* aplicar cores */ },
      render({state, current, config, boot, phase, progress, now, tripSettings}) {
        // atualizar apenas os elementos do painel
      }
    };
  }
});
```

`state` contém velocidade, RPM normalizado, marcha, combustível, temperatura, alertas, setas e `trip`. `current` contém leituras suavizadas e a varredura de ignição. `config` contém unidade, escala RPM, limites e animação. `state.availability.<campo> === false` indica leitura indisponível; mostre traço/oculte o ponteiro em vez de inventar um valor. Não inicie loops/timers em cada modelo; o core chama `render` a cada quadro necessário. Os nós SVG editáveis usam `data-edit-part` e `data-pivot-x/y`; veja os modelos existentes.

Para o caminhão, `speedometers/truck/web/layout-default.js` guarda o JSON de posição base e a segunda rodada de refinamentos. O DEV exporta os ajustes adicionais como `version: 3`; envie esse código para integrar uma nova base. Códigos anteriores `version: 1` e `version: 2` são convertidos na importação. O DEV não grava diretamente os arquivos do recurso nem modifica o painel em produção.

Depois de editar, abra `DEV.html`, selecione cada layout no editor e execute `tools/smoke.cjs` com Playwright disponível. Confira o painel também dentro do FiveM, pois a prévia não reproduz todas as combinações de recursos de combustível/estado de cada servidor.
