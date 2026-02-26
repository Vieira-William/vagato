#!/usr/bin/env python3
"""
Consolidador de Gabarito - Sistema de Auditoria Completa.

Consolida arquivos brutos de todas as fontes (LinkedIn Posts/Jobs, Indeed)
em um gabarito único com rastreabilidade completa.

Uso:
    python -m app.audit.consolidador_gabarito --format both
    python -m app.audit.consolidador_gabarito --format parquet
    python -m app.audit.consolidador_gabarito --format json
"""

import argparse
import hashlib
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Generator, List, Optional

import pyarrow as pa
import pyarrow.parquet as pq

# Diretórios
BASE_DIR = Path(__file__).parent.parent.parent
BRUTOS_DIR = BASE_DIR / "data" / "brutos"
GABARITO_DIR = BASE_DIR / "data" / "gabarito"


def calcular_hash_registro(dados: dict) -> str:
    """
    Calcula SHA-256 do registro para garantir integridade.

    Args:
        dados: Dicionário com os dados do registro

    Returns:
        Hash SHA-256 em hexadecimal
    """
    json_str = json.dumps(dados, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode('utf-8')).hexdigest()


def gerar_uuid_deterministico(fonte: str, arquivo: str, idx: int) -> str:
    """
    Gera UUID determinístico baseado em fonte + arquivo + posição.

    Isso garante que o mesmo registro sempre terá o mesmo UUID,
    permitindo reprocessamento sem criar duplicatas.

    Args:
        fonte: Fonte do dado (linkedin_posts, linkedin_jobs, indeed)
        arquivo: Nome do arquivo de origem
        idx: Índice do registro no arquivo

    Returns:
        UUID como string
    """
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
    return str(uuid.uuid5(namespace, f"{fonte}:{arquivo}:{idx}"))


def processar_arquivo_bruto(arquivo: Path) -> Generator[Dict, None, None]:
    """
    Processa um arquivo bruto e gera registros padronizados.

    Args:
        arquivo: Path para o arquivo JSON bruto

    Yields:
        Dicionário com registro padronizado para o gabarito
    """
    with open(arquivo, 'r', encoding='utf-8') as f:
        dados = json.load(f)

    fonte = dados.get('fonte', 'desconhecido')
    timestamp_coleta = dados.get('data_coleta') or datetime.now().isoformat()

    # Posts ou Jobs/Vagas
    registros = dados.get('posts', dados.get('vagas', []))

    for idx, registro in enumerate(registros):
        yield {
            'uuid': gerar_uuid_deterministico(fonte, arquivo.name, idx),
            'raw_id': f"{arquivo.stem}_{idx:04d}",
            'fonte': fonte,
            'arquivo_origem': arquivo.name,
            'timestamp_coleta': timestamp_coleta,
            'checksum_sha256': calcular_hash_registro(registro),
            'dados_brutos': registro,
        }


def consolidar_para_banco(registros: List[Dict]) -> dict:
    """
    Salva registros consolidados no banco de dados.

    Args:
        registros: Lista de registros padronizados

    Returns:
        Estatísticas da inserção
    """
    from ..database import SessionLocal
    from ..models import RegistroBruto

    db = SessionLocal()
    inseridos = 0
    duplicados = 0
    erros = 0

    try:
        for reg in registros:
            # Verifica se já existe pelo UUID
            existente = db.query(RegistroBruto).filter(
                RegistroBruto.uuid == reg['uuid']
            ).first()

            if existente:
                duplicados += 1
                continue

            try:
                # Parse timestamp
                if isinstance(reg['timestamp_coleta'], str):
                    ts = datetime.fromisoformat(reg['timestamp_coleta'].replace('Z', '+00:00'))
                else:
                    ts = reg['timestamp_coleta']

                registro_bruto = RegistroBruto(
                    uuid=reg['uuid'],
                    fonte=reg['fonte'],
                    arquivo_origem=reg['arquivo_origem'],
                    raw_id=reg['raw_id'],
                    dados_brutos=json.dumps(reg['dados_brutos'], ensure_ascii=False),
                    checksum_sha256=reg['checksum_sha256'],
                    timestamp_coleta=ts,
                )
                db.add(registro_bruto)
                inseridos += 1

            except Exception as e:
                erros += 1
                print(f"  Erro ao inserir registro {reg['uuid'][:8]}: {e}")

        db.commit()

    finally:
        db.close()

    return {
        'inseridos': inseridos,
        'duplicados': duplicados,
        'erros': erros,
    }


def salvar_parquet(registros: List[Dict], output_path: Path):
    """
    Salva registros em formato Parquet.

    Args:
        registros: Lista de registros padronizados
        output_path: Caminho para o arquivo de saída
    """
    dados = {
        'uuid': [r['uuid'] for r in registros],
        'raw_id': [r['raw_id'] for r in registros],
        'fonte': [r['fonte'] for r in registros],
        'arquivo_origem': [r['arquivo_origem'] for r in registros],
        'timestamp_coleta': [r['timestamp_coleta'] for r in registros],
        'checksum_sha256': [r['checksum_sha256'] for r in registros],
        'dados_brutos_json': [
            json.dumps(r['dados_brutos'], ensure_ascii=False)
            for r in registros
        ],
    }

    table = pa.table(dados)
    pq.write_table(table, output_path, compression='snappy')

    print(f"  Parquet salvo: {output_path} ({os.path.getsize(output_path) / 1024:.1f} KB)")


def salvar_json(registros: List[Dict], output_path: Path):
    """
    Salva registros em formato JSON.

    Args:
        registros: Lista de registros padronizados
        output_path: Caminho para o arquivo de saída
    """
    gabarito = {
        'schema_version': '1.0.0',
        'created_at': datetime.now().isoformat(),
        'checksum_gabarito': calcular_hash_registro({'registros': [r['uuid'] for r in registros]}),
        'metadata': {
            'total_registros': len(registros),
            'por_fonte': {},
        },
        'registros': registros,
    }

    # Conta por fonte
    for reg in registros:
        fonte = reg['fonte']
        gabarito['metadata']['por_fonte'][fonte] = \
            gabarito['metadata']['por_fonte'].get(fonte, 0) + 1

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(gabarito, f, ensure_ascii=False, indent=2, default=str)

    print(f"  JSON salvo: {output_path} ({os.path.getsize(output_path) / 1024:.1f} KB)")


def consolidar_gabarito(
    output_format: str = 'both',
    salvar_banco: bool = True,
) -> dict:
    """
    Consolida todos os arquivos brutos em gabarito.

    Args:
        output_format: 'parquet', 'json' ou 'both'
        salvar_banco: Se True, também salva no banco de dados

    Returns:
        Estatísticas da consolidação
    """
    GABARITO_DIR.mkdir(parents=True, exist_ok=True)

    registros = []
    arquivos_processados = []

    print("="*60)
    print("CONSOLIDADOR DE GABARITO")
    print("="*60)

    # Verifica se existem arquivos brutos
    if not BRUTOS_DIR.exists():
        print(f"Diretório de brutos não encontrado: {BRUTOS_DIR}")
        return {'erro': 'Diretório não encontrado'}

    arquivos_json = sorted(BRUTOS_DIR.glob('*.json'))

    if not arquivos_json:
        print(f"Nenhum arquivo JSON encontrado em: {BRUTOS_DIR}")
        return {'erro': 'Nenhum arquivo encontrado'}

    print(f"\nProcessando {len(arquivos_json)} arquivos de {BRUTOS_DIR}...")

    # Processa todos os arquivos brutos
    for arquivo in arquivos_json:
        count = 0
        for registro in processar_arquivo_bruto(arquivo):
            registros.append(registro)
            count += 1

        arquivos_processados.append(arquivo.name)
        print(f"  ✓ {arquivo.name}: {count} registros")

    print(f"\nTotal: {len(registros)} registros de {len(arquivos_processados)} arquivos")

    # Salva em Parquet
    if output_format in ('parquet', 'both'):
        salvar_parquet(registros, GABARITO_DIR / 'gabarito_master.parquet')

    # Salva em JSON
    if output_format in ('json', 'both'):
        salvar_json(registros, GABARITO_DIR / 'gabarito_master.json')

    # Salva no banco
    stats_banco = {}
    if salvar_banco:
        print("\nSalvando no banco de dados...")
        stats_banco = consolidar_para_banco(registros)
        print(f"  Inseridos: {stats_banco['inseridos']}")
        print(f"  Duplicados: {stats_banco['duplicados']}")
        print(f"  Erros: {stats_banco['erros']}")

    # Estatísticas por fonte
    por_fonte = {}
    for reg in registros:
        fonte = reg['fonte']
        por_fonte[fonte] = por_fonte.get(fonte, 0) + 1

    resultado = {
        'total_registros': len(registros),
        'arquivos_processados': arquivos_processados,
        'por_fonte': por_fonte,
        'banco': stats_banco,
    }

    print(f"\n{'='*60}")
    print("RESULTADO:")
    print(f"  Total de registros: {len(registros)}")
    for fonte, count in por_fonte.items():
        print(f"  - {fonte}: {count}")
    print("="*60)

    return resultado


def listar_gabarito() -> dict:
    """
    Lista informações do gabarito atual.

    Returns:
        Informações do gabarito
    """
    parquet_path = GABARITO_DIR / 'gabarito_master.parquet'
    json_path = GABARITO_DIR / 'gabarito_master.json'

    info = {
        'parquet_existe': parquet_path.exists(),
        'json_existe': json_path.exists(),
    }

    if parquet_path.exists():
        table = pq.read_table(parquet_path)
        info['parquet_registros'] = table.num_rows
        info['parquet_tamanho_kb'] = os.path.getsize(parquet_path) / 1024

    if json_path.exists():
        with open(json_path, 'r') as f:
            data = json.load(f)
        info['json_registros'] = data['metadata']['total_registros']
        info['json_por_fonte'] = data['metadata']['por_fonte']
        info['json_tamanho_kb'] = os.path.getsize(json_path) / 1024

    return info


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Consolida arquivos brutos em gabarito único'
    )
    parser.add_argument(
        '--format',
        choices=['parquet', 'json', 'both'],
        default='both',
        help='Formato de saída (default: both)'
    )
    parser.add_argument(
        '--no-banco',
        action='store_true',
        help='Não salvar no banco de dados'
    )
    parser.add_argument(
        '--listar',
        action='store_true',
        help='Listar informações do gabarito atual'
    )

    args = parser.parse_args()

    if args.listar:
        info = listar_gabarito()
        print(json.dumps(info, indent=2, default=str))
    else:
        resultado = consolidar_gabarito(
            output_format=args.format,
            salvar_banco=not args.no_banco,
        )
