from locust import HttpUser, task, between

class APIVagasUser(HttpUser):
    # Simula um usuário demorando de 1 a 3 segundos entre acessos
    wait_time = between(1, 3)

    def on_start(self):
        """Executado quando um usuário simulado inicia"""
        pass

    @task(3)
    def listar_vagas(self):
        """Tarefa principal: bater no endpoint primário de Dashboard (GET /api/vagas)
        que faz query paginada no PostgreSQL."""
        # Solicitando página 1 com 25 resultados - o carregamento default do React
        self.client.get("/api/vagas/?skip=0&limit=25", name="/api/vagas/ [Listagem]")

    @task(1)
    def buscar_metricas(self):
        """Tarefa secundária: Bater no endpoint de status gerais"""
        self.client.get("/api/stats/", name="/api/stats/ [Dashboard Cards]")

    @task(1)
    def buscar_vagas_com_filtro(self):
        """Tarefa secundária: Bater no endpoint com queries (exemplo: filtro de React)"""
        # Solicitando vagas filtradas por nível pleno para gerar hit de query search
        self.client.get("/api/vagas/?nivel=pleno", name="/api/vagas/ [Filtro Nível]")
