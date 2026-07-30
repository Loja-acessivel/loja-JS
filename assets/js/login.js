(function () {
    "use strict";

    const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://127.0.0.1:8080"
        : "https://loja-api-ut39.onrender.com";

    const CHAVE_SESSAO = "pibble-sessao";
    const CHAVE_USUARIO_ID = "loja-usuario-id";
    const CHAVE_VENDEDOR_ID = "loja-vendedor-id";

    const formularioLogin = document.getElementById("loginForm");
    const formularioCadastro = document.getElementById("loginFormComprador");
    const feedback = document.getElementById("auth-feedback");
    const botaoSubmit = document.getElementById("btn-submit");

    async function requisitar(caminho, opcoes) {
        let resposta;

        try {
            resposta = await fetch(`${API_BASE_URL}${caminho}`, {
                ...opcoes,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(opcoes?.headers || {}),
                },
            });
        } catch (erro) {
            throw new Error("Não foi possível conectar à API. Confirme se ela está em execução.");
        }

        if (!resposta.ok) {
            const detalhe = (await resposta.text()).trim();
            throw new Error(detalhe || "Não foi possível concluir a solicitação.");
        }

        return resposta.status === 204 ? null : resposta.json();
    }

    function mostrarFeedback(mensagem, sucesso = false) {
        if (!feedback) return;
        feedback.textContent = mensagem;
        feedback.hidden = false;
        feedback.classList.toggle("auth-feedback--sucesso", sucesso);
    }

    function limparFeedback() {
        if (!feedback) return;
        feedback.hidden = true;
        feedback.textContent = "";
        feedback.classList.remove("auth-feedback--sucesso");
    }

    function definirCarregando(carregando, textoPadrao) {
        if (!botaoSubmit) return;
        botaoSubmit.disabled = carregando;
        botaoSubmit.textContent = carregando ? "Aguarde..." : textoPadrao;
    }

    function salvarSessao(conta) {
        const sessao = {
            id: Number(conta.id),
            nome: conta.nome,
            email: conta.email,
            tipo: conta.tipo,
        };

        localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));

        if (sessao.tipo === "vendedor") {
            localStorage.setItem(CHAVE_VENDEDOR_ID, String(sessao.id));
            localStorage.removeItem(CHAVE_USUARIO_ID);
        } else {
            localStorage.setItem(CHAVE_USUARIO_ID, String(sessao.id));
            localStorage.removeItem(CHAVE_VENDEDOR_ID);
        }
    }

    function redirecionar(conta) {
        const retorno = new URLSearchParams(window.location.search).get("retorno");
        const retornoPermitido = retorno === "carrinho.html" ? retorno : null;
        const destinoComprador = retornoPermitido || "comprador.html";
        window.location.assign(conta.tipo === "vendedor" ? "vendedor.html" : destinoComprador);
    }

    if (formularioLogin) {
        formularioLogin.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            limparFeedback();
            definirCarregando(true, "Entrar");

            try {
                const conta = await requisitar("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: document.getElementById("email").value.trim(),
                        senha: document.getElementById("password").value,
                    }),
                });

                salvarSessao(conta);
                mostrarFeedback("Login realizado. Entrando na Pibble Store...", true);
                setTimeout(() => redirecionar(conta), 350);
            } catch (erro) {
                mostrarFeedback(erro.message);
                definirCarregando(false, "Entrar");
            }
        });
    }

    if (formularioCadastro) {
        formularioCadastro.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            limparFeedback();

            const tipo = document.getElementById("tipo").value;
            const senha = document.getElementById("password").value;
            const confirmarSenha = document.getElementById("password-confirm").value;

            if (senha !== confirmarSenha) {
                mostrarFeedback("As senhas informadas não são iguais.");
                document.getElementById("password-confirm").focus();
                return;
            }

            definirCarregando(true, "Cadastrar");

            const dadosComuns = {
                nome: document.getElementById("nome").value.trim(),
                email: document.getElementById("email").value.trim(),
                senha,
                telefone: null,
            };

            const caminho = tipo === "vendedor" ? "/vendedor" : "/usuario";
            const documento = document.getElementById("cpfCnpj").value.trim();
            const payload = tipo === "vendedor"
                ? { ...dadosComuns, cpfCnpj: documento, avaliacao: 0 }
                : { ...dadosComuns, cpf: documento, endereco: null };

            try {
                const contaCriada = await requisitar(caminho, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                const conta = { ...contaCriada, tipo };

                salvarSessao(conta);
                mostrarFeedback("Conta criada com sucesso. Bem-vindo à Pibble Store!", true);
                setTimeout(() => redirecionar(conta), 450);
            } catch (erro) {
                mostrarFeedback(erro.message);
                definirCarregando(false, "Cadastrar");
            }
        });
    }
})();
