/* =========================================================
   PRODUTO.JS
   Controla a página de detalhe de um produto (produto.html?id=N):
   - Carrega o produto e mostra descrição completa
   - Adicionar ao carrinho
   - Avaliar (1 a 5 estrelas, salvo no navegador)
   - Favoritar (salvo no navegador)
   - Compartilhar o link da página do produto
   - Lista produtos relacionados (mesma categoria ou nome parecido)

   Usa js/produtos-dados.js como fonte dos produtos e
   js/carrinho-dados.js para o carrinho.
   ========================================================= */

(function () {
    "use strict";

    const CHAVE_FAVORITOS = "produtos-favoritos";
    const CHAVE_AVALIACOES = "produtos-avaliacoes";

    function idDaUrl() {
        const parametros = new URLSearchParams(window.location.search);
        return parametros.get("id");
    }

    function formatarPreco(valor) {
        return ProdutosDados.formatarPreco(valor);
    }

    // ---------- Favoritos (localStorage) ----------
    function obterFavoritos() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || [];
        } catch (erro) {
            return [];
        }
    }

    function alternarFavorito(id) {
        let favoritos = obterFavoritos();
        const jaFavoritado = favoritos.includes(id);
        favoritos = jaFavoritado ? favoritos.filter((f) => f !== id) : [...favoritos, id];
        localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
        return !jaFavoritado;
    }

    // ---------- Avaliações (localStorage, simulação simples) ----------
    function obterAvaliacoes() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_AVALIACOES)) || {};
        } catch (erro) {
            return {};
        }
    }

    function salvarAvaliacao(id, nota) {
        const avaliacoes = obterAvaliacoes();
        avaliacoes[id] = nota;
        localStorage.setItem(CHAVE_AVALIACOES, JSON.stringify(avaliacoes));
    }

    function seloEstoqueTexto(produto) {
        if (produto.status === "inativo") return { classe: "selo--inativo", texto: "Indisponível" };
        if (produto.estoque > 0 && produto.estoque <= 5) return { classe: "selo--baixo-estoque", texto: "Últimas unidades" };
        return { classe: "selo--ativo", texto: "Em estoque" };
    }

    function criarCartaoRelacionado(produto) {
        const cartao = document.createElement("a");
        cartao.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
        cartao.className = "cartao-produto";
        cartao.style.textDecoration = "none";
        cartao.setAttribute("aria-label", `Ver detalhes de ${produto.nome}, ${formatarPreco(produto.preco)}`);
        const selo = seloEstoqueTexto(produto);
        cartao.innerHTML = `
      <div class="cartao-produto__imagem">
        ${produto.imagemUrl ? `<img src="${produto.imagemUrl}" alt="${produto.nome}" />` : "📦"}
      </div>
      <div class="cartao-produto__corpo">
        <p class="cartao-produto__categoria">${produto.categoria}</p>
        <h3 class="cartao-produto__nome">${produto.nome}</h3>
        <span class="selo ${selo.classe}">${selo.texto}</span>
        <p class="cartao-produto__preco">${formatarPreco(produto.preco)}</p>
      </div>
    `;
        const imagem = cartao.querySelector(".cartao-produto__imagem img");
        imagem?.addEventListener("error", () => {
            imagem.parentElement.textContent = "📦";
        }, { once: true });
        return cartao;
    }

    function mostrarMensagem(elementoId, texto, duracaoMs) {
        const elemento = document.getElementById(elementoId);
        elemento.textContent = texto;
        if (duracaoMs) {
            setTimeout(() => {
                if (elemento.textContent === texto) elemento.textContent = "";
            }, duracaoMs);
        }
    }

    function renderizarGaleria(produto) {
        const imagemPrincipal = document.getElementById("produto-imagem");
        const gradeMiniaturas = document.getElementById("produto-miniaturas");
        const imagens = Array.isArray(produto.imagens) ? produto.imagens : [];

        imagemPrincipal.innerHTML = "";
        gradeMiniaturas.innerHTML = "";

        if (imagens.length === 0) {
            const vazio = document.createElement("span");
            vazio.className = "produto-imagem-vazia";
            vazio.setAttribute("aria-hidden", "true");
            vazio.textContent = "📦";
            imagemPrincipal.appendChild(vazio);
            gradeMiniaturas.hidden = true;
            return;
        }

        gradeMiniaturas.hidden = false;
        const botoes = [];

        function exibirImagem(imagem, indice) {
            imagemPrincipal.innerHTML = "";
            const foto = document.createElement("img");
            foto.alt = `${produto.nome}, imagem ${indice + 1}`;
            foto.addEventListener("error", () => {
                if (!foto.isConnected) return;
                imagemPrincipal.innerHTML = "";
                const vazio = document.createElement("span");
                vazio.className = "produto-imagem-vazia";
                vazio.setAttribute("aria-hidden", "true");
                vazio.textContent = "📦";
                imagemPrincipal.appendChild(vazio);
            }, { once: true });
            foto.src = imagem.url;
            imagemPrincipal.appendChild(foto);

            botoes.forEach((botao, botaoIndice) => {
                const selecionado = botaoIndice === indice;
                botao.classList.toggle("selecionada", selecionado);
                botao.setAttribute("aria-current", selecionado ? "true" : "false");
            });
        }

        imagens.forEach((imagem, indice) => {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "produto-miniatura";
            botao.setAttribute("aria-label", `Exibir imagem ${indice + 1} de ${produto.nome}`);

            const foto = document.createElement("img");
            foto.alt = "";
            foto.addEventListener("error", () => {
                foto.remove();
                botao.textContent = "📦";
                botao.classList.add("sem-imagem");
            }, { once: true });
            foto.src = imagem.url;
            botao.appendChild(foto);
            botao.addEventListener("click", () => exibirImagem(imagem, indice));

            botoes.push(botao);
            gradeMiniaturas.appendChild(botao);
        });

        const indicePrincipal = Math.max(
            0,
            imagens.findIndex((imagem) => imagem.principal)
        );
        exibirImagem(imagens[indicePrincipal], indicePrincipal);
    }

    async function iniciar() {
        const id = idDaUrl();
        const carregando = document.getElementById("estado-carregando");
        const naoEncontrado = document.getElementById("estado-nao-encontrado");
        const conteudo = document.getElementById("conteudo-produto");

        document.getElementById("contador-carrinho").textContent = `(${CarrinhoDados.totalItens()})`;

        if (!id) {
            carregando.hidden = true;
            naoEncontrado.hidden = false;
            return;
        }

        const [produto, todosProdutos] = await Promise.all([
            ProdutosDados.obterProdutoPorId(id),
            ProdutosDados.obterProdutos(),
        ]);

        if (!produto) {
            carregando.hidden = true;
            naoEncontrado.hidden = false;
            return;
        }

        // ---------- Preenche os dados do produto ----------
        document.title = `${produto.nome} — Pibble Store`;
        document.getElementById("trilha-categoria").textContent = produto.categoria;
        document.getElementById("produto-categoria").textContent = produto.categoria;
        document.getElementById("produto-nome").textContent = produto.nome;
        document.getElementById("produto-preco").textContent = formatarPreco(produto.preco);
        document.getElementById("produto-descricao").textContent = produto.descricao;

        renderizarGaleria(produto);

        const selo = seloEstoqueTexto(produto);
        const seloElemento = document.getElementById("produto-selo-estoque");
        seloElemento.className = `selo ${selo.classe}`;
        seloElemento.textContent = selo.texto;

        const media = produto.avaliacaoMedia || 0;
        const totalAvaliacoes = produto.totalAvaliacoes || 0;
        document.getElementById("produto-estrelas").textContent = "★".repeat(Math.round(media)) + "☆".repeat(5 - Math.round(media));
        document.getElementById("produto-avaliacao-texto").textContent = `${media.toFixed(1)} (${totalAvaliacoes} avaliações)`;

        const campoQuantidade = document.getElementById("produto-quantidade");
        const botaoAdicionar = document.getElementById("botao-adicionar-carrinho");
        const indisponivel = produto.status === "inativo" || produto.estoque <= 0;
        campoQuantidade.max = String(Math.max(1, produto.estoque));
        campoQuantidade.disabled = indisponivel;
        botaoAdicionar.disabled = indisponivel;
        if (indisponivel) botaoAdicionar.textContent = "Produto indisponível";

        // ---------- Adicionar ao carrinho ----------
        botaoAdicionar.addEventListener("click", function () {
            const quantidadeInformada = Math.max(1, parseInt(campoQuantidade.value, 10) || 1);
            const quantidade = Math.min(quantidadeInformada, produto.estoque);
            campoQuantidade.value = String(quantidade);
            CarrinhoDados.adicionarAoCarrinho(produto, quantidade);
            document.getElementById("contador-carrinho").textContent = `(${CarrinhoDados.totalItens()})`;
            mostrarMensagem("mensagem-status", `${produto.nome} adicionado ao carrinho.`, 3000);
        });

        // ---------- Favoritar ----------
        const botaoFavoritar = document.getElementById("botao-favoritar");
        function atualizarBotaoFavoritar() {
            const favoritado = obterFavoritos().includes(produto.id);
            botaoFavoritar.classList.toggle("ativo", favoritado);
            botaoFavoritar.setAttribute("aria-pressed", String(favoritado));
            botaoFavoritar.innerHTML = favoritado
                ? '<span aria-hidden="true">♥</span> Favoritado'
                : '<span aria-hidden="true">♡</span> Favoritar';
        }
        atualizarBotaoFavoritar();

        botaoFavoritar.addEventListener("click", function () {
            const agoraFavoritado = alternarFavorito(produto.id);
            atualizarBotaoFavoritar();
            mostrarMensagem(
                "mensagem-status",
                agoraFavoritado ? "Produto adicionado aos favoritos." : "Produto removido dos favoritos.",
                3000
            );
        });

        // ---------- Compartilhar ----------
        document.getElementById("botao-compartilhar").addEventListener("click", async function () {
            const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(produto.id)}`;

            if (navigator.share) {
                try {
                    await navigator.share({ title: produto.nome, text: `Confira ${produto.nome} na Pibble Store`, url });
                    return;
                } catch (erro) {
                    // Usuário cancelou o compartilhamento — não faz nada.
                    return;
                }
            }

            try {
                await navigator.clipboard.writeText(url);
                mostrarMensagem("mensagem-status", "Link copiado para a área de transferência.", 3000);
            } catch (erro) {
                mostrarMensagem("mensagem-status", url, 8000);
            }
        });

        // ---------- Avaliar ----------
        const botoesEstrela = Array.from(document.querySelectorAll("#selecao-estrelas button"));
        const avaliacoes = obterAvaliacoes();
        const notaSalva = avaliacoes[produto.id] || 0;

        function pintarEstrelas(nota) {
            botoesEstrela.forEach((botao) => {
                const valor = Number(botao.dataset.nota);
                botao.classList.toggle("selecionada", valor <= nota);
                botao.setAttribute("aria-checked", String(valor === nota));
                botao.textContent = valor <= nota ? "★" : "☆";
            });
        }
        pintarEstrelas(notaSalva);
        if (notaSalva) mostrarMensagem("mensagem-avaliacao", `Sua avaliação: ${notaSalva} de 5 estrelas.`);

        botoesEstrela.forEach((botao) => {
            botao.addEventListener("click", function () {
                const nota = Number(botao.dataset.nota);
                salvarAvaliacao(produto.id, nota);
                pintarEstrelas(nota);
                mostrarMensagem("mensagem-avaliacao", `Obrigado! Você avaliou este produto com ${nota} de 5 estrelas.`);
            });
        });

        // ---------- Produtos relacionados (mesma categoria ou nome parecido) ----------
        const relacionados = ProdutosDados.obterRelacionados(produto, todosProdutos);
        const gradeRelacionados = document.getElementById("grade-relacionados");
        const relacionadosVazio = document.getElementById("relacionados-vazio");

        document.getElementById("titulo-relacionados").textContent =
            `Mais produtos de ${produto.categoria}`;
        gradeRelacionados.innerHTML = "";
        relacionados.forEach((item) => gradeRelacionados.appendChild(criarCartaoRelacionado(item)));
        relacionadosVazio.hidden = relacionados.length > 0;
        gradeRelacionados.hidden = relacionados.length === 0;

        carregando.hidden = true;
        conteudo.hidden = false;
    }

    document.addEventListener("DOMContentLoaded", function () {
        iniciar();

        document.querySelector(".cabecalho__busca").addEventListener("submit", function (evento) {
            // Deixa o formulário navegar normalmente para comprador.html?busca=...
            const campo = document.getElementById("campo-busca");
            if (!campo.value.trim()) evento.preventDefault();
        });
    });
})();
