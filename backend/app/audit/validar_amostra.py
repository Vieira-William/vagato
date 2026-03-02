#!/usr/bin/env python3
"""
Validação com IA - Sistema de Auditoria Completa.

Valida amostra de vagas contra registros brutos usando IA
para detectar discrepâncias entre dados extraídos e dados originais.

Uso:
    python -m app.audit.validar_amostra
    python -m app.audit.validar_amostra --percentual 0.10 --max 100
"""

import argparse
import json
import os
import random
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from ..database import SessionLocal
from .. import models

# Prompt de validação
PROMPT_VALIDACAO = """Você é um auditor de dados. Analise o texto bruto original e compare com os dados extraídos.

TEXTO BRUTO ORIGINAL:
{texto_bruto}

DADOS EXTRAÍDOS (atualmente no banco):
- Título: {titulo}
- Empresa: {empresa}
- Modalidade: {modalidade}
- Tipo de Vaga: {tipo_vaga}
- Forma de Contato: {forma_contato}

TAREFA:
1. Verifique se cada campo extraído está CORRETO em relação ao texto original
2. Identifique discrepâncias (dados incorretos ou inventados)
3. Dê um score de confiança de 0.0 a 1.0

Responda APENAS com JSON válido:
{{
  "campos_corretos": ["titulo", "empresa", ...],
  "discrepancias": [
    {{"campo": "titulo", "esperado": "valor correto baseado no texto", "atual": "valor no banco"}}
  ],
  "score_geral": 0.85,
  "observacoes": "breve comentário"
}}"""


def validar_vaga_com_ia(
    vaga: models.Vaga,
    registro: models.RegistroBruto,
) -> Dict:
    """
    Valida uma vaga específica contra registro bruto usando IA.

    Args:
        vaga: Vaga a validar
        registro: Registro bruto original

    Returns:
        Resultado da validação
    """
    try:
        from anthropic import Anthropic
    except ImportError:
        return {'erro': 'anthropic não instalado'}

    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        return {'erro': 'ANTHROPIC_API_KEY não configurada'}

    # Extrai texto bruto
    dados_brutos = json.loads(registro.dados_brutos)
    texto = dados_brutos.get('texto_completo',
                             dados_brutos.get('titulo', ''))

    # Monta prompt
    prompt = PROMPT_VALIDACAO.format(
        texto_bruto=texto[:2000],  # Limita tamanho
        titulo=vaga.titulo or 'N/A',
        empresa=vaga.empresa or 'N/A',
        modalidade=vaga.modalidade or 'N/A',
        tipo_vaga=vaga.tipo_vaga or 'N/A',
        forma_contato=vaga.forma_contato or 'N/A',
    )

    # Chama IA
    client = Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        resposta_texto = response.content[0].text.strip()

        # Parse JSON
        # Remove possíveis marcadores de código
        if resposta_texto.startswith('```'):
            resposta_texto = resposta_texto.split('```')[1]
            if resposta_texto.startswith('json'):
                resposta_texto = resposta_texto[4:]

        resultado_ia = json.loads(resposta_texto)

        return {
            'sucesso': True,
            'campos_corretos': resultado_ia.get('campos_corretos', []),
            'discrepancias': resultado_ia.get('discrepancias', []),
            'score': resultado_ia.get('score_geral', 0),
            'observacoes': resultado_ia.get('observacoes', ''),
            'prompt': prompt,
            'resposta_raw': resposta_texto,
        }

    except json.JSONDecodeError as e:
        return {
            'sucesso': False,
            'erro': f'JSON inválido: {e}',
            'resposta_raw': resposta_texto,
        }
    except Exception as e:
        return {
            'sucesso': False,
            'erro': str(e),
        }


def validar_amostra(
    percentual: float = 0.05,
    max_amostras: int = 50,
    salvar_banco: bool = True,
    progress_callback=None,
) -> Dict:
    """
    Valida amostra aleatória de vagas contra registros brutos.

    Args:
        percentual: Percentual de vagas a validar (default 5%)
        max_amostras: Máximo de amostras por execução
        salvar_banco: Se True, salva resultados no banco
        progress_callback: Função para reportar progresso
    """
    db = SessionLocal()

    print("="*60)
    print("VALIDAÇÃO COM IA")
    print("="*60)

    # Busca vagas com registro bruto associado
    vagas_com_rastreio = db.query(models.Vaga).filter(
        models.Vaga.registro_bruto_uuid.isnot(None)
    ).all()

    if not vagas_com_rastreio:
        print("Nenhuma vaga com rastreabilidade encontrada.")
        db.close()
        if progress_callback:
            progress_callback({"progresso": 100, "message": "Nenhuma vaga para validar."})
        return {'erro': 'Nenhuma vaga rastreável'}

    # Seleciona amostra
    qtd_amostra = min(int(len(vagas_com_rastreio) * percentual), max_amostras)
    qtd_amostra = max(qtd_amostra, 1)  # Pelo menos 1

    print(f"Total de vagas rastreáveis: {len(vagas_com_rastreio)}")
    print(f"Amostra selecionada: {qtd_amostra} ({percentual*100:.1f}%)")

    amostra = random.sample(vagas_com_rastreio, min(qtd_amostra, len(vagas_com_rastreio)))
    total = len(amostra)

    resultados = []
    discrepancias_total = 0
    scores = []

    print(f"\nValidando {total} vagas...")

    for i, vaga in enumerate(amostra, 1):
        # Busca registro bruto
        registro = db.query(models.RegistroBruto).filter(
            models.RegistroBruto.uuid == vaga.registro_bruto_uuid
        ).first()

        if not registro:
            print(f"  [{i}] ⚠ Registro bruto não encontrado: {vaga.registro_bruto_uuid[:8]}")
            continue

        # Valida com IA
        resultado = validar_vaga_com_ia(vaga, registro)

        if resultado.get('sucesso'):
            scores.append(resultado['score'])
            tem_discrepancia = resultado['score'] < 0.8 or len(resultado.get('discrepancias', [])) > 0

            if tem_discrepancia:
                discrepancias_total += 1
                print(f"  [{i}] ⚠ {vaga.titulo[:30]}... (score: {resultado['score']:.2f})")
                for disc in resultado.get('discrepancias', []):
                    print(f"      - {disc['campo']}: '{disc.get('atual')}' → '{disc.get('esperado')}'")
            else:
                print(f"  [{i}] ✓ {vaga.titulo[:30]}... (score: {resultado['score']:.2f})")

            # Salva no banco
            if salvar_banco:
                _salvar_validacao(
                    db, vaga, registro,
                    resultado=resultado,
                    tem_discrepancia=tem_discrepancia
                )
        else:
            print(f"  [{i}] ✗ Erro: {resultado.get('erro')}")

        resultados.append({
            'vaga_id': vaga.id,
            'titulo': vaga.titulo,
            'registro_uuid': vaga.registro_bruto_uuid,
            **resultado
        })

        if progress_callback:
            progresso_pct = int((i/total)*100)
            progress_callback({
                "progresso": progresso_pct,
                "processados": i,
                "total_amostras": total,
                "message": f"Validando com a IA... {i}/{total} amostras",
                "vagas_com_discrepancia": discrepancias_total
            })

    db.close()

    # Estatísticas
    score_medio = sum(scores) / len(scores) if scores else 0

    relatorio = {
        'data_validacao': datetime.now().isoformat(),
        'total_amostras': len(resultados),
        'vagas_corretas': len(resultados) - discrepancias_total,
        'vagas_com_discrepancia': discrepancias_total,
        'score_medio': score_medio,
        'taxa_acerto': (len(resultados) - discrepancias_total) / len(resultados)
                        if resultados else 0,
        'detalhes': resultados,
    }

    # Resumo
    print(f"\n{'='*60}")
    print("RESULTADO:")
    print(f"  Amostras validadas: {len(resultados)}")
    print(f"  Vagas corretas: {len(resultados) - discrepancias_total}")
    print(f"  Com discrepâncias: {discrepancias_total}")
    print(f"  Score médio: {score_medio:.2%}")
    print(f"  Taxa de acerto: {relatorio['taxa_acerto']:.2%}")
    print("="*60)

    return relatorio


def _salvar_validacao(
    db: Session,
    vaga: models.Vaga,
    registro: models.RegistroBruto,
    resultado: Dict,
    tem_discrepancia: bool,
):
    """Salva resultado da validação no banco."""
    validacao = models.ValidacaoAuditoria(
        registro_bruto_id=registro.id,
        vaga_id=vaga.id,
        tipo_validacao='amostra_periodica',
        resultado='discrepancia' if tem_discrepancia else 'correto',
        campos_verificados=resultado.get('campos_corretos', []),
        score_confianca=resultado.get('score', 0),
        discrepancias=resultado.get('discrepancias', []),
        prompt_usado=resultado.get('prompt', ''),
        resposta_ia=resultado.get('resposta_raw', ''),
    )
    db.add(validacao)
    db.commit()


def validar_vaga_especifica(vaga_id: int) -> Dict:
    """
    Valida uma vaga específica.

    Args:
        vaga_id: ID da vaga a validar

    Returns:
        Resultado da validação
    """
    db = SessionLocal()

    vaga = db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()
    if not vaga:
        db.close()
        return {'erro': f'Vaga {vaga_id} não encontrada'}

    if not vaga.registro_bruto_uuid:
        db.close()
        return {'erro': f'Vaga {vaga_id} não tem rastreabilidade'}

    registro = db.query(models.RegistroBruto).filter(
        models.RegistroBruto.uuid == vaga.registro_bruto_uuid
    ).first()

    if not registro:
        db.close()
        return {'erro': f'Registro bruto não encontrado: {vaga.registro_bruto_uuid}'}

    resultado = validar_vaga_com_ia(vaga, registro)

    if resultado.get('sucesso'):
        _salvar_validacao(
            db, vaga, registro,
            resultado=resultado,
            tem_discrepancia=resultado['score'] < 0.8
        )

    db.close()

    return {
        'vaga_id': vaga_id,
        'titulo': vaga.titulo,
        **resultado
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Valida amostra de vagas contra registros brutos usando IA'
    )
    parser.add_argument(
        '--percentual',
        type=float,
        default=0.05,
        help='Percentual de vagas a validar (default: 0.05 = 5%%)'
    )
    parser.add_argument(
        '--max',
        type=int,
        default=50,
        help='Máximo de amostras (default: 50)'
    )
    parser.add_argument(
        '--vaga-id',
        type=int,
        help='Validar vaga específica por ID'
    )
    parser.add_argument(
        '--no-salvar',
        action='store_true',
        help='Não salvar resultados no banco'
    )

    args = parser.parse_args()

    if args.vaga_id:
        resultado = validar_vaga_especifica(args.vaga_id)
        print(json.dumps(resultado, indent=2, ensure_ascii=False, default=str))
    else:
        resultado = validar_amostra(
            percentual=args.percentual,
            max_amostras=args.max,
            salvar_banco=not args.no_salvar,
        )
