/* =========================================================
   ACESSIBILIDADE.JS
   Controla o painel flutuante de acessibilidade presente em
   todas as páginas do site:
   - Aumentar/diminuir/redefinir tamanho da fonte
   - Alto contraste
   - Modo adaptado para daltonismo
   - Leitura da página em voz alta (Web Speech API)
   As preferências ficam salvas no localStorage, então valem
   para o site inteiro (comprador e vendedor).
   ========================================================= */

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
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
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
    if (chkContraste) chkContraste.checked = estado.altoContraste;

    const chkDaltonico = document.getElementById("a11y-modo-daltonico");
    if (chkDaltonico) chkDaltonico.checked = estado.modoDaltonico;
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

    // Abrir / fechar painel
    if (botaoAbrir && painel) {
      botaoAbrir.addEventListener("click", function () {
        const aberto = painel.classList.toggle("aberto");
        botaoAbrir.setAttribute("aria-expanded", String(aberto));
        if (aberto) painel.querySelector("button, input, select")?.focus();
      });
    }

    if (botaoFechar && painel) {
      botaoFechar.addEventListener("click", function () {
        painel.classList.remove("aberto");
        botaoAbrir?.setAttribute("aria-expanded", "false");
        botaoAbrir?.focus();
      });
    }

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && painel?.classList.contains("aberto")) {
        painel.classList.remove("aberto");
        botaoAbrir?.setAttribute("aria-expanded", "false");
      }
    });

    // Tamanho da fonte
    botaoAumentar?.addEventListener("click", function () {
      estado.escalaFonte = Math.min(ESCALA_MAX, +(estado.escalaFonte + ESCALA_PASSO).toFixed(2));
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
    });

    botaoDiminuir?.addEventListener("click", function () {
      estado.escalaFonte = Math.max(ESCALA_MIN, +(estado.escalaFonte - ESCALA_PASSO).toFixed(2));
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
    });

    // Alto contraste
    chkContraste?.addEventListener("change", function () {
      estado.altoContraste = chkContraste.checked;
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
    });

    // Modo adaptado para daltonismo
    chkDaltonico?.addEventListener("change", function () {
      estado.modoDaltonico = chkDaltonico.checked;
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
    });

    // Redefinir tudo
    botaoReiniciar?.addEventListener("click", function () {
      estado = { ...estadoPadrao };
      aplicarPreferencias(estado);
      salvarPreferencias(estado);
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

    botaoLer?.addEventListener("click", function () {
      if (!sintetizador) {
        alert("A leitura em voz alta não é suportada neste navegador.");
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