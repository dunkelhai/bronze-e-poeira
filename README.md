# Bronze e Poeira

Batalha de exércitos por turnos em visão lateral, no clima dos épicos de "espada e sandália". Duas
cidades-estado inventadas de uma antiguidade mediterrânea imaginária, **Calídria** (azul-egeu, você)
e **Vorsena** (carmim, a IA), disputam o **Vale de Ístrion**. Cada lado tem quartel e estandarte nas
pontas de um eixo de 12 casas; recrute tropas, dê ordens, use o seu Estratego e derrube o estandarte
inimigo.

Protótipo jogável feito com Phaser 3 + TypeScript + Vite. Toda a arte (soldados, cavalos, máquinas
de cerco, céu, montes, ruínas, estandartes) é gerada por código com `Graphics`; os sons (tambores,
impacto metálico, cornetas) são sintetizados com Web Audio.

**Jogar online (GitHub Pages):** https://dunkelhai.github.io/bronze-e-poeira/

## Como se joga

- **Campo:** casas 0 a 11. Seu quartel e estandarte ficam na casa 0 (esquerda) e os de Vorsena na
  casa 11 (direita). Cabe 1 unidade por casa por lado. Ninguém atravessa um inimigo nem entra no
  acampamento rival; aliados abrem passagem (atravessar uma casa com aliado não gasta movimento).
- **Economia:** os dois lados começam com 120 de ouro e ganham 40 por turno. Abater um inimigo dá
  25% do custo dele como saque.
- **Recrutar:** a tropa nasce na casa 0, se ela estiver livre (por isso, na prática, 1 recruta por
  turno).
- **Ordens (por tropa, ficam valendo até você mudar):**
  - **Avançar** (padrão): ataca se já tiver alvo ao alcance; senão anda até o movimento acabar ou
    até ter alvo, e então ataca. Arqueiros dão um passo à frente se continuarem fora do corpo a
    corpo. Uma tropa de choque presa atrás de um aliado que não avança troca de lugar com ele.
  - **Segurar:** não anda, mas ataca o que estiver ao alcance.
  - **Recuar:** volta em direção ao quartel e não ataca.
- **Turno:** recrutar → ordens → habilidade do general → **Encerrar turno**. Suas tropas agem da
  frente para trás, com animação (marcha, golpe, número de dano, recuo, poeira, hit-flash); depois
  Vorsena recruta, usa o general e ataca. Então vem a renda e o próximo turno.
- **Combate:** dano = ataque × multiplicadores × 12 / (12 + defesa), arredondado (mínimo 1).
  Golpes corpo a corpo levam **revide** de 50% se o alvo sobreviver e for de choque (escudeiro,
  lança-longa, cavaleiro, estratego). Arqueiro e fundíbulo causam metade do dano em alvo adjacente.
  Corpo a corpo acerta o inimigo mais próximo; arqueiros escolhem o melhor golpe (preferem abater);
  o fundíbulo prefere o estandarte quando ele está ao alcance.
- **Previsão de dano:** a tropa selecionada (ou sob o mouse) mostra para onde vai e o dano que causa
  no alvo (com revide). Passar o mouse sobre um inimigo mostra os atributos dele e quanto a sua tropa
  selecionada causaria.

### Tropas

| Tropa               | Custo | Vida | Ataque | Defesa | Mov | Alcance | Papel                                                                |
| ------------------- | ----- | ---- | ------ | ------ | --- | ------- | -------------------------------------------------------------------- |
| Escudeiro de Bronze | 30    | 36   | 12     | 6      | 1   | 1       | barato e resistente; flechas o ferem pela metade                     |
| Lança-Longa         | 40    | 28   | 15     | 3      | 1   | 1       | dano ×2 contra cavalaria                                             |
| Arqueiro de Junco   | 45    | 20   | 13     | 1      | 1   | 3       | ×1,5 contra lança-longas; fraco de perto                             |
| Cavaleiro da Poeira | 65    | 30   | 18     | 3      | 3   | 1       | investida +60% ao atacar depois de andar; ×1,75 vs arqueiros e cerco |
| Fundíbulo           | 90    | 22   | 20     | 1      | 1   | 4       | lento (não ataca no turno em que anda); ×3 contra o estandarte       |
| Estratego (general) | —     | 70   | 18     | 6      | 1   | 1       | único, começa em campo; se cair, o lado perde moral (−25% de ataque) |

Estandarte: 160 de vida, defesa 4.

### Triângulo de vantagens

```
        Lança-Longa
        ↗ ×1,5   ↘ ×2
 Arqueiro  ←×1,75—  Cavaleiro
```

- **Lança-Longa vence Cavaleiro** (×2).
- **Cavaleiro vence Arqueiro** (e Fundíbulo) (×1,75), chegando rápido com a investida.
- **Arqueiro vence Lança-Longa** (×1,5), que não tem escudo grande.
- Fora do triângulo: o **Escudeiro** é a parede barata (flechas ×0,5, pedras ×0,75) e o
  **Fundíbulo** é a resposta lenta e cara para derrubar estandartes (×3).

### Estratego e habilidades de comando

| Tecla | Habilidade        | Efeito                                                                    | Recarga  |
| ----- | ----------------- | ------------------------------------------------------------------------- | -------- |
| Q     | Brado do Vale     | +40% de ataque nos aliados a até 2 casas do general neste turno           | 4 turnos |
| W     | Muralha de Bronze | +5 de defesa nos aliados a até 2 casas do general até o seu próximo turno | 4 turnos |

Ícones sobre a barra de vida mostram quem está sob efeito. Com o general caído, as habilidades ficam
indisponíveis e o exército inteiro ataca com −25%.

### Vitória e derrota

- **Vitória:** derrubar o estandarte de Vorsena **ou** eliminar o Estratego rival e todas as tropas dele.
- **Derrota:** o seu estandarte cair (ou você perder general e todas as tropas).
- **Limite de 30 turnos:** ao fim do turno 30 vence quem tiver o estandarte com mais vida; se empatar,
  vence quem tiver mais vida somada de tropas em campo; empate total = Vorsena mantém o vale.

### IA de Vorsena

- Recruta todo turno conforme o ouro e **reage à sua composição**: lança-longas se você tem
  cavalaria, cavaleiros se você tem arqueiros/fundíbulos, arqueiros se você tem muitas lança-longas,
  sempre pelo menos um escudeiro e, a partir do turno 5, um fundíbulo (às vezes poupa ouro para ele).
- Junta uma onda de 3 tropas perto do quartel antes de marchar; depois todos avançam.
- O Estratego recua quando fica com menos de 30% da vida.
- **Protege o estandarte:** com uma tropa sua a até 4 casas dele, prioriza escudeiros/lança-longas,
  atiradores seguram posição, o general fica de guarda e a Muralha é usada.
- Usa **Brado** quando há 2 ou mais aliados perto do general e inimigos a até 3 casas, e
  **Muralha** quando há 2 ou mais aliados perto e contato iminente (ou ameaça ao estandarte).

## Controles

| Ação                                    | Teclado                             | Mouse                                |
| --------------------------------------- | ----------------------------------- | ------------------------------------ |
| Recrutar (escudeiro … fundíbulo)        | 1 – 5                               | botões de recrutar                   |
| Escolher a tropa                        | ← / → (ou A / D)                    | clicar na tropa                      |
| Alternar ordem (avançar/segurar/recuar) | X ou Shift                          | botões Avançar / Segurar / Recuar    |
| Confirmar a ordem e ir à próxima tropa  | Z ou Espaço                         | —                                    |
| Brado do Vale / Muralha de Bronze       | Q / W                               | botões das habilidades               |
| Encerrar o turno                        | E                                   | botão "Encerrar turno"               |
| Acelerar a animação do combate (×3)     | segurar Espaço                      | —                                    |
| Pausa (com "Reduzir tremor/flash")      | Esc (na pausa: T alterna, M título) | botões da pausa                      |
| Reiniciar                               | R                                   | botão "Tentar de novo" / "Reiniciar" |
| Começar (tela de título)                | Espaço                              | clicar em "Pressione Espaço"         |

Os controles também aparecem na tela de título.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173/bronze-e-poeira/ (adicione `?debug=1` para os atalhos de teste).

### Scripts

| Script            | O que faz                                                          |
| ----------------- | ------------------------------------------------------------------ |
| `npm run dev`     | servidor de desenvolvimento (Vite)                                 |
| `npm run build`   | checagem de tipos (`tsc --noEmit`) + build de produção em `dist/`  |
| `npm run preview` | serve o build de produção                                          |
| `npm run lint`    | ESLint + Prettier (`--check`)                                      |
| `npm run format`  | formata o código com Prettier                                      |
| `npm run sim`     | simula partidas bot × IA em Node (`npm run sim -- 1000` para 1000) |

### Debug (`?debug=1`)

| Tecla | Efeito                         |
| ----- | ------------------------------ |
| F1    | vitória imediata               |
| F2    | derrota imediata               |
| F3    | +500 de ouro                   |
| F4    | liga/desliga o contador de FPS |

`window.__game` expõe o `Phaser.Game` (ex.: `__game.scene.getScene('Battle').b` é o estado puro da
batalha).

## Estrutura

```
src/
  main.ts                 aguarda as fontes, cria o jogo, expõe window.__game
  config/balance.ts       TODAS as constantes de balanceamento (tropas, triângulo, economia, IA)
  style/palette.ts        paleta da seção 7 do guia de estilo
  systems/battle.ts       regras puras (eixo, movimento, combate, habilidades, fim de jogo)
  systems/ai.ts           IA de Vorsena
  systems/               áudio, efeitos (shake, flash, pop, números), RNG, opções
  entities/               texturas geradas, cenário com parallax, estandartes, unidade, botão
  scenes/                 Boot, Title, Battle, Pause, End
scripts/simulate.ts       simulação de balanceamento fora do navegador
```

## Balanceamento (simulação)

`npm run sim -- 1000`: 1000 partidas por bot do jogador (lado 0) contra a IA (lado 1), mesmas regras
do jogo, sem navegador.

| Bot do jogador                                                                                                                                | Vitórias  | Turnos (média · p10–p90) |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| **pensante** — recruta todo turno, contra-recruta, mantém um fundíbulo, usa as habilidades com aliados perto, tira o general ferido da frente | **87,8%** | 21,9 · 10–30             |
| **aleatório** — recruta qualquer tropa que der, todos avançam, habilidades assim que prontas                                                  | 50,4%     | 19,9 · 11–30             |
| **espelho** — o próprio cérebro da IA jogando por Calídria                                                                                    | 53,6%     | 23,2 · 13–30             |
| **simples** — ciclo fixo de recrutas, poupa para a próxima da lista, todos avançam                                                            | 10,7%     | 19,9 · 14–30             |
| **tartaruga** — só escudeiros e arqueiros segurando perto do quartel                                                                          | 1,3%      | 23,4 · 16–30             |

Leitura: quem pensa (recrutar sempre, combinar o triângulo, guardar as habilidades para quando há
tropas perto do general) vence com folga; spam de uma tropa só, poupar demais ou ficar na defensiva
perde. Bots que recrutam um tipo só de tropa vencem de 0% a 7%. A animação de cada turno leva cerca de
5–8 s; com o planejamento, uma partida de ~20 turnos dura de 8 a 13 minutos.

## Créditos

- Código, arte e sons gerados por código: dunkelhai (com auxílio de IA).
- Fontes: [Cinzel Decorative](https://fonts.google.com/specimen/Cinzel+Decorative) e
  [Rubik](https://fonts.google.com/specimen/Rubik) via Google Fonts (SIL Open Font License).
- Nenhum asset externo foi usado. Cidades, vale, tropas, nomes e textos são inventados.

## Decisões

- **Cenário e nomes inventados:** Calídria (jogador, azul-egeu) × Vorsena (rival, carmim) no Vale de
  Ístrion; tropas Escudeiro de Bronze, Lança-Longa, Arqueiro de Junco, Cavaleiro da Poeira e
  Fundíbulo; general "Estratego"; habilidades "Brado do Vale" e "Muralha de Bronze". Nenhuma pessoa,
  deus ou batalha real.
- **Direção de arte** registrada como seção "## 7. bronze-e-poeira" no fim do `STYLE_GUIDE.md` (o guia
  já tinha uma "## 7. Checklist", mantida intacta; a nova seção foi só acrescentada ao fim, como pedido).
- **Resolução por lado, não simultânea:** primeiro todas as suas tropas agem (da frente para trás),
  depois Vorsena planeja e age. É mais legível de animar e de prever. O jogador começa, o que dá uma
  leve vantagem (IA × IA: 53,6% para quem começa).
- **Dano determinístico** (sem sorte) para a previsão bater com o resultado. A previsão considera o
  estado atual; se uma tropa da frente abater o alvo antes, a de trás escolhe outro.
- **Revide** de 50% só para tropas de choque, para dar sentido a atiradores e à investida.
- **Atravessar aliados sem gastar movimento** e **troca de fileira** (tropa de choque passa à frente de
  um aliado parado/atirador): sem isso o eixo de 12 casas travava em filas, nas simulações.
- **Recrutamento só na casa 0 livre** (como pedido): limita a 1 recruta por turno; se a casa 0 estiver
  ocupada por uma tropa sua em "Segurar", você não recruta. A IA nunca deixa a própria casa de recruta
  parada.
- **Ordens persistem** entre turnos (menos cliques); o padrão de toda tropa nova é Avançar.
- **Z/Espaço** "confirma" mantendo a ordem atual e pula para a próxima tropa (da frente para trás);
  X/Shift já aplica a próxima ordem. Segurar Espaço durante o combate acelera a animação 3×.
- **Saque** de 25% do custo ao abater, para premiar trocas boas sem virar bola de neve.
- **Desempate do limite de 30 turnos:** vida do estandarte; depois vida somada das tropas; empate total
  = vitória de Vorsena (o defensor do vale).
- **General:** começa em campo na casa 1 (rival na 10), não pode ser recrutado de novo. Moral perdida =
  −25% no ataque de todo o exército até o fim.
- **Tela de título** com "pressione Espaço" + controles (sem menu Jogar/Opções), e "Reduzir
  tremor/flash" na pausa (T), como nos outros protótipos.
- **Parallax leve** guiado pelo ponteiro (montes 3%, ruínas 7%); a planície fica parada para as tropas
  não "deslizarem".
- **Degradê do céu em faixas:** `fillGradientStyle` não funciona em `generateTexture` (canvas), então
  o céu é desenhado em faixas de 4 px interpoladas.

## Próximos passos

- Terreno com efeito (colina dá alcance, ruína dá defesa) e mais de uma faixa de batalha.
- Ordem de "mirar" para escolher o alvo dos arqueiros e do fundíbulo.
- IA mais esperta contra jogadores que só recrutam sem plano (hoje o bot aleatório vence ~50%).
- Formação de falange (bônus de defesa para escudeiros lado a lado) e moral por unidade.
- Trilha sonora de marcha em loop e volume na pausa.
