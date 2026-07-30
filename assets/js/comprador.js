/* =========================================================
   COMPRADOR.JS
   Renderiza a vitrine de produtos e a tela de detalhe.

   >>> INTEGRAÇÃO COM O BACKEND <<<
   A função obterProdutos() usa ProdutosDados, integrado com
   os endpoints de produtos e imagens da API.

   O restante do arquivo já está pronto para funcionar com
   qualquer quantidade de produtos retornada pelo backend,
   desde que cada item siga este formato:

     {
       id: 1,
       nome: "Nome do produto",
       categoria: "Categoria",
       preco: 99.90,
       descricao: "Texto descritivo do produto.",
       imagemUrl: "",      // opcional — deixe "" para usar o ícone padrão
       status: "ativo",    // "ativo" | "inativo"
       estoque: 12
     }
   ========================================================= */

(function () {
  "use strict";

  // ---------- Produtos fornecidos pela API ----------
  async function obterProdutos() {
    return ProdutosDados.obterProdutos();
  }

  let produtos = [];

  function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function seloEstoque(produto) {
    if (produto.status === "inativo") return '<span class="selo selo--inativo">Indisponível</span>';
    if (produto.estoque > 0 && produto.estoque <= 5) return '<span class="selo selo--baixo-estoque">Últimas unidades</span>';
    return '<span class="selo selo--ativo">Em estoque</span>';
  }

  function criarCartaoProduto(produto) {
    const cartao = document.createElement("a");
    cartao.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
    cartao.className = "cartao-produto";
    cartao.setAttribute("aria-label", `Ver detalhes de ${produto.nome}, ${formatarPreco(produto.preco)}`);
    cartao.innerHTML = `
      <div class="cartao-produto__imagem">
        ${produto.imagemUrl ? `<img src="${produto.imagemUrl}" alt="${produto.nome}" />` : "📦"}
      </div>
      <div class="cartao-produto__corpo">
        <p class="cartao-produto__categoria">${produto.categoria}</p>
        <h3 class="cartao-produto__nome">${produto.nome}</h3>
        ${seloEstoque(produto)}
        <p class="cartao-produto__preco">${formatarPreco(produto.preco)}</p>
      </div>
    `;
    const imagem = cartao.querySelector(".cartao-produto__imagem img");
    imagem?.addEventListener("error", () => {
      imagem.parentElement.textContent = "📦";
    }, { once: true });
    return cartao;
  }

  function preencherFiltroCategorias() {
    const select = document.getElementById("filtro-categoria");
    const categorias = [...new Set(produtos.map((p) => p.categoria))];
    categorias.forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria;
      opcao.textContent = categoria;
      select.appendChild(opcao);
    });
  }

  function produtosFiltrados() {
    const categoria = document.getElementById("filtro-categoria").value;
    const ordenar = document.getElementById("filtro-ordenar").value;
    const termoBusca = document.getElementById("campo-busca").value.trim().toLowerCase();

    let lista = produtos.filter((p) => p.status === "ativo");

    if (categoria !== "todas") {
      lista = lista.filter((p) => p.categoria === categoria);
    }

    if (termoBusca) {
      lista = lista.filter((p) => p.nome.toLowerCase().includes(termoBusca));
    }

    switch (ordenar) {
      case "menor-preco":
        lista.sort((a, b) => a.preco - b.preco);
        break;
      case "maior-preco":
        lista.sort((a, b) => b.preco - a.preco);
        break;
      case "nome":
        lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        break;
    }

    return lista;
  }

  function renderizarGrade() {
    const grade = document.getElementById("grade-produtos");
    const estadoVazio = document.getElementById("estado-vazio");
    const contagem = document.getElementById("contagem-produtos");

    const lista = produtosFiltrados();
    grade.innerHTML = "";
    lista.forEach((produto) => grade.appendChild(criarCartaoProduto(produto)));

    estadoVazio.hidden = lista.length > 0;
    contagem.textContent = `${lista.length} produto(s)`;
  }

  function atualizarContadorCarrinho() {
    document.getElementById("contador-carrinho").textContent = `(${CarrinhoDados.totalItens()})`;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      produtos = await obterProdutos();
    } catch (erro) {
      console.error("Não foi possível carregar os produtos.", erro);
      document.getElementById("estado-vazio").hidden = false;
      document.getElementById("estado-vazio").textContent = "Não foi possível carregar os produtos da loja.";
      document.getElementById("contagem-produtos").textContent = "0 produto(s)";
      return;
    }

    preencherFiltroCategorias();
    renderizarGrade();
    atualizarContadorCarrinho();

    document.getElementById("filtro-categoria").addEventListener("change", renderizarGrade);
    document.getElementById("filtro-ordenar").addEventListener("change", renderizarGrade);
    document.getElementById("campo-busca").addEventListener("input", renderizarGrade);
    document.querySelector(".cabecalho__busca").addEventListener("submit", (e) => e.preventDefault());

  });
})();
