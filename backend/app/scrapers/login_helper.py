"""
Script para fazer login manual e salvar sessão em perfil persistente.
Também suporta login automático com credenciais salvas.
"""
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import os
import time
import subprocess
import signal

COOKIES_DIR = os.path.join(os.path.dirname(__file__), "cookies")
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")
# Usa pasta no home do usuário para evitar problemas de permissão
PROFILE_DIR = os.path.expanduser("~/.vagas_ux_chrome_profile")


def cleanup_chrome_processes():
    """Mata processos Chrome orphan que podem estar usando o perfil."""
    try:
        # Mata chromedriver
        subprocess.run(["pkill", "-f", "chromedriver"], capture_output=True, timeout=5)
        # Mata Chrome com nosso perfil específico
        subprocess.run(["pkill", "-f", f"Chrome.*{PROFILE_DIR}"], capture_output=True, timeout=5)
        time.sleep(1)
    except:
        pass

os.makedirs(CONFIG_DIR, exist_ok=True)


def salvar_cookies(driver, site: str):
    """Salva cookies do navegador em arquivo JSON."""
    os.makedirs(COOKIES_DIR, exist_ok=True)
    cookies = driver.get_cookies()
    filepath = os.path.join(COOKIES_DIR, f"{site}_cookies.json")
    with open(filepath, "w") as f:
        json.dump(cookies, f)
    print(f"Cookies salvos em: {filepath}")


def carregar_cookies(driver, site: str) -> bool:
    """Carrega cookies de arquivo JSON para o navegador."""
    filepath = os.path.join(COOKIES_DIR, f"{site}_cookies.json")
    if not os.path.exists(filepath):
        return False

    try:
        with open(filepath, "r") as f:
            cookies = json.load(f)

        # Verifica se cookies é válido
        if not cookies or not isinstance(cookies, list):
            return False

        for cookie in cookies:
            try:
                driver.add_cookie(cookie)
            except:
                pass
        return True
    except Exception:
        return False


def criar_driver_com_perfil(headless=True, retry=True):
    """Cria driver do Chrome com perfil persistente. Headless por padrão."""
    os.makedirs(PROFILE_DIR, exist_ok=True)

    options = Options()
    options.add_argument(f"--user-data-dir={PROFILE_DIR}")
    options.add_argument("--window-size=1200,800")
    options.add_argument("--lang=pt-BR")
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        if retry:
            print(f"Erro ao criar driver, limpando processos: {e}")
            cleanup_chrome_processes()
            time.sleep(2)
            return criar_driver_com_perfil(headless=headless, retry=False)
        raise


def get_linkedin_credentials():
    """Retorna credenciais do LinkedIn salvas."""
    filepath = os.path.join(CONFIG_DIR, "linkedin_credentials.json")

    if not os.path.exists(filepath):
        return None

    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except:
        return None


def fazer_login_linkedin(driver, credentials: dict) -> bool:
    """
    Faz login automático no LinkedIn.

    Args:
        driver: WebDriver do Selenium
        credentials: Dict com 'email' e 'password'

    Returns:
        True se login bem sucedido, False caso contrário
    """
    try:
        email = credentials.get("email")
        password = credentials.get("password")

        if not email or not password:
            print("Credenciais incompletas")
            return False

        # Acessa página de login
        driver.get("https://www.linkedin.com/login")
        time.sleep(2)

        # Verifica se já está logado
        if "feed" in driver.current_url or "jobs" in driver.current_url:
            print("Já está logado no LinkedIn")
            return True

        # Preenche email
        try:
            email_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            email_field.clear()
            email_field.send_keys(email)
        except Exception as e:
            print(f"Erro ao preencher email: {e}")
            return False

        # Preenche senha
        try:
            password_field = driver.find_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(password)
        except Exception as e:
            print(f"Erro ao preencher senha: {e}")
            return False

        # Clica em entrar
        try:
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
        except Exception as e:
            print(f"Erro ao clicar em entrar: {e}")
            return False

        # Aguarda redirecionamento
        time.sleep(3)

        # Verifica se login foi bem sucedido
        if "feed" in driver.current_url or "jobs" in driver.current_url or "checkpoint" not in driver.current_url:
            # Pode ter verificação de segurança
            if "checkpoint" in driver.current_url:
                print("LinkedIn solicitou verificação de segurança. Faça login manualmente.")
                return False

            print("Login LinkedIn realizado com sucesso!")
            # Salva cookies para sessões futuras
            salvar_cookies(driver, "linkedin")
            return True
        else:
            print("Falha no login - verifique as credenciais")
            return False

    except Exception as e:
        print(f"Erro no login: {e}")
        return False


def garantir_login_linkedin(driver) -> bool:
    """
    Garante que o driver está logado no LinkedIn.
    Tenta usar sessão existente, depois credenciais salvas.

    Args:
        driver: WebDriver do Selenium

    Returns:
        True se logado, False caso contrário
    """
    print("[DEBUG] Verificando sessão do LinkedIn...")

    # Acessa o LinkedIn para verificar se está logado
    driver.get("https://www.linkedin.com/jobs/")
    time.sleep(3)

    current_url = driver.current_url
    print(f"[DEBUG] URL após carregar /jobs/: {current_url}")

    # Verifica múltiplos indicadores de login
    page_source = driver.page_source

    # Indicadores de que NÃO está logado
    nao_logado_indicadores = [
        "login" in current_url.lower(),
        "authwall" in current_url.lower(),
        "Sign in" in page_source,
        "Entrar" in page_source and "nav-item__sub" not in page_source,
        "join" in current_url.lower(),
    ]

    # Indicadores de que ESTÁ logado
    logado_indicadores = [
        "feed" in current_url,
        "jobs" in current_url and "authwall" not in current_url,
        "global-nav__me" in page_source,
        "nav-item__profile" in page_source,
    ]

    esta_logado = any(logado_indicadores) and not any(nao_logado_indicadores)

    if esta_logado:
        print("[DEBUG] Sessão do LinkedIn ativa!")
        return True

    print(f"[DEBUG] Não está logado. Indicadores: login_url={nao_logado_indicadores[0]}, authwall={nao_logado_indicadores[1]}")

    # Não está logado - tenta usar credenciais salvas
    credentials = get_linkedin_credentials()

    if credentials:
        print("[DEBUG] Tentando login automático com credenciais salvas...")
        return fazer_login_linkedin(driver, credentials)
    else:
        print("[ERROR] Nenhuma credencial salva. Configure em Configurações > LinkedIn")
        return False


def login_linkedin():
    """Abre LinkedIn para login manual com perfil persistente."""
    print("\n=== LOGIN LINKEDIN ===")
    print("1. Uma janela do Chrome vai abrir")
    print("2. Faça login normalmente (pode usar chave de acesso)")
    print("3. Quando estiver logado, volte aqui e pressione ENTER")
    print("=" * 30)

    driver = criar_driver_com_perfil(headless=False)
    driver.get("https://www.linkedin.com/login")

    input("\nPressione ENTER quando terminar o login...")

    salvar_cookies(driver, "linkedin")
    driver.quit()
    print("Login LinkedIn salvo com sucesso!")


def login_indeed():
    """Abre Indeed para login manual."""
    print("\n=== LOGIN INDEED ===")
    print("1. Uma janela do Chrome vai abrir")
    print("2. Faça login normalmente (pode usar chave de acesso)")
    print("3. Quando estiver logado, volte aqui e pressione ENTER")
    print("=" * 30)

    driver = criar_driver_com_perfil(headless=False)
    driver.get("https://secure.indeed.com/auth")

    input("\nPressione ENTER quando terminar o login...")

    salvar_cookies(driver, "indeed")
    driver.quit()
    print("Login Indeed salvo com sucesso!")


if __name__ == "__main__":
    print("Qual site deseja fazer login?")
    print("1. LinkedIn")
    print("2. Indeed")
    print("3. Ambos")

    escolha = input("\nEscolha (1/2/3): ").strip()

    if escolha == "1":
        login_linkedin()
    elif escolha == "2":
        login_indeed()
    elif escolha == "3":
        login_linkedin()
        login_indeed()
    else:
        print("Opção inválida")
