/* =========================================================
   CARRINHO.JS
   Controla a página do carrinho:
   - Lista os itens salvos (js/carrinho-dados.js)
   - Permite alterar quantidade e remover produtos
   - Passo "Finalizar compra": mostra a recapitulação do
     pedido (produtos selecionados + valor total)
   - Passo "Confirmar compra": simula o fechamento do pedido

   >>> INTEGRAÇÃO COM O BACKEND <<<
   finalizarPedido() usa POST/PATCH /carrinho. Os itens
   continuam locais enquanto não existir endpoint de item_carrinho.
   ========================================================= */

(function () {
  "use strict";

  const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8080"
    : "https://loja-api-ut39.onrender.com";
  const CHAVE_USUARIO_ID = "loja-usuario-id";

  async function requisitar(caminho, opcoes = {}) {
    const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      ...opcoes,
      headers: {
        Accept: "application/json",
        ...(opcoes.headers || {}),
      },
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`Erro ${resposta.status} ao acessar ${caminho}: ${detalhe}`);
    }

    if (resposta.status === 204) return null;
    return resposta.json();
  }

  async function obterUsuarioId() {
    const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO_ID);
    if (usuarioSalvo && Number(usuarioSalvo) > 0) return Number(usuarioSalvo);

    window.location.assign("login.html");
    throw new Error("Faça login como comprador para finalizar a compra.");
  }

  function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function criarLinhaItem(item) {
    const linha = document.createElement("div");
    linha.className = "item-carrinho";
    linha.innerHTML = `
      <div class="item-carrinho__imagem">
        ${item.imagemUrl ? `<img src="${item.imagemUrl}" alt="${item.nome}" />` : "📦"}
      </div>

      <div class="item-carrinho__info">
        <p class="item-carrinho__nome">${item.nome}</p>
        <p class="item-carrinho__preco-unit">${formatarPreco(item.preco)} / unidade</p>
      </div>

      <div class="item-carrinho__quantidade">
        <button type="button" class="botao-diminuir" aria-label="Diminuir quantidade de ${item.nome}">−</button>
        <span aria-live="polite">${item.quantidade}</span>
        <button type="button" class="botao-aumentar" aria-label="Aumentar quantidade de ${item.nome}">+</button>
      </div>

      <p class="item-carrinho__subtotal">${formatarPreco(item.preco * item.quantidade)}</p>

      <button type="button" class="item-carrinho__remover" aria-label="Remover ${item.nome} do carrinho">🗑</button>
    `;

    linha.querySelector(".botao-diminuir").addEventListener("click", function () {
      CarrinhoDados.atualizarQuantidade(item.id, item.quantidade - 1);
      renderizarCarrinho();
    });

    linha.querySelector(".botao-aumentar").addEventListener("click", function () {
      CarrinhoDados.atualizarQuantidade(item.id, item.quantidade + 1);
      renderizarCarrinho();
    });

    linha.querySelector(".item-carrinho__remover").addEventListener("click", function () {
      CarrinhoDados.removerDoCarrinho(item.id);
      renderizarCarrinho();
    });

    return linha;
  }

  function renderizarCarrinho() {
    const itens = CarrinhoDados.obterCarrinho();
    const lista = document.getElementById("lista-carrinho");
    const paginaCarrinho = document.getElementById("pagina-carrinho");
    const vazio = document.getElementById("carrinho-vazio");

    lista.innerHTML = "";
    itens.forEach((item) => lista.appendChild(criarLinhaItem(item)));

    const semItens = itens.length === 0;
    vazio.hidden = !semItens;
    paginaCarrinho.hidden = semItens;

    const totalItens = CarrinhoDados.totalItens(itens);
    const totalValor = CarrinhoDados.totalValor(itens);

    document.getElementById("resumo-qtd-itens").textContent = totalItens;
    document.getElementById("resumo-subtotal").textContent = formatarPreco(totalValor);
    document.getElementById("resumo-total").textContent = formatarPreco(totalValor);

    document.getElementById("botao-comprar").disabled = semItens;
  }

  // ---------- Navegação entre os passos (carrinho → recapitulação → confirmação) ----------
  function mostrarPasso(idPasso) {
    ["passo-carrinho", "passo-recapitulacao", "passo-confirmacao"].forEach((id) => {
      document.getElementById(id).hidden = id !== idPasso;
    });
    document.getElementById("conteudo-principal").scrollIntoView({ block: "start" });
  }

  function renderizarRecapitulacao() {
    const itens = CarrinhoDados.obterCarrinho();
    const lista = document.getElementById("recapitulacao-lista");

    lista.innerHTML = "";
    itens.forEach((item) => {
      const linha = document.createElement("div");
      linha.className = "recapitulacao__item";
      linha.innerHTML = `
        <span>
          <span class="recapitulacao__item-nome">${item.nome}</span>
          <span class="recapitulacao__item-detalhe">${item.quantidade} × ${formatarPreco(item.preco)}</span>
        </span>
        <span class="recapitulacao__item-subtotal">${formatarPreco(item.preco * item.quantidade)}</span>
      `;
      lista.appendChild(linha);
    });

    document.getElementById("recapitulacao-total").textContent = formatarPreco(CarrinhoDados.totalValor(itens));
  }

  // ---------- Confirmação do carrinho no backend ----------
  async function finalizarPedido(itens, total) {
    if (!itens.length || total <= 0) {
      throw new Error("O carrinho está vazio.");
    }

    const usuarioId = await obterUsuarioId();
    const carrinhos = await requisitar("/carrinho");
    const carrinhoExistente = carrinhos.find(
      (carrinho) => Number(carrinho.usuarioId) === usuarioId
    );
    const payload = { usuarioId, status: "finalizado" };

    // A API atual ainda não expõe endpoints de item_carrinho.
    // Por isso os itens continuam no navegador e o servidor registra
    // apenas a criação/finalização do carrinho do usuário.
    return requisitar(
      carrinhoExistente ? `/carrinho/${carrinhoExistente.id}` : "/carrinho",
      {
        method: carrinhoExistente ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderizarCarrinho();

    document.getElementById("botao-comprar").addEventListener("click", function () {
      renderizarRecapitulacao();
      mostrarPasso("passo-recapitulacao");
    });

    document.getElementById("botao-voltar-carrinho").addEventListener("click", function () {
      mostrarPasso("passo-carrinho");
    });

    document.getElementById("botao-confirmar-compra").addEventListener("click", async function () {
      const itens = CarrinhoDados.obterCarrinho();
      const total = CarrinhoDados.totalValor(itens);

      const botao = this;
      botao.disabled = true;
      botao.textContent = "Confirmando...";

      try {
        await finalizarPedido(itens, total);
        CarrinhoDados.limparCarrinho();
        mostrarPasso("passo-confirmacao");
      } catch (erro) {
        console.error("Não foi possível finalizar a compra.", erro);
        alert("Não foi possível finalizar a compra. Tente novamente.");
      } finally {
        botao.disabled = false;
        botao.textContent = "Confirmar compra";
      }
    });
  });
})();
