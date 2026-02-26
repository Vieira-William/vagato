"""
Migracao para adicionar campos de IA e matching ao modelo Vaga.
Execute este script uma vez para atualizar o banco de dados existente.

Uso:
    python -m app.migrations.add_ai_fields
"""
import os
import sys

# Adicionar diretorio pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text, inspect
from app.database import engine, SessionLocal


def get_existing_columns(inspector, table_name):
    """Retorna lista de colunas existentes na tabela."""
    columns = inspector.get_columns(table_name)
    return [col['name'] for col in columns]


def add_column_if_not_exists(connection, table_name, column_name, column_type):
    """Adiciona coluna se nao existir."""
    inspector = inspect(engine)
    existing_columns = get_existing_columns(inspector, table_name)

    if column_name not in existing_columns:
        try:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
            print(f"  + Adicionada coluna: {column_name}")
            return True
        except Exception as e:
            print(f"  ! Erro ao adicionar {column_name}: {e}")
            return False
    else:
        print(f"  - Coluna ja existe: {column_name}")
        return False


def run_migration():
    """Executa a migracao."""
    print("Iniciando migracao para campos de IA...")
    print("-" * 50)

    with engine.connect() as connection:
        # Verificar se tabela vagas existe
        inspector = inspect(engine)
        if 'vagas' not in inspector.get_table_names():
            print("Tabela 'vagas' nao encontrada. Execute o app primeiro para criar as tabelas.")
            return

        print("\nAdicionando campos ao modelo Vaga:")

        # Campos de extracao estruturada
        add_column_if_not_exists(connection, 'vagas', 'nivel', 'VARCHAR(20)')
        add_column_if_not_exists(connection, 'vagas', 'salario_min', 'FLOAT')
        add_column_if_not_exists(connection, 'vagas', 'salario_max', 'FLOAT')
        add_column_if_not_exists(connection, 'vagas', 'moeda_salario', 'VARCHAR(10) DEFAULT "BRL"')
        add_column_if_not_exists(connection, 'vagas', 'tipo_contrato', 'VARCHAR(20)')
        add_column_if_not_exists(connection, 'vagas', 'carga_horaria', 'VARCHAR(30)')
        add_column_if_not_exists(connection, 'vagas', 'area_departamento', 'VARCHAR(50)')
        add_column_if_not_exists(connection, 'vagas', 'skills_obrigatorias', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'skills_desejaveis', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'beneficios', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'experiencia_anos', 'INTEGER')
        add_column_if_not_exists(connection, 'vagas', 'descricao_completa', 'TEXT')
        add_column_if_not_exists(connection, 'vagas', 'data_publicacao', 'DATE')
        add_column_if_not_exists(connection, 'vagas', 'data_expiracao', 'DATE')

        # Campos de matching/scoring
        add_column_if_not_exists(connection, 'vagas', 'score_compatibilidade', 'FLOAT')
        add_column_if_not_exists(connection, 'vagas', 'score_breakdown', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'is_destaque', 'BOOLEAN DEFAULT 0')

        # Campos de contato direto
        add_column_if_not_exists(connection, 'vagas', 'contato_nome', 'VARCHAR(100)')
        add_column_if_not_exists(connection, 'vagas', 'contato_cargo', 'VARCHAR(100)')
        add_column_if_not_exists(connection, 'vagas', 'contato_linkedin', 'VARCHAR(200)')
        add_column_if_not_exists(connection, 'vagas', 'contato_email', 'VARCHAR(100)')
        add_column_if_not_exists(connection, 'vagas', 'contato_telefone', 'VARCHAR(30)')

        # PRD v3: Detalhes estruturados
        add_column_if_not_exists(connection, 'vagas', 'responsabilidades', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'requisitos_obrigatorios', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'requisitos_desejaveis', 'JSON')
        add_column_if_not_exists(connection, 'vagas', 'fuso_horario', 'VARCHAR(50)')
        add_column_if_not_exists(connection, 'vagas', 'time_tamanho', 'VARCHAR(50)')
        add_column_if_not_exists(connection, 'vagas', 'time_reporta', 'VARCHAR(100)')
        add_column_if_not_exists(connection, 'vagas', 'time_maturidade', 'VARCHAR(20)')
        add_column_if_not_exists(connection, 'vagas', 'momento_empresa', 'VARCHAR(20)')
        add_column_if_not_exists(connection, 'vagas', 'processo_seletivo', 'JSON')

        # PRD v3: 10 Pilares - Missão e CTA
        add_column_if_not_exists(connection, 'vagas', 'missao_vaga', 'TEXT')
        add_column_if_not_exists(connection, 'vagas', 'como_aplicar', 'TEXT')

        # PRD v3 Fase 5: Favoritos
        add_column_if_not_exists(connection, 'vagas', 'is_favorito', 'BOOLEAN DEFAULT 0')

        # NOVOS CAMPOS - WhatsApp e Link Post Original
        add_column_if_not_exists(connection, 'vagas', 'whatsapp_contato', 'VARCHAR(30)')
        add_column_if_not_exists(connection, 'vagas', 'link_post_original', 'TEXT')

        connection.commit()

        # Verificar se tabela user_profiles existe
        if 'user_profiles' not in inspector.get_table_names():
            print("\nCriando tabela user_profiles...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE,
                    cargos_interesse JSON,
                    nivel_minimo VARCHAR(20),
                    experiencia_anos INTEGER,
                    skills JSON,
                    modalidades_aceitas JSON,
                    tipos_contrato JSON,
                    localizacoes JSON,
                    nivel_ingles VARCHAR(20),
                    salario_minimo FLOAT,
                    salario_maximo FLOAT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            connection.commit()
            print("  + Tabela user_profiles criada")
        else:
            print("\n- Tabela user_profiles ja existe")

        # Criar tabela search_urls
        if 'search_urls' not in inspector.get_table_names():
            print("\nCriando tabela search_urls...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS search_urls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome VARCHAR(100) NOT NULL,
                    url TEXT NOT NULL,
                    fonte VARCHAR(20) NOT NULL,
                    ativo BOOLEAN DEFAULT 1,
                    ordem INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_search_fonte ON search_urls(fonte)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS idx_search_ativo ON search_urls(ativo)"))
            connection.commit()
            print("  + Tabela search_urls criada")

            # Inserir URLs padrão
            print("  + Inserindo URLs padrão...")
            default_urls = [
                ("LinkedIn Product Designer Remoto 24h", "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=Product%20Designer&sortBy=R", "linkedin_jobs"),
                ("LinkedIn UX Designer Remoto 24h", "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=UX%20Designer&sortBy=R", "linkedin_jobs"),
                ("LinkedIn Posts UX Vaga 24h", "https://www.linkedin.com/search/results/content/?keywords=ux%20vaga&datePosted=%22past-24h%22&sortBy=%22date_posted%22", "linkedin_posts"),
                ("Indeed UX Designer Brasil", "https://br.indeed.com/jobs?q=ux+designer&l=Brasil&fromage=1&sort=date", "indeed"),
            ]
            for nome, url, fonte in default_urls:
                connection.execute(text(
                    "INSERT INTO search_urls (nome, url, fonte, ativo, ordem) VALUES (:nome, :url, :fonte, 1, 0)"
                ), {"nome": nome, "url": url, "fonte": fonte})
            connection.commit()
            print("  + URLs padrão inseridas")
        else:
            print("\n- Tabela search_urls ja existe")

        # Criar tabela match_weights
        if 'match_weights' not in inspector.get_table_names():
            print("\nCriando tabela match_weights...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS match_weights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    skills FLOAT DEFAULT 0.35,
                    nivel FLOAT DEFAULT 0.20,
                    modalidade FLOAT DEFAULT 0.15,
                    tipo_contrato FLOAT DEFAULT 0.10,
                    salario FLOAT DEFAULT 0.10,
                    ingles FLOAT DEFAULT 0.05,
                    localizacao FLOAT DEFAULT 0.05,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            # Inserir pesos padrão
            connection.execute(text(
                "INSERT INTO match_weights (skills, nivel, modalidade, tipo_contrato, salario, ingles, localizacao, is_active) "
                "VALUES (0.35, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 1)"
            ))
            connection.commit()
            print("  + Tabela match_weights criada com pesos padrão")
        else:
            print("\n- Tabela match_weights ja existe")

    print("\n" + "-" * 50)
    print("Migracao concluida!")


if __name__ == "__main__":
    run_migration()
