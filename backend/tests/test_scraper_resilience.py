import pytest
from app.scrapers.login_helper import criar_driver_com_perfil
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

@pytest.fixture(scope="module")
def driver():
    """Inicializa o driver com o perfil local mockado/headless"""
    try:
        # Iniciando o headless para rodar transparente em CI local
        driver = criar_driver_com_perfil(headless=True)
        yield driver
    finally:
        if 'driver' in locals() and driver:
            driver.quit()

@pytest.mark.skipif(False, reason="Necessita credenciais reais do LinkedIn. Executando para validação local.")
def test_linkedin_dom_resilience(driver):
    """
    Testes diários (mockados ou headless) que tentam extrair apenas 1 vaga. 
    Se falhar, avisa que o LinkedIn mudou a UI.
    """
    driver.get("https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=Product%20Designer&sortBy=R")
    
    # 1. Verifica se não bateu na AuthWall (Página de login/bloqueio)
    current_url = driver.current_url
    assert "login" not in current_url.lower() and "authwall" not in current_url.lower(), "Sessão expirou ou LinkedIn bloqueou a automação."
    
    # 2. Verifica a estrutura primária: O Layout de Scaffold e Lista lateral
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.scaffold-layout__list"))
        )
    except:
        pytest.fail("A estrutura 'div.scaffold-layout__list' não existe mais. A UI do LinkedIn mudou.")
        
    # 3. Verifica os cards de vagas
    cards = driver.find_elements(By.CSS_SELECTOR, "li.scaffold-layout__list-item[data-occludable-job-id]")
    assert len(cards) > 0, "O seletor dos cards 'li.scaffold-layout__list-item' não está encontrando vagas. A UI mudou."
    
    # 4. Verifica o título de um card
    primeiro_card = cards[0]
    titulo = None
    try:
        titulo = primeiro_card.find_element(By.CSS_SELECTOR, "a strong").text.strip()
    except:
        try:
            titulo = primeiro_card.find_element(By.CSS_SELECTOR, "strong").text.strip()
        except:
            pass
            
    assert titulo is not None, "O seletor 'a strong' ou 'strong' para o título do job_card parou de funcionar."
    
    # Se todas as assertions passarem, o DOM é resiliente e a raspagem bruta não vai quebrar "silenciosamente"
