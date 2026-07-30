/* =========================================================
   USUARIO.JS
   Preenche a página "Minha conta" com os dados do usuário.

   >>> INTEGRAÇÃO COM O BACKEND <<<
   Integrado com GET /usuario e GET /usuario/{id}.

   O restante do arquivo já está pronto para exibir qualquer
   usuário retornado pelo backend, desde que o objeto siga
   este formato (campos ausentes aparecem como "—"):

     {
       nome: "Nome completo",
       email: "email@exemplo.com",
       telefone: "(11) 99999-0000",
       tipoConta: "Comprador",     // ou "Vendedor"
       membroDesde: "2024-03-10",  // formato ISO (AAAA-MM-DD)
       status: "Ativo",
       fotoUrl: "",                 // opcional — deixe "" para usar as iniciais
       endereco: {
         rua: "Rua Exemplo, 123",
         bairro: "Centro",
         cidade: "São Paulo",
         estado: "SP",
         cep: "01000-000"
       }
     }
   ========================================================= */

(function () {
    "use strict";

    const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://127.0.0.1:8080"
        : "https://loja-api-ut39.onrender.com";
    const CHAVE_USUARIO_ID = "loja-usuario-id";

    async function requisitar(caminho) {
        const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
            headers: { Accept: "application/json" },
        });

        if (!resposta.ok) {
            const detalhe = await resposta.text();
            throw new Error(`Erro ${resposta.status} ao acessar ${caminho}: ${detalhe}`);
        }

        return resposta.json();
    }

    async function obterUsuarioId() {
        const parametros = new URLSearchParams(window.location.search);
        const candidato = parametros.get("usuarioId") || localStorage.getItem(CHAVE_USUARIO_ID);

        if (candidato && Number(candidato) > 0) {
            localStorage.setItem(CHAVE_USUARIO_ID, String(Number(candidato)));
            return Number(candidato);
        }

        window.location.assign("login.html");
        throw new Error("Faça login para acessar sua conta.");
    }

    // ---------- Dados do usuário fornecidos pela API ----------
    async function obterUsuario() {
        const usuarioId = await obterUsuarioId();
        const usuario = await requisitar(`/usuario/${encodeURIComponent(usuarioId)}`);
        const endereco = typeof usuario.endereco === "object"
            ? usuario.endereco
            : { rua: usuario.endereco || "" };

        return {
            nome: usuario.nome,
            email: usuario.email,
            telefone: usuario.telefone,
            tipoConta: "Comprador",
            membroDesde: usuario.criadoEm?.slice(0, 10),
            status: "Ativo",
            fotoUrl: "",
            endereco,
        };
    }

    function texto(valor) {
        return valor && String(valor).trim() ? valor : "—";
    }

    function formatarData(valorIso) {
        if (!valorIso) return "—";
        const data = new Date(valorIso + "T00:00:00");
        if (isNaN(data.getTime())) return "—";
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    function iniciais(nome) {
        if (!nome) return "?";
        const partes = nome.trim().split(/\s+/);
        const primeira = partes[0]?.[0] || "";
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
        return (primeira + ultima).toUpperCase();
    }

    function preencherPagina(usuario) {
        const endereco = usuario.endereco || {};

        // Cabeçalho de perfil
        const avatar = document.getElementById("perfil-avatar");
        if (usuario.fotoUrl) {
            avatar.innerHTML = `<img src="${usuario.fotoUrl}" alt="Foto de ${usuario.nome}" />`;
        } else {
            avatar.textContent = iniciais(usuario.nome);
        }

        document.getElementById("perfil-nome").textContent = texto(usuario.nome);
        document.getElementById("perfil-email").textContent = texto(usuario.email);
        document.getElementById("perfil-telefone").textContent = texto(usuario.telefone);
        document.getElementById("perfil-tipo-conta").textContent = texto(usuario.tipoConta);

        // Cartão: dados de contato
        document.getElementById("info-email").textContent = texto(usuario.email);
        document.getElementById("info-telefone").textContent = texto(usuario.telefone);

        // Cartão: endereço
        document.getElementById("info-rua").textContent = texto(endereco.rua);
        document.getElementById("info-bairro").textContent = texto(endereco.bairro);
        const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(" / ");
        document.getElementById("info-cidade").textContent = texto(cidadeUf);
        document.getElementById("info-cep").textContent = texto(endereco.cep);

        // Cartão: dados da conta
        document.getElementById("info-tipo-conta").textContent = texto(usuario.tipoConta);
        document.getElementById("info-membro-desde").textContent = formatarData(usuario.membroDesde);
        document.getElementById("info-status").textContent = texto(usuario.status);
    }

    document.addEventListener("DOMContentLoaded", async function () {
        const carregando = document.getElementById("estado-carregando");
        const conteudo = document.getElementById("conteudo-perfil");

        try {
            const usuario = await obterUsuario();
            preencherPagina(usuario);
            carregando.hidden = true;
            conteudo.hidden = false;
        } catch (erro) {
            carregando.textContent = "Não foi possível carregar as informações do usuário.";
        }
    });
})();
