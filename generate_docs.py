#!/usr/bin/env python3
"""
generate_docs.py

Adapta all_tables_docs.md (arquivo único) para docs.md no schema-viewer.
Mantém compatibilidade com o sistema de documentação existente.

Uso:
    python generate_docs.py

    Copia ../schema-docs/all_tables_docs.md para ./docs.md
"""

import shutil
from pathlib import Path

# Caminhos
SCRIPT_DIR = Path(__file__).parent
PARENT_DIR = SCRIPT_DIR.parent
SOURCE_DOCS = PARENT_DIR / "schema-docs" / "all_tables_docs.md"
OUTPUT_FILE = SCRIPT_DIR / "docs.md"

def main():
    """Copia a documentação unificada para o schema-viewer"""

    if not SOURCE_DOCS.exists():
        print(f"[ERRO] Arquivo não encontrado: {SOURCE_DOCS}")
        print(f"\n[DICA] Gere primeiro a documentação com:")
        print(f"  cd ../schema-docs")
        print(f"  python generate_all_docs_v2.py")
        return

    # Copiar arquivo
    shutil.copy(SOURCE_DOCS, OUTPUT_FILE)

    # Estatísticas
    size_kb = OUTPUT_FILE.stat().st_size / 1024
    lines = OUTPUT_FILE.read_text(encoding="utf-8").count("\n")

    print(f"✓ Documentação importada com sucesso")
    print(f"  Origem:  {SOURCE_DOCS.relative_to(PARENT_DIR)}")
    print(f"  Destino: {OUTPUT_FILE.name}")
    print(f"  Tamanho: {size_kb:.1f}KB ({lines} linhas)")
    print(f"\n[INFO] Execute 'npm run dev' para visualizar no schema-viewer")

if __name__ == "__main__":
    main()
