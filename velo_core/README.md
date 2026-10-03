# velo_core 3.2

Recurso compartilhado: coleta de dados, editor `/editvelo`, catálogo e shift lights. A versão 3.1 adiciona caixa em carbono 5D, metal, fosco e plástico, com cor ajustável e texturas locais. Preserva as preferências da versão 3.0.

A versão 3.2 corrige o reconhecimento do motor quando o native retorna `1`, que antes zerava RPM/marcha e apagava os LEDs. Converte os formatos booleanos e numéricos dos natives, preserva as preferências e amplia `/velodiag` com valores originais e versão. Substitua esta pasta e use `restart velo_core` no console do servidor; não é necessário substituir os modelos 3.0/3.1.

Inicie antes de um modelo compatível (`apex_speedometer`, `zsx_speedometer` ou outro registrado pelo SDK). Não exige `qbx_core` nem `qb-core`; detecta ambos e também funciona no modo independente.

Configuração: `config.lua`. Diagnóstico dentro de um veículo: `/velodiag`, relatório no F8. Instale usando o nome `velo_core`. Consulte README e SDK da suite para adaptadores e modelos adicionais.
