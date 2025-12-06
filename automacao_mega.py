import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
import time
import logging

# =================================================================
# 1. CONFIGURAÇÃO DE LOG
# =================================================================
LOG_FILENAME = 'automacao_mega.log'
logging.basicConfig(filename=LOG_FILENAME, level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# =================================================================
# 2. CONFIGURAÇÃO DE ACESSO E SELETORES
# =================================================================

APPS_SCRIPT_BASE_URL = "https://script.google.com/macros/s/AKfycbyuX4NxUodwTALVVsFMvDHFhrgV-tR4MBTZA_xdJd2rXLg5qIj1CSg3yXghM66JpWSm/exec"
FINAL_API_URL = f"{APPS_SCRIPT_BASE_URL}?action=getAllJogos"

URL_MEGA = "https://www.loteriasonline.caixa.gov.br/silce-web/#/mega-sena/especial"

# SELETORES REAIS DO SITE DA CAIXA:
ID_BOTAO_ADD_CARRINHO = "colocarnocarrinho" 
# 💡 CORREÇÃO CRÍTICA: Formata o número para ter SEMPRE 2 dígitos (01, 09, 10, 50)
SELECTOR_NUMERO_BASE = 'n{numero:02d}' 
ID_BOTAO_LIMPAR = "limparvolante" 

# Inicializa o driver e maximiza a janela
try:
    driver = webdriver.Chrome() 
    driver.maximize_window()
except Exception as e:
    print(f"❌ Erro ao iniciar o Chrome Driver. Verifique a instalação e o PATH. Erro: {e}")
    logging.critical(f"Erro ao iniciar o Chrome Driver: {e}")
    exit()

# =================================================================
# 3. LEITURA DOS JOGOS (API)
# =================================================================

def ler_jogos_da_planilha(url):
    """Busca os jogos combinados (Apostas + Jogos-adm) via Apps Script API."""
    print("🚀 Buscando jogos combinados no Google Sheets...")
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status() 
        data = response.json()
        
        if 'jogos' in data:
            print(f"✅ Sucesso! {len(data['jogos'])} jogos carregados da planilha.")
            return data['jogos'] 
        else:
            print("❌ Erro no formato dos dados retornados. Verifique o Apps Script.")
            logging.error(f"Erro no formato dos dados retornados: {data}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao acessar a API do Google Sheets: {e}")
        logging.critical(f"Erro ao acessar a API do Google Sheets: {e}")
        return []

# =================================================================
# 4. FUNÇÕES AUXILIARES: LIMPEZA E OVERLAYS
# =================================================================

def remover_overlays():
    """Tenta remover elementos comuns de overlay que possam bloquear a tela."""
    overlay_selectors = [
        ".modal-backdrop", 
        ".loading-overlay", 
        ".ng-transclude", 
        "div[aria-modal='true']" 
    ]
    
    for selector in overlay_selectors:
        try:
            script = f"document.querySelectorAll('{selector}').forEach(e => e.remove());"
            driver.execute_script(script)
        except Exception:
            pass 

def limpar_volante():
    """Tenta clicar no botão 'Limpar Volante' com JavaScript para garantir a limpeza."""
    try:
        # Tenta esperar pela presença do botão de limpar
        WebDriverWait(driver, 3).until(
            EC.presence_of_element_located((By.ID, ID_BOTAO_LIMPAR))
        )
        
        # Força o clique via JavaScript 
        script = f"document.getElementById('{ID_BOTAO_LIMPAR}').click();"
        driver.execute_script(script)
        
        logging.info("Volante limpo explicitamente (ID: limparvolante).")
        time.sleep(1) 
        return True
    except Exception:
        logging.info(f"Botão de limpeza (ID: {ID_BOTAO_LIMPAR}) não encontrado ou não clicável. Pulando limpeza.")
        return False

# =================================================================
# 5. AUTOMAÇÃO (SELENIUM) - VERSÃO DE MÁXIMA ESTABILIDADE
# =================================================================

def automatizar_apostas(jogos_para_apostar):
    """Navega no site da Mega Sena, usando time.sleep e JS Click para contornar instabilidade do driver."""
    
    if not jogos_para_apostar:
        logging.warning("Nenhum jogo para apostar. Encerrando.")
        print("Nenhum jogo para apostar. Encerrando.")
        return

    try:
        driver.get(URL_MEGA)
        logging.info("Página da Mega Sena acessada.")
        print("🌐 Página da Mega Sena acessada.")
        driver.maximize_window() 

        # --- Pausa para Login Manual ---
        print("\n=======================================================")
        input("⚠️ ATENÇÃO: Faça o login no navegador e Pressione ENTER APÓS estar na TELA DE SELEÇÃO de números da Mega Sena. NÃO CLIQUE EM NENHUM NÚMERO.")
        print("=======================================================\n")
        
        # Espera e Limpeza Inicial
        time.sleep(5) 
        remover_overlays() 
        time.sleep(1) 

        # --- Processamento dos Jogos ---
        for i, jogo in enumerate(jogos_para_apostar):
            jogo_numero = i + 1
            
            # Validação e Limpeza do Jogo
            jogo_limpo = sorted([n for n in jogo if isinstance(n, int) and 1 <= n <= 60])
            
            if len(jogo_limpo) < 6:
                logging.warning(f"Jogo {jogo_numero}: Inválido/incompleto ({jogo_limpo}). Pulando.")
                print(f"ATENÇÃO: Jogo {jogo_numero} ({jogo}) inválido/incompleto. Pulando.")
                continue

            logging.info(f"Iniciando Jogo {jogo_numero}: {jogo_limpo}")
            print(f"➡️ Jogo {jogo_numero} ({len(jogo_limpo)} números): {jogo_limpo}")

            # 5.1. Seleção dos Números com JS Executor e Pausa Fixa
            selecao_completa = True
            for numero in jogo_limpo:
                
                # 💡 Formatação corrigida do seletor (n01, n10, etc.)
                seletor_id = SELECTOR_NUMERO_BASE.format(numero=numero)
                
                try:
                    remover_overlays() 
                    
                    # Força o clique via JavaScript
                    script_click = f"document.getElementById('{seletor_id}').click();"
                    driver.execute_script(script_click)
                    
                    # Pausa Fixa para o Angular processar a mudança de classe
                    time.sleep(0.3) 
                    
                    logging.info(f"Jogo {jogo_numero}: Número {numero} clicado (JS Click).")

                except Exception as e:
                    # Falha de "Cannot read properties of null" ocorre aqui se o ID estiver errado
                    logging.error(f"Jogo {jogo_numero}: FALHA CRÍTICA/PRESENÇA ao clicar em {numero} (ID: {seletor_id}). Detalhes: {str(e)[:100]}")
                    print(f"  ❌ Falha no clique do número {numero} (ID: {seletor_id}). Parando Jogo.")
                    selecao_completa = False
                    break 
            
            if selecao_completa:
                # 5.2. Adicionar o Jogo ao Carrinho/Cesta
                try:
                    time.sleep(1) 
                    remover_overlays()
                    
                    # Tenta clicar no carrinho via JavaScript
                    script_add = f"document.getElementById('{ID_BOTAO_ADD_CARRINHO}').click();"
                    driver.execute_script(script_add)
                    
                    logging.info(f"Jogo {jogo_numero}: Adicionado ao carrinho com sucesso (JS Click).")
                    print(f"  ✅ Jogo {jogo_numero} adicionado ao carrinho.")
                    
                    time.sleep(2) 
                    remover_overlays() 
                    limpar_volante() 
                    
                except Exception as e:
                    logging.error(f"Jogo {jogo_numero}: Erro ao adicionar ao carrinho (JS Click). Detalhes: {str(e)[:150]}")
                    print(f"  ❌ ERRO: Não foi possível adicionar o jogo {jogo_numero} ao carrinho. {str(e)[:50]}...")
                    
            # Pausa entre jogos
            time.sleep(2) 

    except Exception as e:
        logging.critical(f"Erro fatal na automação: {e}")
        print(f"⚠️ Ocorreu um erro geral na automação: {e}")

    finally:
        # driver.quit() está comentado, o navegador permanecerá aberto.
        print(f"\n🏁 Automação finalizada. Detalhes completos no arquivo: {LOG_FILENAME}")


# =================================================================
# 6. EXECUÇÃO
# =================================================================

if __name__ == "__main__":
    jogos_lidos = ler_jogos_da_planilha(FINAL_API_URL)

    automatizar_apostas(jogos_lidos)
