"""
Cliente Coursera Catalog API + cache in-memory + fallback curado.
Busca cursos relevantes baseados nas skills do perfil do usuário.
"""
import os
import time
import logging
import requests
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

COURSERA_API = "https://api.coursera.org/api/courses.v1"
CACHE_TTL = 3600  # 1 hora

# ── Mapeamento skills → queries Coursera ─────────────────────────────────────

SKILL_QUERY_MAP = {
    "figma": "figma ux design",
    "ux research": "ux research methods",
    "design system": "design systems",
    "ui design": "ui ux design",
    "ux design": "ux design",
    "prototyping": "prototyping ux",
    "wireframing": "wireframing prototyping",
    "design thinking": "design thinking innovation",
    "accessibility": "web accessibility",
    "react": "react frontend development",
    "javascript": "javascript web development",
    "product management": "product management",
    "user testing": "usability testing ux",
    "information architecture": "information architecture ux",
    "interaction design": "interaction design",
    "visual design": "visual design graphic",
    "motion design": "motion design animation",
    "html": "html css web design",
    "css": "css web design",
    "service design": "service design",
    "content strategy": "content strategy ux writing",
}

NIVEL_MAP = {
    "junior": "beginner",
    "pleno": "intermediate",
    "senior": "advanced",
    "lead": "advanced",
    "head": "advanced",
}

# ── Cursos Curados (fallback) ────────────────────────────────────────────────

CURATED_COURSES = [
    {
        "id": "google-ux-design",
        "name": "Google UX Design Professional Certificate",
        "slug": "google-ux-design",
        "path_type": "professional-certificates",
        "platform": "Coursera",
        "partner": "Google",
        "rating": 4.8,
        "enrolled_count": "127k",
        "courses_count": 7,
        "review_count": "86k",
        "schedule_type": "Cronograma flexível",
        "level": "beginner",
        "duration": "6 meses",
        "thumbnail": None,
        "matched_skills": ["Figma", "UX Research", "Wireframing", "Prototyping"],
    },
    {
        "id": "ui-ux-design",
        "name": "UI / UX Design Specialization",
        "slug": "ui-ux-design",
        "path_type": "specializations",
        "platform": "Coursera",
        "partner": "CalArts",
        "rating": 4.6,
        "enrolled_count": "89k",
        "courses_count": 4,
        "review_count": "14k",
        "schedule_type": "Cronograma flexível",
        "level": "beginner",
        "duration": "4 meses",
        "thumbnail": None,
        "matched_skills": ["UI Design", "Visual Design", "Wireframing"],
    },
    {
        "id": "ux-research-at-scale",
        "name": "UX Research at Scale",
        "slug": "ux-research-at-scale",
        "path_type": "learn",
        "platform": "Coursera",
        "partner": "Google",
        "rating": 4.7,
        "enrolled_count": "45k",
        "courses_count": None,
        "review_count": "6k",
        "schedule_type": "Cronograma flexível",
        "level": "intermediate",
        "duration": "3 semanas",
        "thumbnail": None,
        "matched_skills": ["UX Research", "User Testing"],
    },
    {
        "id": "interaction-design",
        "name": "Interaction Design Specialization",
        "slug": "interaction-design",
        "path_type": "specializations",
        "platform": "Coursera",
        "partner": "UC San Diego",
        "rating": 4.5,
        "enrolled_count": "67k",
        "courses_count": 8,
        "review_count": "11k",
        "schedule_type": "Cronograma flexível",
        "level": "intermediate",
        "duration": "8 meses",
        "thumbnail": None,
        "matched_skills": ["Interaction Design", "Prototyping", "UX Research"],
    },
    {
        "id": "visual-elements-user-interface-design",
        "name": "Visual Elements of User Interface Design",
        "slug": "visual-elements-user-interface-design",
        "path_type": "learn",
        "platform": "Coursera",
        "partner": "CalArts",
        "rating": 4.6,
        "enrolled_count": "32k",
        "courses_count": None,
        "review_count": "5k",
        "schedule_type": "Cronograma flexível",
        "level": "beginner",
        "duration": "4 semanas",
        "thumbnail": None,
        "matched_skills": ["UI Design", "Visual Design"],
    },
    {
        "id": "human-computer-interaction",
        "name": "Human-Computer Interaction",
        "slug": "human-computer-interaction",
        "path_type": "learn",
        "platform": "Coursera",
        "partner": "Georgia Tech",
        "rating": 4.7,
        "enrolled_count": "28k",
        "courses_count": None,
        "review_count": "4k",
        "schedule_type": "Cronograma flexível",
        "level": "advanced",
        "duration": "4 meses",
        "thumbnail": None,
        "matched_skills": ["UX Research", "Interaction Design", "Accessibility"],
    },
    {
        "id": "uva-darden-design-thinking-innovation",
        "name": "Design Thinking for Innovation",
        "slug": "uva-darden-design-thinking-innovation",
        "path_type": "learn",
        "platform": "Coursera",
        "partner": "University of Virginia",
        "rating": 4.8,
        "enrolled_count": "310k",
        "courses_count": None,
        "review_count": "42k",
        "schedule_type": "Cronograma flexível",
        "level": "beginner",
        "duration": "5 semanas",
        "thumbnail": None,
        "matched_skills": ["Design Thinking", "UX Research"],
    },
    {
        "id": "beginnerfigmauiuxdesignessentials",
        "name": "Figma UI/UX Design Essentials",
        "slug": "beginnerfigmauiuxdesignessentials",
        "path_type": "specializations",
        "platform": "Coursera",
        "partner": "Coursera Project Network",
        "rating": 4.5,
        "enrolled_count": "18k",
        "courses_count": 3,
        "review_count": "3k",
        "schedule_type": "Cronograma flexível",
        "level": "beginner",
        "duration": "2 horas",
        "thumbnail": None,
        "matched_skills": ["Figma", "UI Design", "Prototyping"],
    },
    {
        "id": "accessibility",
        "name": "Introduction to Web Accessibility",
        "slug": "accessibility",
        "path_type": "learn",
        "platform": "Coursera",
        "partner": "Google",
        "rating": 4.6,
        "enrolled_count": "15k",
        "courses_count": None,
        "review_count": "2k",
        "schedule_type": "Cronograma flexível",
        "level": "intermediate",
        "duration": "4 semanas",
        "thumbnail": None,
        "matched_skills": ["Accessibility", "HTML", "CSS"],
    },
    {
        "id": "uva-darden-digital-product-management",
        "name": "Digital Product Management",
        "slug": "uva-darden-digital-product-management",
        "path_type": "specializations",
        "platform": "Coursera",
        "partner": "University of Virginia",
        "rating": 4.7,
        "enrolled_count": "52k",
        "courses_count": 5,
        "review_count": "8k",
        "schedule_type": "Cronograma flexível",
        "level": "intermediate",
        "duration": "4 meses",
        "thumbnail": None,
        "matched_skills": ["Product Management", "Design Thinking"],
    },
]


# ── Service ──────────────────────────────────────────────────────────────────

class CourseraService:
    """Busca cursos relevantes via Coursera API com cache e fallback curado."""

    _cache: Dict[str, dict] = {}

    def __init__(self):
        self.last_source = "coursera"
        self.cache_expires_at: Optional[str] = None

    def get_recommended(
        self,
        skills: List[str],
        nivel: str = "senior",
        limit: int = 8,
    ) -> List[Dict]:
        """Retorna cursos recomendados baseados nas skills e nível."""
        if not skills:
            return []

        cache_key = f"{','.join(sorted(s.lower() for s in skills[:5]))}:{nivel}"

        # ── Verifica cache ──
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if time.time() < cached["expires"]:
                self.last_source = cached["source"]
                self.cache_expires_at = cached["expires_iso"]
                logger.info(f"[Coursera] Cache hit para '{cache_key}'")
                return cached["courses"]

        # ── Tenta API Coursera ──
        try:
            courses = self._fetch_from_coursera(skills, nivel, limit)
            self.last_source = "coursera"
            logger.info(f"[Coursera] API retornou {len(courses)} cursos")
        except Exception as e:
            logger.warning(f"[Coursera] API falhou ({e}), usando fallback curado")
            courses = self._get_curated_fallback(skills, limit)
            self.last_source = "curated"

        # ── Monta links afiliados ──
        courses = [self._add_affiliate_link(c) for c in courses]

        # ── Salva em cache ──
        expires = time.time() + CACHE_TTL
        expires_iso = datetime.fromtimestamp(expires, tz=timezone.utc).isoformat()
        self._cache[cache_key] = {
            "courses": courses,
            "source": self.last_source,
            "expires": expires,
            "expires_iso": expires_iso,
        }
        self.cache_expires_at = expires_iso

        return courses

    # ── Coursera API ─────────────────────────────────────────────────────────

    def _fetch_from_coursera(
        self, skills: List[str], nivel: str, limit: int
    ) -> List[Dict]:
        """Busca cursos na Coursera Catalog API."""
        queries = []
        for skill in skills[:5]:
            q = SKILL_QUERY_MAP.get(skill.lower(), skill.lower())
            if q not in queries:
                queries.append(q)

        all_courses: List[Dict] = []

        for q in queries[:3]:  # Máximo 3 chamadas à API
            try:
                params = {
                    "q": "search",
                    "query": q,
                    "fields": "name,slug,photoUrl,description,partnerIds",
                    "includes": "partnerIds",
                    "limit": 5,
                }
                resp = requests.get(COURSERA_API, params=params, timeout=8)
                resp.raise_for_status()
                data = resp.json()

                # Mapa de partners (linked)
                partners_map = {}
                for p in data.get("linked", {}).get("partners.v1", []):
                    partners_map[p["id"]] = p.get("name", "Coursera")

                for element in data.get("elements", []):
                    partner_ids = element.get("partnerIds", [])
                    partner_name = partners_map.get(
                        partner_ids[0], "Coursera"
                    ) if partner_ids else "Coursera"

                    course = {
                        "id": element.get("id", ""),
                        "name": element.get("name", ""),
                        "slug": element.get("slug", element.get("id", "")),
                        "platform": "Coursera",
                        "partner": partner_name,
                        "rating": None,  # API pública não retorna rating
                        "enrolled_count": None,
                        "courses_count": None,
                        "review_count": None,
                        "schedule_type": "Cronograma flexível",
                        "level": NIVEL_MAP.get(nivel, "intermediate"),
                        "duration": None,
                        "thumbnail": element.get("photoUrl"),
                        "matched_skills": [
                            s for s in skills
                            if s.lower() in q.lower()
                            or q.lower() in SKILL_QUERY_MAP.get(s.lower(), "")
                        ],
                    }
                    all_courses.append(course)

            except Exception as e:
                logger.warning(f"[Coursera] Erro na query '{q}': {e}")
                continue

        if not all_courses:
            raise Exception("Nenhum curso encontrado via API")

        # Deduplica por id
        seen = set()
        unique = []
        for c in all_courses:
            if c["id"] not in seen:
                seen.add(c["id"])
                unique.append(c)

        # Ordena: mais skills matched primeiro
        unique.sort(key=lambda c: len(c.get("matched_skills", [])), reverse=True)

        return unique[:limit]

    # ── Fallback Curado ──────────────────────────────────────────────────────

    def _get_curated_fallback(
        self, skills: List[str], limit: int
    ) -> List[Dict]:
        """Retorna cursos curados filtrados pelas skills do perfil."""
        skills_lower = {s.lower() for s in skills}

        scored = []
        for course in CURATED_COURSES:
            matched = [
                s for s in course["matched_skills"]
                if s.lower() in skills_lower
            ]
            score = len(matched)
            c = {**course, "matched_skills": matched if matched else course["matched_skills"][:2]}
            scored.append((score, c))

        # Ordena por match score (desc), depois alfabético
        scored.sort(key=lambda x: (-x[0], x[1]["name"]))

        return [c for _, c in scored[:limit]]

    # ── Link Afiliado ────────────────────────────────────────────────────────

    def _add_affiliate_link(self, course: Dict) -> Dict:
        """Adiciona URL com tracking de afiliado, respeitando o path_type do curso."""
        slug = course.get("slug", course.get("id", ""))
        path_type = course.get("path_type", "learn")  # padrão: cursos individuais
        impact_id = os.getenv("COURSERA_IMPACT_ID")

        base = f"https://www.coursera.org/{path_type}/{slug}"

        if impact_id:
            course["url"] = f"https://imp.i384100.net/c/{impact_id}/1/{path_type}/{slug}"
        else:
            course["url"] = (
                f"{base}"
                f"?utm_source=vagato&utm_medium=dashboard&utm_campaign=courses"
            )

        return course
