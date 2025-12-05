// Configuração da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://seu-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';

// Estado da aplicação
let estadoApp = {
    produtos: [],
    carrinho: [],
    filtros: {
        busca: '',
        categoria: '',
        precoMax: Infinity
    },
    paginacao: {
        pagina: 1,
        itensPorPagina: 12,
        lastKey: null
    }
};

// ============================================================================
// FUNÇÕES DE API
// ============================================================================

/**
 * Requisição genérica para API
 */
async function fazerRequisicao(endpoint, metodo = 'GET', dados = null) {
    try {
        const opcoes = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        };

        if (dados) {
            opcoes.body = JSON.stringify(dados);
        }

        console.log(`[API] ${metodo} ${endpoint}`);
        
        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, opcoes);
        const json = await resposta.json();

        if (!resposta.ok) {
            throw new Error(json.erro || `Erro HTTP ${resposta.status}`);
        }

        console.log(`[API] Sucesso: ${json}`);
        return json;

    } catch (erro) {
        console.error(`[API] Erro:`, erro);
        mostrarErro(erro.message);
        throw erro;
    }
}

/**
 * Listar produtos com paginação
 */
async function carregarProdutos(pagina = 1) {
    try {
        mostrarCarregamento(true);

        const resposta = await fazerRequisicao('/produtos?limit=12');
        
        estadoApp.produtos = resposta.produtos || [];
        estadoApp.paginacao.lastKey = resposta.lastKey;
        
        renderizarProdutos(estadoApp.produtos);
        mostrarCarregamento(false);

    } catch (erro) {
        mostrarCarregamento(false);
        mostrarErro('Erro ao carregar produtos');
    }
}

/**
 * Buscar produto específico
 */
async function obterProduto(produtoId) {
    try {
        const resposta = await fazerRequisicao(`/produtos/${produtoId}`);
        return resposta;
    } catch (erro) {
        mostrarErro('Erro ao obter produto');
        return null;
    }
}

/**
 * Criar produto (Admin)
 */
async function criarProduto(dados) {
    try {
        const resposta = await fazerRequisicao('/produtos', 'POST', dados);
        console.log('Produto criado:', resposta);
        return resposta;
    } catch (erro) {
        mostrarErro('Erro ao criar produto');
        throw erro;
    }
}

/**
 * Atualizar produto (Admin)
 */
async function atualizarProduto(produtoId, dados) {
    try {
        const resposta = await fazerRequisicao(`/produtos/${produtoId}`, 'PUT', dados);
        console.log('Produto atualizado:', resposta);
        return resposta;
    } catch (erro) {
        mostrarErro('Erro ao atualizar produto');
        throw erro;
    }
}

/**
 * Deletar produto (Admin)
 */
async function deletarProduto(produtoId) {
    try {
        const resposta = await fazerRequisicao(`/produtos/${produtoId}`, 'DELETE');
        console.log('Produto deletado:', resposta);
        return resposta;
    } catch (erro) {
        mostrarErro('Erro ao deletar produto');
        throw erro;
    }
}

// ============================================================================
// FUNÇÕES DE UI - PRODUTOS
// ============================================================================

/**
 * Renderizar grid de produtos
 */
function renderizarProdutos(produtos) {
    const grid = document.getElementById('produtosGrid');
    
    if (!produtos || produtos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white; font-size: 18px;">Nenhum produto encontrado</p>';
        return;
    }

    grid.innerHTML = produtos.map(produto => `
        <div class="produto-card" onclick="mostrarDetalhes('${produto.produto_id}')">
            <div class="produto-imagem">
                💊
            </div>
            <div class="produto-info">
                <div class="produto-nome">${escaparHTML(produto.nome)}</div>
                <div class="produto-descricao">${escaparHTML(produto.descricao || '')}</div>
                <div class="produto-footer">
                    <div class="produto-preco">R$ ${formatarMoeda(produto.preco)}</div>
                    <button class="btn-adicionar" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.produto_id}', '${escaparHTML(produto.nome)}', ${produto.preco})">
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Mostrar detalhes do produto em modal
 */
async function mostrarDetalhes(produtoId) {
    try {
        const produto = await obterProduto(produtoId);
        if (!produto) return;

        const detalhes = `
            <div style="background: white; padding: 20px; border-radius: 10px;">
                <h2>${escaparHTML(produto.nome)}</h2>
                <p style="color: #666; margin: 10px 0;">${escaparHTML(produto.descricao || '')}</p>
                <p><strong>SKU:</strong> ${escaparHTML(produto.sku || 'N/A')}</p>
                <p><strong>Categoria:</strong> ${escaparHTML(produto.categoria || 'N/A')}</p>
                <p><strong>Estoque:</strong> ${produto.estoque} unidades</p>
                <p style="font-size: 20px; color: #667eea; margin: 20px 0;"><strong>R$ ${formatarMoeda(produto.preco)}</strong></p>
                <button class="btn-adicionar" style="width: 100%; padding: 15px; font-size: 16px;" 
                    onclick="adicionarAoCarrinho('${produto.produto_id}', '${escaparHTML(produto.nome)}', ${produto.preco})">
                    Adicionar ao Carrinho
                </button>
            </div>
        `;

        alert(detalhes);

    } catch (erro) {
        console.error('Erro ao mostrar detalhes:', erro);
    }
}

// ============================================================================
// FUNÇÕES DE FILTROS
// ============================================================================

/**
 * Buscar produtos
 */
function buscarProdutos() {
    const busca = document.getElementById('searchInput').value.toLowerCase();
    estadoApp.filtros.busca = busca;
    aplicarFiltros();
}

/**
 * Aplicar filtros aos produtos
 */
function aplicarFiltros() {
    const categoria = document.getElementById('categoryFilter').value;
    const precoMax = parseFloat(document.getElementById('priceFilter').value) || Infinity;
    
    estadoApp.filtros.categoria = categoria;
    estadoApp.filtros.precoMax = precoMax;

    let produtosFiltrados = estadoApp.produtos.filter(produto => {
        const atendeBusca = !estadoApp.filtros.busca || 
                           produto.nome.toLowerCase().includes(estadoApp.filtros.busca) ||
                           (produto.descricao && produto.descricao.toLowerCase().includes(estadoApp.filtros.busca));
        
        const atendeCat = !categoria || produto.categoria === categoria;
        const atendePraco = produto.preco <= precoMax;

        return atendeBusca && atendeCat && atendePraco;
    });

    renderizarProdutos(produtosFiltrados);
}

// ============================================================================
// FUNÇÕES DE CARRINHO
// ============================================================================

/**
 * Adicionar produto ao carrinho
 */
function adicionarAoCarrinho(produtoId, nome, preco) {
    const itemExistente = estadoApp.carrinho.find(item => item.produtoId === produtoId);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        estadoApp.carrinho.push({
            produtoId,
            nome,
            preco,
            quantidade: 1
        });
    }

    atualizarCarrinho();
    console.log('Produto adicionado ao carrinho:', {produtoId, nome, preco});
}

/**
 * Remover produto do carrinho
 */
function removerDoCarrinho(produtoId) {
    estadoApp.carrinho = estadoApp.carrinho.filter(item => item.produtoId !== produtoId);
    atualizarCarrinho();
}

/**
 * Atualizar quantidade no carrinho
 */
function atualizarQuantidade(produtoId, novaQuantidade) {
    const item = estadoApp.carrinho.find(item => item.produtoId === produtoId);
    if (item && novaQuantidade > 0) {
        item.quantidade = novaQuantidade;
        atualizarCarrinho();
    }
}

/**
 * Atualizar UI do carrinho
 */
function atualizarCarrinho() {
    const total = estadoApp.carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    
    document.getElementById('cartCount').textContent = estadoApp.carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    document.getElementById('cartTotal').textContent = formatarMoeda(total);

    const cartItems = document.getElementById('cartItems');
    if (estadoApp.carrinho.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999;">Carrinho vazio</p>';
    } else {
        cartItems.innerHTML = estadoApp.carrinho.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div>
                    <div style="font-weight: 600;">${escaparHTML(item.nome)}</div>
                    <div style="color: #666; font-size: 12px;">R$ ${formatarMoeda(item.preco)} un.</div>
                </div>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button style="width: 25px; height: 25px; cursor: pointer;" onclick="atualizarQuantidade('${item.produtoId}', ${item.quantidade - 1})">-</button>
                    <input type="number" value="${item.quantidade}" min="1" style="width: 40px; text-align: center;" 
                        onchange="atualizarQuantidade('${item.produtoId}', parseInt(this.value))">
                    <button style="width: 25px; height: 25px; cursor: pointer;" onclick="atualizarQuantidade('${item.produtoId}', ${item.quantidade + 1})">+</button>
                    <button style="background: #ff6b6b; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;" 
                        onclick="removerDoCarrinho('${item.produtoId}')">Remover</button>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Abrir modal do carrinho
 */
function abrirCarrinho() {
    document.getElementById('cartModal').style.display = 'block';
    atualizarCarrinho();
}

/**
 * Fechar modal do carrinho
 */
function fecharCarrinho() {
    document.getElementById('cartModal').style.display = 'none';
}

/**
 * Finalizar compra
 */
function finalizarCompra() {
    if (estadoApp.carrinho.length === 0) {
        alert('Carrinho vazio!');
        return;
    }

    const total = estadoApp.carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    
    alert(`Pedido confirmado!\n\nItens: ${estadoApp.carrinho.length}\nTotal: R$ ${formatarMoeda(total)}\n\nUm email de confirmação foi enviado.`);
    
    // Limpar carrinho
    estadoApp.carrinho = [];
    atualizarCarrinho();
    fecharCarrinho();

    // Aqui você integraria com a API de pedidos
    // await fazerRequisicao('/pedidos', 'POST', { itens: estadoApp.carrinho, total });
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Formatar número como moeda
 */
function formatarMoeda(valor) {
    return typeof valor === 'number' ? valor.toFixed(2) : parseFloat(valor).toFixed(2);
}

/**
 * Escapar HTML para prevenir XSS
 */
function escaparHTML(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Mostrar carregamento
 */
function mostrarCarregamento(visivel) {
    document.getElementById('loading').style.display = visivel ? 'block' : 'none';
}

/**
 * Mostrar erro
 */
function mostrarErro(mensagem) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = mensagem;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Inicializando aplicação');
    carregarProdutos();

    // Fechar modal ao clicar fora
    window.onclick = (event) => {
        const modal = document.getElementById('cartModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});

// Exemplo de produtos mock (remover em produção)
if (!process.env.REACT_APP_API_URL) {
    console.warn('API_URL não configurada. Usando dados mock.');
    estadoApp.produtos = [
        {
            produto_id: '1',
            nome: 'Vitamina C 1000mg',
            descricao: 'Vitamina C pura com 60 cápsulas',
            preco: 45.90,
            estoque: 50,
            categoria: 'suplementos',
            sku: 'VIT-C-1000'
        },
        {
            produto_id: '2',
            nome: 'Dipirona 500mg',
            descricao: 'Analgésico e antitérmico - 20 comprimidos',
            preco: 8.50,
            estoque: 100,
            categoria: 'medicamentos',
            sku: 'DIPI-500'
        },
        {
            produto_id: '3',
            nome: 'Sabonete Liquido',
            descricao: 'Sabonete líquido neutro 250ml',
            preco: 12.00,
            estoque: 75,
            categoria: 'higiene',
            sku: 'SOAP-LIQUID'
        }
    ];
    renderizarProdutos(estadoApp.produtos);
}
