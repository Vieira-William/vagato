"""
Servico de matching entre perfil do usuario e vagas.
Calcula score de compatibilidade (0.0 a 1.0) baseado em varios criterios.
"""
from typing import Dict, List
from dataclasses import dataclass
import logging

from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class MatchWeights:
    """Pesos para calculo de compatibilidade."""
    skills: float = 0.35        # 35% - Skills tecnicas
    nivel: float = 0.20         # 20% - Senioridade
    modalidade: float = 0.15    # 15% - Remoto/Hibrido/Presencial
    tipo_contrato: float = 0.10 # 10% - CLT/PJ
    salario: float = 0.10       # 10% - Faixa salarial
    ingles: float = 0.05        # 5% - Requisito de ingles
    localizacao: float = 0.05   # 5% - Localizacao


class JobMatcher:
    """Servico para calcular compatibilidade entre perfil e vaga."""

    def __init__(self, user_profile: Dict):
        """
        Inicializa o matcher com o perfil do usuario.

        Args:
            user_profile: Dict com dados do perfil (skills, nivel, etc)
        """
        self.profile = user_profile
        self.weights = MatchWeights()

    def calcular_score(self, vaga: Dict) -> Dict:
        """
        Calcula score de compatibilidade (0.0 a 1.0).

        Args:
            vaga: Dict com dados da vaga

        Returns:
            {
                "score_total": 0.85,
                "is_destaque": True,
                "breakdown": {
                    "skills": 0.90,
                    "nivel": 0.85,
                    ...
                },
                "motivos_destaque": ["Alta compatibilidade de skills", ...]
            }
        """
        breakdown = {}
        motivos = []

        # 1. SKILLS MATCH (35%)
        breakdown["skills"] = self._match_skills(vaga)
        if breakdown["skills"] >= 0.8:
            motivos.append("Alta compatibilidade de skills")

        # 2. NIVEL/SENIORIDADE (20%)
        breakdown["nivel"] = self._match_nivel(vaga)
        if breakdown["nivel"] >= 0.9:
            motivos.append("Nivel adequado ao seu perfil")

        # 3. MODALIDADE (15%)
        breakdown["modalidade"] = self._match_modalidade(vaga)
        if breakdown["modalidade"] == 1.0:
            motivos.append("Modalidade preferida")

        # 4. TIPO CONTRATO (10%)
        breakdown["tipo_contrato"] = self._match_tipo_contrato(vaga)

        # 5. SALARIO (10%)
        breakdown["salario"] = self._match_salario(vaga)
        if breakdown["salario"] >= 0.8:
            motivos.append("Faixa salarial compativel")

        # 6. INGLES (5%)
        breakdown["ingles"] = self._match_ingles(vaga)

        # 7. LOCALIZACAO (5%)
        breakdown["localizacao"] = self._match_localizacao(vaga)

        # Calcular score total ponderado
        score_total = (
            breakdown["skills"] * self.weights.skills +
            breakdown["nivel"] * self.weights.nivel +
            breakdown["modalidade"] * self.weights.modalidade +
            breakdown["tipo_contrato"] * self.weights.tipo_contrato +
            breakdown["salario"] * self.weights.salario +
            breakdown["ingles"] * self.weights.ingles +
            breakdown["localizacao"] * self.weights.localizacao
        )

        # Determinar se e destaque
        is_destaque = score_total >= settings.SCORE_DESTAQUE_THRESHOLD

        return {
            "score_total": round(score_total, 3),
            "is_destaque": is_destaque,
            "breakdown": {k: round(v, 3) for k, v in breakdown.items()},
            "motivos_destaque": motivos if is_destaque else []
        }

    def _match_skills(self, vaga: Dict) -> float:
        """Calcula match de skills (0.0 a 1.0)."""
        user_skills = set(s.lower().strip() for s in self.profile.get("skills", []))

        # Skills obrigatorias da vaga
        vaga_obrig = set(s.lower().strip() for s in (vaga.get("skills_obrigatorias") or []))
        vaga_desej = set(s.lower().strip() for s in (vaga.get("skills_desejaveis") or []))

        if not vaga_obrig and not vaga_desej:
            return 0.7  # Sem info = score neutro

        # Match em obrigatorias (peso maior)
        if vaga_obrig:
            # Verificar match parcial (ex: "figma" match com "figma pro")
            match_count = 0
            for skill in vaga_obrig:
                for user_skill in user_skills:
                    if skill in user_skill or user_skill in skill:
                        match_count += 1
                        break
            match_obrig = match_count / len(vaga_obrig)
        else:
            match_obrig = 1.0

        # Match em desejaveis (peso menor)
        if vaga_desej:
            match_count = 0
            for skill in vaga_desej:
                for user_skill in user_skills:
                    if skill in user_skill or user_skill in skill:
                        match_count += 1
                        break
            match_desej = match_count / len(vaga_desej)
        else:
            match_desej = 1.0

        # 70% obrigatorias + 30% desejaveis
        return match_obrig * 0.7 + match_desej * 0.3

    def _match_nivel(self, vaga: Dict) -> float:
        """Calcula match de senioridade."""
        niveis = ["junior", "pleno", "senior", "lead", "head", "especialista"]

        user_nivel = self.profile.get("nivel_minimo", "senior")
        vaga_nivel = vaga.get("nivel", "nao_especificado")

        if vaga_nivel in ["nao_especificado", None, ""]:
            return 0.7

        try:
            user_idx = niveis.index(user_nivel.lower())
            vaga_idx = niveis.index(vaga_nivel.lower())

            # Ideal: vaga no mesmo nivel ou 1 acima
            diff = vaga_idx - user_idx

            if diff == 0:
                return 1.0
            elif diff == 1:
                return 0.9
            elif diff == -1:
                return 0.7
            elif diff == 2:
                return 0.6
            else:
                return 0.3
        except ValueError:
            return 0.5

    def _match_modalidade(self, vaga: Dict) -> float:
        """Calcula match de modalidade de trabalho."""
        user_mods = [m.lower() for m in self.profile.get("modalidades_aceitas", ["remoto"])]
        vaga_mod = (vaga.get("modalidade") or "nao_especificado").lower()

        if vaga_mod in ["nao_especificado", ""]:
            return 0.7

        if vaga_mod in user_mods:
            return 1.0
        elif vaga_mod == "hibrido" and "remoto" in user_mods:
            return 0.7  # Hibrido e parcialmente aceitavel
        else:
            return 0.3

    def _match_tipo_contrato(self, vaga: Dict) -> float:
        """Calcula match de tipo de contrato."""
        user_tipos = [t.lower() for t in self.profile.get("tipos_contrato", ["clt", "pj"])]
        vaga_tipo = (vaga.get("tipo_contrato") or "nao_especificado").lower()

        if vaga_tipo in ["nao_especificado", ""]:
            return 0.7

        return 1.0 if vaga_tipo in user_tipos else 0.3

    def _match_salario(self, vaga: Dict) -> float:
        """Calcula match de faixa salarial."""
        user_min = self.profile.get("salario_minimo")
        user_max = self.profile.get("salario_maximo")

        vaga_min = vaga.get("salario_min")
        vaga_max = vaga.get("salario_max")

        # Sem informacao de salario na vaga
        if not vaga_min and not vaga_max:
            return 0.7

        # Usuario nao definiu expectativa
        if not user_min:
            return 0.8

        # Usar valor maximo ou minimo da vaga
        vaga_valor = vaga_max or vaga_min or 0

        if vaga_valor >= user_min:
            if user_max and vaga_valor <= user_max * 1.5:
                return 1.0
            return 0.9
        else:
            # Abaixo do minimo
            ratio = vaga_valor / user_min if user_min else 0
            return max(0.2, ratio)

    def _match_ingles(self, vaga: Dict) -> float:
        """Calcula match de requisito de ingles."""
        niveis = ["nenhum", "basico", "intermediario", "fluente"]

        user_nivel = self.profile.get("nivel_ingles", "intermediario")
        vaga_nivel = (vaga.get("requisito_ingles") or "nao_especificado").lower()

        if vaga_nivel in ["nao_especificado", ""]:
            return 0.8

        try:
            user_idx = niveis.index(user_nivel)
            vaga_idx = niveis.index(vaga_nivel)

            if user_idx >= vaga_idx:
                return 1.0
            elif user_idx == vaga_idx - 1:
                return 0.6
            else:
                return 0.2
        except ValueError:
            return 0.5

    def _match_localizacao(self, vaga: Dict) -> float:
        """Calcula match de localizacao."""
        user_locs = [loc.lower() for loc in self.profile.get("localizacoes", [])]
        vaga_loc = (vaga.get("localizacao") or "").lower()

        if not vaga_loc or vaga_loc == "remoto" or "remoto" in vaga_loc:
            return 1.0

        for loc in user_locs:
            if loc in vaga_loc or vaga_loc in loc:
                return 1.0

        if "brasil" in user_locs:
            return 0.7  # Qualquer lugar no Brasil

        return 0.3

    def calcular_scores_batch(self, vagas: List[Dict]) -> List[Dict]:
        """
        Calcula scores para multiplas vagas.

        Args:
            vagas: Lista de dicts com dados das vagas

        Returns:
            Lista de vagas com scores adicionados
        """
        for vaga in vagas:
            resultado = self.calcular_score(vaga)
            vaga["score_compatibilidade"] = resultado["score_total"]
            vaga["score_breakdown"] = resultado["breakdown"]
            vaga["is_destaque"] = resultado["is_destaque"]

        logger.info(f"Scores calculados para {len(vagas)} vagas")
        return vagas
