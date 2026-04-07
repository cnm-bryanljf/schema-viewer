# Schema Viewer

Visualizador interativo de schemas de banco de dados a partir de arquivos `.dbml` — roda 100% localmente, sem serviços externos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm v9 ou superior

## Como rodar

```bash
# 1. Clone o repositório
git clone https://github.com/your-username/schema-viewer.git
cd schema-viewer

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no navegador.

> Um banco SQLite local (`schema-viewer.db`) é criado automaticamente na primeira execução para persistir posições, notas e workspaces. O arquivo é ignorado pelo git — não requer nenhuma configuração manual.

## Uso

### Carregando um schema

Na tela inicial, você pode:

- **Abrir arquivo .dbml** — abre um arquivo `.dbml` do sistema de arquivos
- **Colar DBML** — digitar ou colar o conteúdo DBML diretamente
- **Abrir arquivo .svx** — restaura um workspace completo exportado anteriormente (posições, documentações, notas e schema)

### Exportando e importando via .svx

O formato `.svx` é o formato proprietário do projeto. Um arquivo `.svx` contém todo o estado do workspace comprimido (gzip + base64):

- Posições de todos os nós no canvas
- Conteúdo `.dbml` completo
- Documentações Markdown de todas as tabelas
- Notas por tabela
- Grupos e visibilidade de tabelas

Para exportar: botão **`.svx`** (verde) na seção Workspace do sidebar.  
Para importar: botão **`.svx`** (importar) na seção Workspace, ou diretamente na tela inicial.

### Documentação de tabelas

Faça upload de arquivos `.md` (um por tabela) pela seção **Documentação** no sidebar. O formato esperado:

```markdown
# nome_da_tabela

## Visão geral
Descrição da tabela.

## Grupo
Nome do Grupo

## Colunas
- **id** (int) [Obrigatório] — Identificador único.
- **nome** (varchar 200) [Obrigatório] — Nome completo.
```

A documentação fica embutida no `.svx` ao exportar — não é necessário reimportar os `.md` a cada sessão.

## Funcionalidades

- Carregamento de `.dbml` por arquivo, colagem ou drag-and-drop
- Canvas interativo com arrastar, zoom e pan (React Flow)
- Grupos de tabelas com cores customizadas
- Arestas de chave estrangeira com labels de relacionamento
- Painel lateral com colunas, relações e notas por tabela
- Edição inline de documentação Markdown por tabela
- Workspaces com nome — salvos no SQLite local
- Export/import completo via `.svx` (gzip + base64, inclui docs)
- Layout automático com dagre (sem posições salvas) ou layout por grupos
- Layout snowflake por grupo
- Busca de tabela por nome
- Filtro por grupo
- Histórico dos últimos 5 schemas carregados
- Undo/redo de posicionamento (até 60 snapshots)
- Minimapa navegável (zoom e pan)
- Modo escuro/claro
- Export PNG
- Fullscreen

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

## Estrutura do projeto

```
schema-viewer/
├── src/
│   ├── App.tsx              # Componente principal, estado global
│   ├── types.ts             # Tipos TypeScript do domínio
│   ├── components/          # Componentes de UI
│   │   ├── TableNode.tsx    # Nó de tabela no canvas
│   │   ├── GroupNode.tsx    # Nó de grupo (drag/resize)
│   │   ├── Sidebar.tsx      # Sidebar esquerdo colapsável
│   │   ├── SidePanel.tsx    # Painel direito (detalhes da tabela)
│   │   ├── Toolbar.tsx      # Barra superior
│   │   ├── LandingScreen.tsx
│   │   ├── DbmlEditorModal.tsx
│   │   └── AnimatedDashedEdge.tsx
│   └── hooks/
│       ├── useDbmlParser.ts  # Parser DBML → ParsedSchema
│       ├── useDocParser.ts   # Parser Markdown de documentação
│       ├── useWorkspace.ts   # API hooks para workspaces
│       ├── usePositions.ts   # API hooks para posições e notas
│       ├── useLayout.ts      # Layout dagre
│       └── useAutoLayout.ts  # Layout por grupos / snowflake
├── server/
│   ├── index.ts             # API Express (porta 3333)
│   └── db.ts                # Setup SQLite
├── schema-viewer.db         # Banco local (gitignored, auto-criado)
└── schema.dbml              # Schema de exemplo
```

## Licença

MIT
