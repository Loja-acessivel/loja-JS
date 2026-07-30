/* =========================================================
   PRODUTOS-DADOS.JS
   Fonte única dos produtos exibidos para o comprador
   (vitrine + página de detalhe do produto).

   >>> INTEGRAÇÃO COM O BACKEND <<<
   Integrado com GET /produto, GET /produto/{id} e
   GET /imagens/produto/{produtoId}.

   Cada produto deve seguir este formato:
     {
       id: 1,
       nome: "Nome do produto",
       categoria: "Categoria",
       preco: 99.90,
       descricao: "Texto descritivo do produto.",
       imagemUrl: "",          // opcional — "" usa o ícone padrão
       status: "ativo",        // "ativo" | "inativo"
       estoque: 12,
       avaliacaoMedia: 4.5,    // opcional — 0 a 5
       totalAvaliacoes: 128    // opcional
     }
   ========================================================= */

const ProdutosDados = (function () {
    "use strict";

    const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://127.0.0.1:8080"
        : "https://loja-api-ut39.onrender.com";

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

    async function obterImagemPrincipal(produtoId) {
        try {
            const imagens = await requisitar(`/imagens/produto/${encodeURIComponent(produtoId)}`);
            const principal = imagens.find((imagem) => imagem.principal) || imagens[0];
            return principal?.url || "";
        } catch (erro) {
            console.warn(`Não foi possível carregar a imagem do produto ${produtoId}.`, erro);
            return "";
        }
    }

    function normalizarProduto(produto, imagemUrl) {
        const estoque = Number(produto.estoque) || 0;

        return {
            ...produto,
            preco: Number(produto.preco) || 0,
            estoque,
            categoria: produto.categoria || "Geral",
            descricao: produto.descricao || "",
            imagemUrl,
            status: produto.status === "disponivel" && estoque > 0 ? "ativo" : "inativo",
            avaliacaoMedia: Number(produto.avaliacaoMedia) || 0,
            totalAvaliacoes: Number(produto.totalAvaliacoes) || 0,
        };
    }

    async function obterProdutos() {
        const produtos = await requisitar("/produto");

        return Promise.all(
            produtos.map(async (produto) => {
                const imagemUrl = await obterImagemPrincipal(produto.id);
                return normalizarProduto(produto, imagemUrl);
            })
        );
    }

    function formatarPreco(valor) {
        return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    async function obterProdutoPorId(id) {
        try {
            const produto = await requisitar(`/produto/${encodeURIComponent(id)}`);
            const imagemUrl = await obterImagemPrincipal(produto.id);
            return normalizarProduto(produto, imagemUrl);
        } catch (erro) {
            if (erro.message.includes("Erro 404")) return null;
            throw erro;
        }
    }

    // Produtos relacionados: mesma categoria OU nome parecido
    // (ex.: se o produto atual é "Garrafa Térmica 1L", qualquer
    // produto cujo nome contenha "garrafa" também é considerado).
    function obterRelacionados(produtoAtual, produtos) {
        const primeiraPalavra = produtoAtual.nome.split(" ")[0].toLowerCase();

        return produtos.filter((p) => {
            if (p.id === produtoAtual.id) return false;
            if (p.status !== "ativo") return false;
            const mesmaCategoria = p.categoria === produtoAtual.categoria;
            const nomeParecido = p.nome.toLowerCase().includes(primeiraPalavra);
            return mesmaCategoria || nomeParecido;
        });
    }

    return { obterProdutos, obterProdutoPorId, obterRelacionados, formatarPreco };
})();
