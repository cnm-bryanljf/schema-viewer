# Schema Viewer

Visualizador interativo de schemas de banco de dados em formato `.dbml` — roda 100% localmente, sem serviços externos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm v9 ou superior

## Instalação e execução

```bash
npm install
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no navegador.

O servidor backend sobe na porta **3333** automaticamente (via `concurrently`). Um banco SQLite local (`schema-viewer.db`) é criado automaticamente na primeira execução para persistir posições, notas e workspaces.

> **Apenas o frontend (porta 5173):** `npm run dev` já inicia os dois processos juntos.  
> **Apenas o backend:** `npm run server`  
> **Build de produção:** `npm run build`

---

## Fluxo de uso

### 1. Tela inicial

Ao abrir o app, três opções são apresentadas:

| Opção | Descrição |
|---|---|
| **Abrir arquivo .dbml** | Carrega um arquivo do disco |
| **Colar DBML** | Cola ou digita conteúdo DBML diretamente |
| **Abrir arquivo .svx** | Restaura um workspace completo exportado anteriormente |

### 2. Canvas

Com o schema carregado, o canvas exibe as tabelas como nós conectados por arestas que representam as relações (`Ref:`).

- **Arrastar nós** — reposiciona tabelas; posições são salvas automaticamente no SQLite
- **Clicar em tabela** — abre o SidePanel com detalhes da tabela
- **Clicar em aresta** — foca a tabela de destino
- **Zoom/pan** — roda do mouse e arrastar o canvas
- **Minimapa** — canto inferior direito, navegável

---

## Funcionalidades

### CanvasToolbar (canto superior esquerdo)

| Botão | Função |
|---|---|
| **+ Tabela** | Cria nova tabela no centro do viewport; permite definir nome e grupo |
| **+ Grupo** | Cria um novo grupo de cor customizada (sem tabelas ainda) |
| **Relação** | Ativa modo de desenho de relações — clique na tabela origem → clique na tabela destino → painel confirma colunas e tipo |
| **Seletor de tipo** | (visível no modo relação) `1→N`, `N→1`, `1→1`, `N↔N` |

### Sidebar (menu esquerdo)

**Arquivo**
- Abrir `.dbml` do disco
- Editor DBML modal (Monaco Editor) — edita o schema diretamente
- Export PNG do canvas
- Histórico de schemas carregados na sessão

**Documentação**
- Upload de arquivo `.md` com documentação das tabelas (um arquivo pode conter múltiplas tabelas)
- Modelo de documentação para download

**Workspace**
- Salvar workspace com nome (com proteção de overwrite)
- Exportar `.svx` — snapshot completo comprimido (DBML + posições + docs + notas + grupos)
- Importar `.svx`
- Lista de workspaces salvos: abrir, exportar, excluir

**Visualização**
- Toggle de arestas visíveis
- Toggle de labels nas arestas

**Navegação / Layout**
- Fit view, zoom+, zoom−
- Reset de posições (volta ao layout automático)
- **Layout por grupos** — organiza grupos em grid, agrupando por cor (macro-grupos)
- **Layout snowflake** — tabela de maior grau no centro, demais ao redor em anéis
- **Selecionar área** — modo box-select para mover múltiplas tabelas ao mesmo tempo

**Undo / Redo**
- Captura snapshots completos do estado (schema + posições + cores) com até 60 níveis
- Atalhos: `Ctrl+Z` / `Ctrl+Y`

**Grupos**
- Toggle de visibilidade por grupo (individual ou todos de uma vez)
- Foco de grupo no canvas
- Agrupamento visual por cor (macro-grupos colapsáveis)
- Renomear grupo (ícone ✏ ao passar o mouse)
- Alterar cor do grupo (clique no círculo colorido)
- Excluir grupo (desassocia tabelas, não as exclui)

### SidePanel (painel direito)

Abre ao clicar em uma tabela. Três abas:

**Colunas**
- Lista de colunas com tipo, indicador PK e NOT NULL
- Botão `✏ Editar docs` — edita visão geral e resumos de colunas
- Modo estrutural (botão ✏ no header da tabela):
  - Renomear tabela
  - Adicionar / editar / remover colunas (nome, tipo, PK, NOT NULL)
  - Excluir tabela (com confirmação)
- Seletor de grupo da tabela (dropdown no header)

**Relações**
- Lista de relações de saída e entrada
- Botão ✏ em cada relação — edita tabelas, colunas e tipo de relação
- Botão ✕ em cada relação — exclui a relação
- Navegação entre tabelas relacionadas com histórico (botão ←)

**Notas**
- Notas livres por tabela (título + conteúdo)
- Persistidas no SQLite local

---

## Documentação de tabelas (formato `.md`)

O app suporta importar documentação no formato Markdown. Um único arquivo pode documentar múltiplas tabelas.

### Formato esperado

```markdown
# nome_da_tabela

## Visão geral
Descrição geral da tabela.

## Grupo
Nome do grupo

## Colunas
- **id** (int) [Obrigatório] — Identificador único.
- **id_cliente** (int) [Obrigatório] — FK para tb_cliente.
- **status** (varchar) [Opcional] — Status do registro.
```

### Importar

Na sidebar, seção **Documentação** → botão **Importar arquivo .md**.

O arquivo pode conter um bloco `# tabela` por tabela. O parser detecta automaticamente múltiplos blocos no mesmo arquivo.

A documentação é embutida no `.svx` ao exportar — não precisa reimportar a cada sessão.

---

## Formato DBML

O schema é definido em [DBML](https://dbml.dbdiagram.io/). Exemplo mínimo:

```dbml
Table users {
  id int [pk, not null]
  name varchar
  email varchar [not null]
}

Table orders {
  id int [pk]
  user_id int [not null]
  total decimal(10,2)
}

Ref: orders.user_id > users.id

TableGroup "Usuários" [color: #3b82f6] {
  users
}

TableGroup "Pedidos" {
  orders
}
```

> `TableGroup` com `[color: #hex]` define a cor do grupo diretamente no DBML — reconhecida pelo parser do schema-viewer.

---

## Formato `.svx` (workspace exportado)

Arquivo JSON comprimido (gzip + base64) contendo:

- Conteúdo DBML atual (incluindo edições feitas no canvas)
- Posições de todos os nós
- Documentações Markdown por tabela
- Notas por tabela
- Grupos, visibilidade e overrides de cor

Permite compartilhar ou arquivar o estado completo de uma sessão de trabalho.

---

## Estrutura do projeto

```
schema-viewer/
├── src/
│   ├── App.tsx                   # Estado global, handlers, render principal
│   ├── types.ts                  # Tipos TypeScript do domínio
│   ├── components/
│   │   ├── CanvasToolbar.tsx     # Toolbar flutuante no canvas
│   │   ├── TableNode.tsx         # Nó de tabela
│   │   ├── GroupNode.tsx         # Nó de grupo (drag + resize)
│   │   ├── Sidebar.tsx           # Sidebar esquerdo colapsável
│   │   ├── SidePanel.tsx         # Painel direito (detalhes + edição)
│   │   ├── LandingScreen.tsx     # Tela inicial
│   │   ├── Toolbar.tsx           # Barra superior
│   │   ├── DbmlEditorModal.tsx   # Editor DBML modal (Monaco)
│   │   ├── AnimatedDashedEdge.tsx
│   │   └── ErrorBoundary.tsx     # Captura erros de render sem resetar schema
│   └── hooks/
│       ├── useDbmlParser.ts      # Parser DBML → ParsedSchema
│       ├── useDbmlMutator.ts     # Serializer ParsedSchema → DBML + mutações
│       ├── useDocParser.ts       # Parser Markdown de documentação
│       ├── useWorkspace.ts       # Hooks de API para workspaces
│       ├── usePositions.ts       # Hooks de API para posições e notas
│       ├── useLayout.ts          # Layout dagre hierárquico
│       └── useAutoLayout.ts      # Layout por grupos e snowflake
├── server/
│   ├── index.ts                  # API Express (porta 3333)
│   └── db.ts                     # Setup e migrations SQLite
├── docs/                         # Arquivos .md de documentação (gitignored)
├── schema-viewer.db              # Banco local SQLite (gitignored, auto-criado)
├── schema.dbml                   # Schema de exemplo
├── vite.config.ts                # Proxy /api → :3333
├── tsconfig.json                 # TypeScript (frontend)
└── tsconfig.server.json          # TypeScript (backend)
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Canvas | React Flow v12 (`@xyflow/react`) |
| Estilos | Tailwind CSS v4 |
| Backend | Express + TypeScript (`tsx`) |
| Banco local | SQLite via `better-sqlite3` |
| Parser DBML | `@dbml/core` v3 |
| Layout automático | `@dagrejs/dagre` |
| Editor inline | Monaco Editor (`@monaco-editor/react`) |
| Export PNG | `html-to-image` |
| Compressão `.svx` | `CompressionStream` API (nativa do browser) |
