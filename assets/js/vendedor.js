/* =========================================================
   VENDEDOR.JS
   Renderiza o painel de produtos do vendedor e a tela de
   gerenciamento (editar / excluir).

   >>> INTEGRAÇÃO COM O BACKEND <<<
   Integrado com GET/POST /produto, PATCH/DELETE /produto/{id},
   GET /vendedor e GET /imagens/produto/{produtoId}.

   A grade (js/vendedor.js) já está pronta para renderizar
   qualquer quantidade de produtos vindos do backend — o
   cartão "Adicionar novo produto" sempre aparece por último.
   ========================================================= */

(function () {
  "use strict";

  const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8080"
    : "https://loja-api-ut39.onrender.com";
  const CHAVE_VENDEDOR_ID = "loja-vendedor-id";

  let produtos = [];
  let produtoSelecionadoId = null;
  let vendedorIdAtual = null;
  let imagensEdicao = [];
  let contadorImagemTemporaria = 0;
  const TIPOS_IMAGEM_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
  const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024;
  const LIMITE_IMAGENS = 10;

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

  async function obterVendedorId() {
    if (vendedorIdAtual) return vendedorIdAtual;

    const parametros = new URLSearchParams(window.location.search);
    const candidato = parametros.get("vendedorId") || localStorage.getItem(CHAVE_VENDEDOR_ID);

    if (candidato && Number(candidato) > 0) {
      vendedorIdAtual = Number(candidato);
      localStorage.setItem(CHAVE_VENDEDOR_ID, String(vendedorIdAtual));
      return vendedorIdAtual;
    }

    window.location.assign("login.html");
    throw new Error("Faça login como vendedor para acessar esta área.");
  }

  async function obterImagemPrincipal(produtoId) {
    try {
      const imagens = await obterImagensProduto(produtoId);
      const principal = imagens.find((imagem) => imagem.principal) || imagens[0];
      return principal?.url || "";
    } catch (erro) {
      console.warn(`Não foi possível carregar a imagem do produto ${produtoId}.`, erro);
      return "";
    }
  }

  async function obterImagensProduto(produtoId) {
    return requisitar(`/imagens/produto/${encodeURIComponent(produtoId)}`);
  }

  function normalizarProduto(produto, imagemUrl = "") {
    const estoque = Number(produto.estoque) || 0;

    return {
      ...produto,
      preco: Number(produto.preco) || 0,
      estoque,
      categoria: produto.categoria || "Geral",
      descricao: produto.descricao || "",
      imagemUrl,
      status: produto.status === "disponivel" && estoque > 0 ? "ativo" : "inativo",
    };
  }

  // ---------- Produtos do vendedor fornecidos pela API ----------
  async function obterProdutos() {
    const vendedorId = await obterVendedorId();
    const todosProdutos = await requisitar("/produto");
    const produtosDoVendedor = todosProdutos.filter(
      (produto) => Number(produto.vendedorId) === vendedorId
    );

    return Promise.all(
      produtosDoVendedor.map(async (produto) => {
        const imagemUrl = await obterImagemPrincipal(produto.id);
        return normalizarProduto(produto, imagemUrl);
      })
    );
  }

  function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function seloEstoque(produto) {
    if (produto.status === "inativo") return '<span class="selo selo--inativo">Inativo</span>';
    if (produto.estoque > 0 && produto.estoque <= 5) return '<span class="selo selo--baixo-estoque">Estoque baixo</span>';
    return '<span class="selo selo--ativo">Ativo</span>';
  }

  function criarCartaoProduto(produto) {
    const cartao = document.createElement("button");
    cartao.type = "button";
    cartao.className = "cartao-produto";
    cartao.setAttribute("aria-label", `Gerenciar produto ${produto.nome}`);
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
    cartao.addEventListener("click", () => abrirGerenciamento(produto.id));
    return cartao;
  }

  function criarCartaoAdicionar() {
    const cartao = document.createElement("button");
    cartao.type = "button";
    cartao.className = "cartao-produto cartao-adicionar";
    cartao.setAttribute("aria-label", "Adicionar novo produto");
    cartao.innerHTML = `<span class="icone-mais" aria-hidden="true">+</span> Adicionar novo produto`;
    cartao.addEventListener("click", () => abrirGerenciamento(null));
    return cartao;
  }

  function produtosFiltrados() {
    const status = document.getElementById("filtro-status").value;
    if (status === "todos") return produtos;
    return produtos.filter((p) => p.status === status);
  }

  function atualizarResumo() {
    document.getElementById("resumo-total").textContent = produtos.length;
    document.getElementById("resumo-ativos").textContent = produtos.filter((p) => p.status === "ativo").length;
    document.getElementById("resumo-baixo-estoque").textContent = produtos.filter((p) => p.estoque > 0 && p.estoque <= 5).length;
  }

  function renderizarGrade() {
    const grade = document.getElementById("grade-produtos");
    const estadoVazio = document.getElementById("estado-vazio");
    const contagem = document.getElementById("contagem-produtos");

    const lista = produtosFiltrados();
    grade.innerHTML = "";
    lista.forEach((produto) => grade.appendChild(criarCartaoProduto(produto)));
    grade.appendChild(criarCartaoAdicionar());

    estadoVazio.hidden = true; // o cartão de adicionar sempre garante conteúdo na grade
    contagem.textContent = `${lista.length} produto(s)`;
    atualizarResumo();
  }

  // ---------- Imagens do produto ----------
  function imagensVisiveis() {
    return imagensEdicao.filter((imagem) => !imagem.removida);
  }

  function definirMensagemImagens(mensagem = "", erro = false) {
    const elemento = document.getElementById("mensagem-imagens");
    elemento.textContent = mensagem;
    elemento.classList.toggle("erro", erro);
  }

  function garantirImagemPrincipal() {
    const visiveis = imagensVisiveis();
    const principais = visiveis.filter((imagem) => imagem.principal);

    if (principais.length === 0 && visiveis.length > 0) {
      visiveis[0].principal = true;
    } else if (principais.length > 1) {
      visiveis.forEach((imagem) => {
        imagem.principal = imagem.chave === principais[0].chave;
      });
    }
  }

  function definirImagemPrincipal(chave) {
    imagensVisiveis().forEach((imagem) => {
      imagem.principal = imagem.chave === chave;
    });
    renderizarMiniaturas();
  }

  function removerImagemEdicao(chave) {
    const imagem = imagensEdicao.find((item) => item.chave === chave);
    if (!imagem) return;

    if (imagem.arquivo) {
      URL.revokeObjectURL(imagem.url);
      imagensEdicao = imagensEdicao.filter((item) => item.chave !== chave);
    } else {
      imagem.removida = true;
      imagem.principal = false;
    }

    garantirImagemPrincipal();
    renderizarMiniaturas();
    definirMensagemImagens("Imagem removida. Salve o produto para confirmar.");
  }

  function renderizarMiniaturas() {
    const grade = document.getElementById("grade-miniaturas");
    grade.innerHTML = "";
    garantirImagemPrincipal();

    imagensVisiveis().forEach((imagem, indice) => {
      const cartao = document.createElement("div");
      cartao.className = `miniatura-produto${imagem.principal ? " principal" : ""}`;

      const foto = document.createElement("img");
      foto.src = imagem.url;
      foto.alt = imagem.arquivo?.name || `Imagem ${indice + 1} do produto`;
      cartao.appendChild(foto);

      const botaoPrincipal = document.createElement("button");
      botaoPrincipal.type = "button";
      botaoPrincipal.className = "miniatura-produto__principal";
      botaoPrincipal.setAttribute("aria-pressed", String(imagem.principal));
      botaoPrincipal.setAttribute(
        "aria-label",
        imagem.principal
          ? `${foto.alt} é a imagem principal`
          : `Definir ${foto.alt} como imagem principal`
      );
      botaoPrincipal.addEventListener("click", () => definirImagemPrincipal(imagem.chave));
      cartao.appendChild(botaoPrincipal);

      if (imagem.principal) {
        const selo = document.createElement("span");
        selo.className = "miniatura-produto__selo";
        selo.textContent = "Principal";
        cartao.appendChild(selo);
      }

      const botaoRemover = document.createElement("button");
      botaoRemover.type = "button";
      botaoRemover.className = "miniatura-produto__remover";
      botaoRemover.textContent = "×";
      botaoRemover.setAttribute("aria-label", `Remover ${foto.alt}`);
      botaoRemover.addEventListener("click", () => removerImagemEdicao(imagem.chave));
      cartao.appendChild(botaoRemover);

      grade.appendChild(cartao);
    });
  }

  function limparImagensEdicao() {
    imagensEdicao.forEach((imagem) => {
      if (imagem.arquivo) URL.revokeObjectURL(imagem.url);
    });
    imagensEdicao = [];
    renderizarMiniaturas();
    definirMensagemImagens();
  }

  function adicionarArquivos(arquivosRecebidos) {
    const arquivos = Array.from(arquivosRecebidos);
    const chavesExistentes = new Set(
      imagensEdicao
        .filter((imagem) => imagem.arquivo)
        .map((imagem) => `${imagem.arquivo.name}|${imagem.arquivo.size}|${imagem.arquivo.lastModified}`)
    );
    const erros = [];
    let adicionadas = 0;

    for (const arquivo of arquivos) {
      const chaveArquivo = `${arquivo.name}|${arquivo.size}|${arquivo.lastModified}`;

      if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
        erros.push(`${arquivo.name}: formato não aceito`);
        continue;
      }
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
        erros.push(`${arquivo.name}: ultrapassa 10 MB`);
        continue;
      }
      if (chavesExistentes.has(chaveArquivo)) {
        erros.push(`${arquivo.name}: já foi adicionado`);
        continue;
      }
      if (imagensVisiveis().length >= LIMITE_IMAGENS) {
        erros.push(`Limite de ${LIMITE_IMAGENS} imagens atingido`);
        break;
      }

      contadorImagemTemporaria += 1;
      imagensEdicao.push({
        chave: `nova-${contadorImagemTemporaria}`,
        id: null,
        url: URL.createObjectURL(arquivo),
        arquivo,
        principal: imagensVisiveis().length === 0,
        ordem: imagensVisiveis().length,
        removida: false,
      });
      chavesExistentes.add(chaveArquivo);
      adicionadas += 1;
    }

    renderizarMiniaturas();
    const resumo = adicionadas ? `${adicionadas} imagem(ns) adicionada(s).` : "";
    definirMensagemImagens([resumo, ...erros].filter(Boolean).join(" "), erros.length > 0);
  }

  async function carregarImagensEdicao(produtoId) {
    const imagens = await obterImagensProduto(produtoId);
    imagensEdicao = imagens.map((imagem, indice) => ({
      chave: `existente-${imagem.id}`,
      id: imagem.id,
      url: imagem.url,
      arquivo: null,
      principal: Boolean(imagem.principal),
      ordem: Number.isFinite(Number(imagem.ordem)) ? Number(imagem.ordem) : indice,
      removida: false,
    }));
    renderizarMiniaturas();
  }

  // ---------- Tela de gerenciamento (editar / novo) ----------
  async function abrirGerenciamento(id) {
    produtoSelecionadoId = id;
    const produto = produtos.find((p) => p.id === id) || {
      nome: "", categoria: "", preco: "", estoque: "", status: "ativo", descricao: "", imagemUrl: "",
    };

    document.getElementById("detalhe-titulo").textContent = id ? "Gerenciar produto" : "Novo produto";
    document.getElementById("campo-nome").value = produto.nome;
    document.getElementById("campo-categoria").value = produto.categoria;
    document.getElementById("campo-preco").value = produto.preco;
    document.getElementById("campo-estoque").value = produto.estoque;
    document.getElementById("campo-status").value = produto.status;
    document.getElementById("campo-descricao").value = produto.descricao;

    const imagem = document.getElementById("detalhe-imagem") || { innerHTML: "" };
    imagem.innerHTML = produto.imagemUrl ? `<img src="${produto.imagemUrl}" alt="${produto.nome}" />` : "📦";

    document.getElementById("excluir-produto").style.display = id ? "inline-flex" : "none";

    limparImagensEdicao();
    document.getElementById("sobreposicao-detalhe").classList.add("aberta");
    document.getElementById("campo-nome").focus();

    if (id) {
      definirMensagemImagens("Carregando imagens...");
      try {
        await carregarImagensEdicao(id);
        definirMensagemImagens(
          imagensVisiveis().length
            ? `${imagensVisiveis().length} imagem(ns) cadastrada(s).`
            : "Este produto ainda não tem imagens."
        );
      } catch (erro) {
        console.error("Não foi possível carregar as imagens do produto.", erro);
        definirMensagemImagens("Não foi possível carregar as imagens.", true);
      }
    }
  }

  function fecharGerenciamento() {
    document.getElementById("sobreposicao-detalhe").classList.remove("aberta");
    limparImagensEdicao();
    produtoSelecionadoId = null;
  }

  // ---------- Ações de salvar / excluir na API ----------
  async function salvarProduto(produto) {
    const vendedorId = await obterVendedorId();
    const produtoExistente = produtos.find((item) => item.id === produto.id);
    const payload = {
      nome: produto.nome,
      categoria: produto.categoria,
      preco: produto.preco,
      estoque: produto.status === "inativo" ? 0 : produto.estoque,
      descricao: produto.descricao,
      vendedorId,
    };

    const salvo = await requisitar(produto.id ? `/produto/${produto.id}` : "/produto", {
      method: produto.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const produtoNormalizado = normalizarProduto(salvo, produtoExistente?.imagemUrl || "");

    if (produto.id) {
      const indice = produtos.findIndex((p) => p.id === produto.id);
      produtos[indice] = produtoNormalizado;
    } else {
      produtos.push(produtoNormalizado);
    }
    return produtoNormalizado;
  }

  async function sincronizarImagens(produtoId) {
    const removidas = imagensEdicao.filter((imagem) => imagem.removida && imagem.id);
    for (const imagem of removidas) {
      await requisitar(`/imagens/${encodeURIComponent(imagem.id)}`, { method: "DELETE" });
      imagensEdicao = imagensEdicao.filter((item) => item.chave !== imagem.chave);
    }

    const visiveis = imagensVisiveis();
    for (let indice = 0; indice < visiveis.length; indice += 1) {
      const imagem = visiveis[indice];
      imagem.ordem = indice;
      if (!imagem.arquivo || imagem.id) continue;

      const dados = new FormData();
      dados.append("produtoId", String(produtoId));
      dados.append("foto", imagem.arquivo);
      dados.append("ordem", String(indice));
      dados.append("principal", String(imagem.principal));

      const enviada = await requisitar("/imagens", {
        method: "POST",
        body: dados,
      });
      imagem.id = enviada.id;
    }

    garantirImagemPrincipal();
    const principal = imagensVisiveis().find((imagem) => imagem.principal);
    if (principal?.id) {
      await requisitar(`/imagens/${encodeURIComponent(principal.id)}/principal`, {
        method: "PATCH",
      });
    }

    imagensEdicao.forEach((imagem) => {
      if (imagem.arquivo) URL.revokeObjectURL(imagem.url);
    });
    await carregarImagensEdicao(produtoId);
    return imagensVisiveis();
  }

  async function excluirProduto(id) {
    await requisitar(`/produto/${encodeURIComponent(id)}`, { method: "DELETE" });
    produtos = produtos.filter((p) => p.id !== id);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      produtos = await obterProdutos();
    } catch (erro) {
      console.error("Não foi possível carregar os produtos do vendedor.", erro);
      document.getElementById("contagem-produtos").textContent = "Falha ao carregar produtos";
    }
    renderizarGrade();

    document.getElementById("filtro-status").addEventListener("change", renderizarGrade);

    const zonaUpload = document.getElementById("zona-upload-imagens");
    const campoImagens = document.getElementById("campo-imagens");

    zonaUpload.addEventListener("click", (evento) => {
      if (evento.target !== campoImagens) campoImagens.click();
    });
    zonaUpload.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        campoImagens.click();
      }
    });
    ["dragenter", "dragover"].forEach((tipoEvento) => {
      zonaUpload.addEventListener(tipoEvento, (evento) => {
        evento.preventDefault();
        zonaUpload.classList.add("arrastando");
      });
    });
    ["dragleave", "drop"].forEach((tipoEvento) => {
      zonaUpload.addEventListener(tipoEvento, (evento) => {
        evento.preventDefault();
        zonaUpload.classList.remove("arrastando");
      });
    });
    zonaUpload.addEventListener("drop", (evento) => {
      if (evento.dataTransfer?.files?.length) {
        adicionarArquivos(evento.dataTransfer.files);
      }
    });
    campoImagens.addEventListener("change", () => {
      adicionarArquivos(campoImagens.files);
      campoImagens.value = "";
    });

    // Delegação de evento: QUALQUER botão marcado com [data-fechar-modal]
    // fecha o pop-up, mesmo que novos botões sejam adicionados depois.
    document.addEventListener("click", function (evento) {
      if (evento.target.closest("[data-fechar-modal]")) {
        fecharGerenciamento();
      }
    });
    document.getElementById("sobreposicao-detalhe").addEventListener("click", function (evento) {
      if (evento.target === this) fecharGerenciamento();
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") fecharGerenciamento();
    });

    document.getElementById("salvar-produto").addEventListener("click", async function () {
      const nome = document.getElementById("campo-nome").value.trim();
      if (!nome) {
        document.getElementById("campo-nome").focus();
        return;
      }

      const produto = {
        id: produtoSelecionadoId,
        nome,
        categoria: document.getElementById("campo-categoria").value.trim() || "Geral",
        preco: parseFloat(document.getElementById("campo-preco").value) || 0,
        estoque: parseInt(document.getElementById("campo-estoque").value, 10) || 0,
        status: document.getElementById("campo-status").value,
        descricao: document.getElementById("campo-descricao").value.trim(),
      };

      const botaoSalvar = this;
      const textoOriginal = botaoSalvar.textContent;
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
      definirMensagemImagens("Salvando produto e imagens...");

      try {
        const produtoSalvo = await salvarProduto(produto);
        produtoSelecionadoId = produtoSalvo.id;
        const imagensSalvas = await sincronizarImagens(produtoSalvo.id);
        const imagemPrincipal = imagensSalvas.find((imagem) => imagem.principal) || imagensSalvas[0];
        const indiceProduto = produtos.findIndex((item) => item.id === produtoSalvo.id);
        produtos[indiceProduto] = {
          ...produtoSalvo,
          imagemUrl: imagemPrincipal?.url || "",
        };
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoOriginal;
        renderizarGrade();
        fecharGerenciamento();
      } catch (erro) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoOriginal;
        definirMensagemImagens("Não foi possível salvar todas as alterações. Tente novamente.", true);
        console.error("Não foi possível salvar o produto.", erro);
        alert("Não foi possível salvar o produto. Tente novamente.");
      }
    });

    document.getElementById("excluir-produto").addEventListener("click", async function () {
      if (!produtoSelecionadoId) return;
      const confirmou = confirm("Tem certeza que deseja excluir este produto?");
      if (!confirmou) return;
      try {
        await excluirProduto(produtoSelecionadoId);
        renderizarGrade();
        fecharGerenciamento();
      } catch (erro) {
        console.error("Não foi possível excluir o produto.", erro);
        alert("Não foi possível excluir o produto. Tente novamente.");
      }
    });
  });
})();
