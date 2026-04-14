# Schema Viewer

Visualizador interativo de schemas de banco de dados a partir de arquivos `.dbml` — roda 100% localmente, sem serviços externos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm v9 ou superior

## Como rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no navegador.

> Um banco SQLite local (`schema-viewer.db`) é criado automaticamente na primeira execução para persistir posições, notas e workspaces.

---

## Uso

### Tela inicial

- **Abrir arquivo .dbml** — carrega um schema do disco
- **Colar DBML** — digitar ou colar conteúdo DBML diretamente
- **Abrir arquivo .svx** — restaura um workspace completo exportado anteriormente

### Formato .svx

Formato proprietário do projeto — JSON comprimido (gzip + base64) contendo todo o estado:

- Conteúdo `.dbml` (incluindo edições feitas no canvas)
- Posições de todos os nós
- Documentações Markdown por tabela
- Notas por tabela
- Grupos, visibilidade e overrides

**Exportar:** botão `.svx` (verde) na seção Workspace do sidebar ou pelo ícone em cada workspace salvo.  
**Importar:** botão `.svx` (upload) na seção Workspace, ou diretamente na tela inicial.

### Documentação de tabelas

A documentação é gerada automaticamente via **OpenAI GPT-4o Mini** e importada no schema-viewer.

#### Gerar documentação

```bash
cd ../schema-docs
python generate_all_docs_v2.py
```

Gera `all_tables_docs.md` com:
- Visão geral de cada tabela
- Descrição de colunas (tipo, obrigatoriedade, contexto)
- Relações (FKs de entrada/saída)
- Amostra de dados reais

#### Importar no schema-viewer

```bash
python generate_docs.py
```

Copia `all_tables_docs.md` para `docs.md` (compatível com o visualizador).

#### Exemplo de documentação gerada

```markdown
# tb_imovel

## Visão geral
Tabela que armazena informações de imóveis e suas características.

## Grupo
Imóvel - Core

## Colunas
- **id** (int) [Obrigatório] — Identificador único.
- **id_cliente** (int) [Obrigatório] — Referência ao cliente. FK → tb_cliente
- **finalidade1** (char(1)) [Obrigatório] — Tipo: `V`=Venda, `L`=Locação

## Relações
### Referencia (FK de saída)
- `id_cliente` → **tb_cliente**

### Referenciada por (FK de entrada)
- **tb_imovel_foto**
- **tb_imovel_alteracao**
```

A documentação é embutida no `.svx` ao exportar — não precisa reimportar a cada sessão.

---

## Funcionalidades

### Canvas
- Arrastar, zoom, pan — React Flow
- Minimapa navegável (zoom e pan dentro do mapa)
- Undo/redo de posicionamento (até 60 snapshots)
- Grupos coloridos com resize/drag pelo header
- Arestas animadas vermelhas ao selecionar tabela
- Export PNG

### Edição no canvas (CanvasToolbar — canto superior esquerdo)
- **+ Tabela** — cria nova tabela com nome customizado, posicionada no centro do viewport
- **Modo Relação** — clique em tabela A → linha pontilhada segue o mouse → clique em tabela B → painel de confirmação com seletor de coluna origem/destino e tipo de relação (1→N, N→1, 1→1, N↔N)
- Todas as mudanças atualizam o DBML interno do workspace em tempo real

### SidePanel (painel direito)
- Tabs: **Colunas** | **Relações** | **Notas**
- Edição de documentação (overview + resumos de colunas)
- **Edição estrutural** (botão ✏ no header):
  - Renomear tabela
  - Editar/adicionar/remover colunas (nome, tipo, PK, NOT NULL)
  - Editar tipo e colunas de relações existentes
  - Excluir relações
  - Excluir tabela (com confirmação)
- Navegação por relações com histórico (back)
- Notas por tabela (título + conteúdo livre, persistidas no SQLite)

### Sidebar (menu esquerdo)
- Seções colapsáveis persistidas em `localStorage`
- **Arquivo:** abrir `.dbml`, editor DBML inline, exportar PNG, histórico de schemas
- **Documentação:** upload de `.md`, download de modelo
- **Workspace:** salvar (com nome), exportar `.svx`, importar `.svx`, lista de workspaces salvos com overwrite/delete
- **Visualização:** toggle de arestas e labels
- **Navegação:** fit, zoom+, zoom-
- **Layout:** reset, agrupar por tipo, snowflake schema
- **Grupos / Tabelas:** filtro, foco, toggle de visibilidade

### Layouts automáticos
- **Dagre (LR):** hierárquico esquerda→direita
- **Grupo:** dagre por grupo, grupos em grid
- **Snowflake:** tabela de maior grau no centro de cada grupo

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Canvas | React Flow v12 (`@xyflow/react`) |
| Estilos | Tailwind CSS v4 |
| Backend | Express (Node.js + TypeScript) |
| Banco | SQLite via `better-sqlite3` |
| Parser DBML | `@dbml/core` v3 |
| Layout | `@dagrejs/dagre` |
| Compressão .svx | `CompressionStream` API (nativa do browser) |
| Export PNG | `html-to-image` |

---

## Estrutura do projeto

```
schema-viewer/
├── src/
│   ├── App.tsx                  # Estado global, handlers, render principal
│   ├── types.ts                 # Tipos TypeScript do domínio
│   ├── components/
│   │   ├── CanvasToolbar.tsx    # Toolbar flutuante (add tabela, modo relação)
│   │   ├── TableNode.tsx        # Nó de tabela no canvas
│   │   ├── GroupNode.tsx        # Nó de grupo (drag/resize)
│   │   ├── Sidebar.tsx          # Sidebar esquerdo colapsável
│   │   ├── SidePanel.tsx        # Painel direito (edição estrutural + docs + notas)
│   │   ├── LandingScreen.tsx    # Tela inicial
│   │   ├── DbmlEditorModal.tsx  # Editor DBML modal
│   │   └── AnimatedDashedEdge.tsx
│   └── hooks/
│       ├── useDbmlParser.ts     # Parser DBML → ParsedSchema
│       ├── useDbmlMutator.ts    # Serializer ParsedSchema → DBML + funções de mutação
│       ├── useDocParser.ts      # Parser Markdown de documentação
│       ├── useWorkspace.ts      # API hooks para workspaces
│       ├── usePositions.ts      # API hooks para posições e notas
│       ├── useLayout.ts         # Layout dagre
│       └── useAutoLayout.ts     # Layout por grupos / snowflake
├── server/
│   ├── index.ts                 # API Express (porta 3333)
│   └── db.ts                    # Setup SQLite
├── docs/                        # Arquivos .md de documentação (gitignored)
├── schema-viewer.db             # Banco local (gitignored, auto-criado)
└── schema.dbml                  # Schema de exemplo
```

## Licença

MIT
