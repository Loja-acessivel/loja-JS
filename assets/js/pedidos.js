(function () {
  "use strict";

  const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8080"
    : "https://loja-api-ut39.onrender.com";
  const CHAVE_VENDEDOR_ID = "loja-vendedor-id";

  async function requisitar(caminho) {
    const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      headers: { Accept: "application/json" },
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`Erro ${resposta.status}: ${detalhe}`);
    }
    return resposta.json();
  }

  function obterVendedorId() {
    const parametros = new URLSearchParams(window.location.search);
    const candidato = parametros.get("vendedorId") || localStorage.getItem(CHAVE_VENDEDOR_ID);

    if (candidato && Number(candidato) > 0) {
      const vendedorId = Number(candidato);
      localStorage.setItem(CHAVE_VENDEDOR_ID, String(vendedorId));
      return vendedorId;
    }

    window.location.assign("login.html");
    throw new Error("Faça login como vendedor para visualizar os pedidos.");
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function textoStatus(status) {
    const textos = {
      recebido: "Aguardando contato",
      em_contato: "Em contato",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return textos[status] || status;
  }

  function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  function criarCartaoPedido(pedido) {
    const cartao = criarElemento("article", "pedido-vendedor");

    const cabecalho = criarElemento("header", "pedido-vendedor__cabecalho");
    const identificacao = document.createElement("div");
    identificacao.appendChild(criarElemento("h2", "", `Pedido #${pedido.id}`));
    identificacao.appendChild(criarElemento("p", "", pedido.criadoEm));

    const status = criarElemento(
      "span",
      `selo pedido-status pedido-status--${pedido.status}`,
      textoStatus(pedido.status)
    );
    cabecalho.append(identificacao, status);

    const contato = criarElemento("section", "pedido-vendedor__contato");
    contato.setAttribute("aria-label", "Contato do comprador");
    contato.appendChild(criarElemento("strong", "", pedido.compradorNome || "Comprador"));
    const email = criarElemento("a", "", pedido.compradorEmail);
    email.href = `mailto:${pedido.compradorEmail}`;
    contato.appendChild(email);
    if (pedido.compradorTelefone) {
      const telefone = criarElemento("a", "", pedido.compradorTelefone);
      telefone.href = `tel:${pedido.compradorTelefone.replace(/[^\d+]/g, "")}`;
      contato.appendChild(telefone);
    }
    if (pedido.compradorEndereco) {
      contato.appendChild(criarElemento("span", "", pedido.compradorEndereco));
    }

    const lista = criarElemento("ul", "pedido-vendedor__itens");
    const linha = document.createElement("li");
    const descricao = criarElemento("span");
    descricao.appendChild(criarElemento("strong", "", pedido.produtoNome));
    descricao.appendChild(criarElemento("small", "", `Produto #${pedido.produtoId}`));
    linha.append(descricao, criarElemento("strong", "", formatarPreco(pedido.total)));
    lista.appendChild(linha);

    const rodape = criarElemento("footer", "pedido-vendedor__rodape");
    rodape.append(
      criarElemento("span", "", "Total deste produto"),
      criarElemento("strong", "", formatarPreco(pedido.total))
    );

    cartao.append(cabecalho, contato, lista, rodape);
    return cartao;
  }

  function atualizarResumo(pedidos) {
    document.getElementById("resumo-pedidos-total").textContent = pedidos.length;
    document.getElementById("resumo-pedidos-recebidos").textContent =
      pedidos.filter((pedido) => pedido.status === "recebido").length;
    document.getElementById("resumo-pedidos-compradores").textContent =
      new Set(pedidos.map((pedido) => pedido.compradorId)).size;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const estado = document.getElementById("estado-pedidos");
    const lista = document.getElementById("lista-pedidos-vendedor");

    try {
      const vendedorId = obterVendedorId();
      const pedidos = await requisitar(`/pedido/vendedor/${encodeURIComponent(vendedorId)}`);
      atualizarResumo(pedidos);

      lista.innerHTML = "";
      pedidos.forEach((pedido) => lista.appendChild(criarCartaoPedido(pedido)));
      lista.hidden = pedidos.length === 0;
      estado.hidden = pedidos.length > 0;
      if (pedidos.length === 0) {
        estado.textContent = "Você ainda não recebeu pedidos.";
      }
    } catch (erro) {
      console.error("Não foi possível carregar os pedidos.", erro);
      estado.textContent = "Não foi possível carregar os pedidos. Tente novamente.";
    }
  });
})();
