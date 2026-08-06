(function () {
  "use strict";

  const CHAVE_ARMAZENAMENTO = "acessibilidade-preferencias";
  const ESCALA_MIN = 0.85;
  const ESCALA_MAX = 1.5;
  const ESCALA_PASSO = 0.1;

  const estadoPadrao = {
    escalaFonte: 1,
    altoContraste: false,
    modoDaltonico: false,
  };

  function carregarPreferencias() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO));
      return { ...estadoPadrao, ...(salvo || {}) };
    } catch (erro) {
      return { ...estadoPadrao };
    }
  }

  function salvarPreferencias(estado) {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    } catch (erro) {
    }
  }
  
  function obterRegiaoAnuncio() {
    let regiao = document.getElementById("a11y-regiao-anuncio");
    if (!regiao) {
      regiao = document.createElement("div");
      regiao.id = "a11y-regiao-anuncio";
      regiao.className = "a11y-regiao-anuncio";
      regiao.setAttribute("role", "status");
      regiao.setAttribute("aria-live", "polite");
      document.body.appendChild(regiao);
    }
    return regiao;
  }

  function anunciar(mensagem) {
    const regiao = obterRegiaoAnuncio();
    // Limpa antes para garantir que a mesma mensagem seja lida de novo se repetida
    regiao.textContent = "";
    window.setTimeout(function () {
      regiao.textContent = mensagem;
    }, 50);
  }

  function aplicarPreferencias(estado) {
    document.documentElement.style.setProperty("--escala-fonte", estado.escalaFonte);
    document.body.classList.toggle("alto-contraste", estado.altoContraste);
    document.body.classList.toggle("modo-daltonico", estado.modoDaltonico);

    const rotuloFonte = document.getElementById("a11y-valor-fonte");
    if (rotuloFonte) {
      rotuloFonte.textContent = Math.round(estado.escalaFonte * 100) + "%";
    }

    const chkContraste = document.getElementById("a11y-alto-contraste");
    if (chkContraste) {
      chkContraste.checked = estado.altoContraste;
      chkContraste.setAttribute("role", "switch");
      chkContraste.setAttribute("aria-checked", String(estado.altoContraste));
    }

    const chkDaltonico = document.getElementById("a11y-modo-daltonico");
    if (chkDaltonico) {
      chkDaltonico.checked = estado.modoDaltonico;
      chkDaltonico.setAttribute("role", "switch");
      chkDaltonico.setAttribute("aria-checked", String(estado.modoDaltonico));
      // Deixa explícito, para quem usa leitor de tela, que o modo
      // cobre os três tipos mais comuns de daltonismo de uma vez.
      if (!chkDaltonico.hasAttribute("aria-describedby")) {
        let descricao = document.getElementById("a11y-daltonico-descricao");
        if (!descricao) {
          descricao = document.createElement("span");
          descricao.id = "a11y-daltonico-descricao";
          descricao.className = "a11y-regiao-anuncio";
          descricao.textContent =
            "Ajusta cores e ícones para protanopia, deuteranopia e tritanopia.";
          chkDaltonico.insertAdjacentElement("afterend", descricao);
        }
        chkDaltonico.setAttribute("aria-describedby", "a11y-daltonico-descricao");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    let estado = carregarPreferencias();
    aplicarPreferencias(estado);

    const botaoAbrir = document.getElementById("a11y-botao-abrir");
    const painel = document.getElementById("a11y-painel");
    const botaoFechar = document.getElementById("a11y-fechar");
    const botaoAumentar = document.getElementById("a11y-aumentar-fonte");
    const botaoDiminuir = document.getElementById("a11y-diminuir-fonte");
    const chkContraste = document.getElementById("a11y-alto-contraste");
    const chkDaltonico = document.getElementById("a11y-modo-daltonico");
    const botaoLer = document.getElementById("a11y-ler-pagina");
    const botaoReiniciar = document.getElementById("a11y-reiniciar");

    function elementosFocaveisDoPainel() {
      if (!painel) return [];
      return Array.from(
        painel.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    }

    function fecharPainel() {
      if (!painel) return;
      painel.classList.remove("aberto");
      botaoAbrir?.setAttribute("aria-expanded", "false");
    }

    function abrirPainel() {
      if (!painel) return;
      painel.classList.add("aberto");
      botaoAbrir?.setAttribute("aria-expanded", "true");
      elementosFocaveisDoPainel()[0]?.focus();
    }

    // Abrir / fechar painel
    if (botaoAbrir && painel) {
      botaoAbrir.addEventListener("click", function () {
        const abrindo = !painel.classList.contains("aberto");
        if (abrindo) {
          abrirPainel();
        } else {
          fecharPainel();
        }
      });
    }

    if (botaoFechar && painel) {
      botaoFechar.addEventListener("click", function () {
        fecharPainel();
        botaoAbrir?.focus();
      });
    }

    // Fecha ao clicar fora do painel e do botão que o abre
    document.addEventListener("click", function (evento) {
      if (!painel || !painel.classList.contains("aberto")) return;
      const cliqueDentro = painel.contains(evento.target) || botaoAbrir?.contains(evento.target);
      if (!cliqueDentro) {
        fecharPainel();
      }
    });

    // Esc fecha o painel; Tab/Shift+Tab ficam presos dentro dele
    document.addEventListener("keydown", function (evento) {
      if (!painel || !painel.classList.contains("aberto")) return;

      if (evento.key === "Escape") {
        fecharPainel();
        botaoAbrir?.focus();
        return;
      }

      if (evento.key === "Tab") {
        const focaveis = elementosFocaveisDoPainel();
        if (focaveis.length === 0) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    });

    // Tamanho da fonte
    botaoAumentar?.addEventListener("click", function () {
      estado.escalaFonte = Math.min(ESCALA_MAX, +(estado.escalaFonte + ESCALA_PASSO).toFixed(2));
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
      anunciar("Tamanho da fonte: " + Math.round(estado.escalaFonte * 100) + "%");
    });

    botaoDiminuir?.addEventListener("click", function () {
      estado.escalaFonte = Math.max(ESCALA_MIN, +(estado.escalaFonte - ESCALA_PASSO).toFixed(2));
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
      anunciar("Tamanho da fonte: " + Math.round(estado.escalaFonte * 100) + "%");
    });

    // Alto contraste
    chkContraste?.addEventListener("change", function () {
      estado.altoContraste = chkContraste.checked;
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
      anunciar(estado.altoContraste ? "Alto contraste ativado" : "Alto contraste desativado");
    });

    // Modo adaptado para daltonismo
    chkDaltonico?.addEventListener("change", function () {
      estado.modoDaltonico = chkDaltonico.checked;
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
      anunciar(
        estado.modoDaltonico
          ? "Modo adaptado para daltonismo ativado, cobrindo protanopia, deuteranopia e tritanopia"
          : "Modo adaptado para daltonismo desativado"
      );
    });

    // Redefinir tudo
    botaoReiniciar?.addEventListener("click", function () {
      estado = { ...estadoPadrao };
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
      anunciar("Preferências de acessibilidade redefinidas para o padrão");
    });

    // ---------- Leitura da página em voz alta ----------
    const sintetizador = window.speechSynthesis;

    function textoPrincipalDaPagina() {
      const principal = document.querySelector("main") || document.body;
      // Ignora o próprio painel de acessibilidade na leitura
      const clone = principal.cloneNode(true);
      clone.querySelectorAll("#a11y-painel, script, style").forEach((el) => el.remove());
      return clone.innerText.replace(/\s+/g, " ").trim();
    }

    function escolherVozPtBr() {
      if (!sintetizador) return null;
      const vozes = sintetizador.getVoices();
      return (
        vozes.find((v) => v.lang && v.lang.toLowerCase() === "pt-br") ||
        vozes.find((v) => v.lang && v.lang.toLowerCase().startsWith("pt")) ||
        null
      );
    }

    botaoLer?.addEventListener("click", function () {
      if (!sintetizador) {
        anunciar("A leitura em voz alta não é suportada neste navegador.");
        return;
      }

      if (sintetizador.speaking) {
        sintetizador.cancel();
        botaoLer.classList.remove("lendo");
        botaoLer.textContent = "🔊 Ouvir esta página";
        return;
      }

      const texto = textoPrincipalDaPagina();
      if (!texto) return;

      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = "pt-BR";
      fala.rate = 1;
      const voz = escolherVozPtBr();
      if (voz) fala.voice = voz;

      fala.onstart = function () {
        botaoLer.classList.add("lendo");
        botaoLer.textContent = "⏹ Parar leitura";
      };
      fala.onend = fala.onerror = function () {
        botaoLer.classList.remove("lendo");
        botaoLer.textContent = "🔊 Ouvir esta página";
      };

      sintetizador.speak(fala);
    });
  });
})();