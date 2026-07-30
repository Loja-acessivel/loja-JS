/* =========================================================
   Funções compartilhadas para ler/gravar o carrinho de compras.
   O carrinho fica salvo no navegador (localStorage) para que
   os itens adicionados na vitrine (comprador.html) apareçam
   na página do carrinho (carrinho.html).

   Cada item salvo segue o formato:
     {
       id: 1,
       nome: "Nome do produto",
       preco: 99.90,
       imagemUrl: "",
       quantidade: 2
     }

   >>> INTEGRAÇÃO COM O BACKEND <<<
   A API atual ainda não expõe endpoints de item_carrinho.
   Por isso os itens permanecem locais; carrinho.js sincroniza
   somente a criação/finalização do carrinho com o servidor.
   ========================================================= */

const CarrinhoDados = (function () {
    "use strict";

    const CHAVE = "carrinho-itens";

    function obterCarrinho() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE)) || [];
        } catch (erro) {
            return [];
        }
    }

    function salvarCarrinho(itens) {
        localStorage.setItem(CHAVE, JSON.stringify(itens));
    }

    function adicionarAoCarrinho(produto, quantidade) {
        const itens = obterCarrinho();
        const existente = itens.find((item) => item.id === produto.id);

        if (existente) {
            existente.quantidade += quantidade;
        } else {
            itens.push({
                id: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                imagemUrl: produto.imagemUrl || "",
                quantidade,
            });
        }

        salvarCarrinho(itens);
        return itens;
    }

    function atualizarQuantidade(id, quantidade) {
        let itens = obterCarrinho();
        if (quantidade <= 0) {
            itens = itens.filter((item) => item.id !== id);
        } else {
            const item = itens.find((i) => i.id === id);
            if (item) item.quantidade = quantidade;
        }
        salvarCarrinho(itens);
        return itens;
    }

    function removerDoCarrinho(id) {
        const itens = obterCarrinho().filter((item) => item.id !== id);
        salvarCarrinho(itens);
        return itens;
    }

    function limparCarrinho() {
        salvarCarrinho([]);
    }

    function totalItens(itens) {
        return (itens || obterCarrinho()).reduce((soma, item) => soma + item.quantidade, 0);
    }

    function totalValor(itens) {
        return (itens || obterCarrinho()).reduce((soma, item) => soma + item.quantidade * item.preco, 0);
    }

    return {
        obterCarrinho,
        salvarCarrinho,
        adicionarAoCarrinho,
        atualizarQuantidade,
        removerDoCarrinho,
        limparCarrinho,
        totalItens,
        totalValor,
    };
})();
