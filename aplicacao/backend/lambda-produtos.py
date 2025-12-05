import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

# Inicializar clientes AWS
dynamodb = boto3.resource('dynamodb')
table_produtos = dynamodb.Table(os.environ['PRODUTOS_TABLE'])
cloudwatch = boto3.client('cloudwatch')

class DecimalEncoder(json.JSONEncoder):
    """Helper class para serializar Decimal do DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def log_metric(metric_name, value, unit='Count'):
    """Enviar métrica para CloudWatch"""
    try:
        cloudwatch.put_metric_data(
            Namespace='FarmaciaApp',
            MetricData=[
                {
                    'MetricName': metric_name,
                    'Value': value,
                    'Unit': unit,
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
    except Exception as e:
        print(f"Erro ao registrar métrica: {str(e)}")

def response(status_code, body):
    """Formatar resposta HTTP"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

# ============================================================================
# LAMBDA 1: Listar Produtos
# ============================================================================
def listar_produtos(event, context):
    """
    GET /produtos
    Listar todos os produtos com paginação
    """
    try:
        print(f"[listar_produtos] Iniciando...")
        
        # Parâmetros de paginação
        limit = int(event.get('queryStringParameters', {}).get('limit', 20) or 20)
        last_key = event.get('queryStringParameters', {}).get('lastKey')
        
        # Validar limite máximo
        limit = min(limit, 100)
        
        # Scan com paginação
        scan_kwargs = {'Limit': limit}
        if last_key:
            scan_kwargs['ExclusiveStartKey'] = json.loads(last_key)
        
        response_data = table_produtos.scan(**scan_kwargs)
        
        # Contar itens para métrica
        count = len(response_data.get('Items', []))
        log_metric('ProdutosListados', count)
        
        return response(200, {
            'produtos': response_data.get('Items', []),
            'count': count,
            'lastKey': json.dumps(response_data.get('LastEvaluatedKey')) 
                      if response_data.get('LastEvaluatedKey') else None
        })
        
    except Exception as e:
        print(f"[listar_produtos] Erro: {str(e)}")
        log_metric('ProdutosErro', 1)
        return response(500, {'erro': 'Erro ao listar produtos'})

# ============================================================================
# LAMBDA 2: Obter Detalhes do Produto
# ============================================================================
def obter_produto(event, context):
    """
    GET /produtos/{produto_id}
    Obter detalhes de um produto específico
    """
    try:
        print(f"[obter_produto] Iniciando...")
        
        # Extrair produto_id do path
        produto_id = event['pathParameters']['produto_id']
        
        if not produto_id:
            return response(400, {'erro': 'produto_id é obrigatório'})
        
        # Buscar produto
        resultado = table_produtos.get_item(Key={'produto_id': produto_id})
        
        if 'Item' not in resultado:
            log_metric('ProdutoNaoEncontrado', 1)
            return response(404, {'erro': 'Produto não encontrado'})
        
        log_metric('ProdutoObtido', 1)
        return response(200, resultado['Item'])
        
    except Exception as e:
        print(f"[obter_produto] Erro: {str(e)}")
        log_metric('ProdutoErro', 1)
        return response(500, {'erro': 'Erro ao obter produto'})

# ============================================================================
# LAMBDA 3: Criar Produto (Admin)
# ============================================================================
def criar_produto(event, context):
    """
    POST /produtos
    Criar novo produto (requer autenticação admin)
    """
    try:
        print(f"[criar_produto] Iniciando...")
        
        body = json.loads(event['body'])
        
        # Validar campos obrigatórios
        campos_obrigatorios = ['produto_id', 'nome', 'preco', 'estoque']
        for campo in campos_obrigatorios:
            if campo not in body:
                return response(400, {'erro': f'{campo} é obrigatório'})
        
        # Preparar item
        item = {
            'produto_id': body['produto_id'],
            'nome': body['nome'],
            'descricao': body.get('descricao', ''),
            'preco': Decimal(str(body['preco'])),
            'estoque': int(body['estoque']),
            'categoria': body.get('categoria', ''),
            'sku': body.get('sku', ''),
            'criado_em': datetime.utcnow().isoformat(),
            'ativo': True
        }
        
        # Salvar no DynamoDB
        table_produtos.put_item(Item=item)
        
        log_metric('ProdutoCriado', 1)
        return response(201, {
            'mensagem': 'Produto criado com sucesso',
            'produto_id': item['produto_id']
        })
        
    except ValueError as e:
        print(f"[criar_produto] Erro de validação: {str(e)}")
        return response(400, {'erro': 'Dados inválidos'})
    except Exception as e:
        print(f"[criar_produto] Erro: {str(e)}")
        log_metric('ProdutoErroCreate', 1)
        return response(500, {'erro': 'Erro ao criar produto'})

# ============================================================================
# LAMBDA 4: Atualizar Produto
# ============================================================================
def atualizar_produto(event, context):
    """
    PUT /produtos/{produto_id}
    Atualizar dados do produto
    """
    try:
        print(f"[atualizar_produto] Iniciando...")
        
        produto_id = event['pathParameters']['produto_id']
        body = json.loads(event['body'])
        
        # Construir expressão de atualização
        update_expr = "SET "
        expr_values = {}
        
        campos_atualizaveis = ['nome', 'descricao', 'preco', 'estoque', 'categoria', 'ativo']
        
        updates = []
        for campo in campos_atualizaveis:
            if campo in body:
                updates.append(f"{campo} = :{campo}")
                if campo == 'preco':
                    expr_values[f":{campo}"] = Decimal(str(body[campo]))
                else:
                    expr_values[f":{campo}"] = body[campo]
        
        if not updates:
            return response(400, {'erro': 'Nenhum campo para atualizar'})
        
        update_expr += ", ".join(updates)
        update_expr += ", atualizado_em = :atualizado_em"
        expr_values[':atualizado_em'] = datetime.utcnow().isoformat()
        
        # Atualizar item
        resultado = table_produtos.update_item(
            Key={'produto_id': produto_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        log_metric('ProdutoAtualizado', 1)
        return response(200, {
            'mensagem': 'Produto atualizado com sucesso',
            'produto': resultado['Attributes']
        })
        
    except Exception as e:
        print(f"[atualizar_produto] Erro: {str(e)}")
        log_metric('ProdutoErroUpdate', 1)
        return response(500, {'erro': 'Erro ao atualizar produto'})

# ============================================================================
# LAMBDA 5: Deletar Produto
# ============================================================================
def deletar_produto(event, context):
    """
    DELETE /produtos/{produto_id}
    Deletar um produto
    """
    try:
        print(f"[deletar_produto] Iniciando...")
        
        produto_id = event['pathParameters']['produto_id']
        
        # Verificar se existe
        resultado = table_produtos.get_item(Key={'produto_id': produto_id})
        
        if 'Item' not in resultado:
            return response(404, {'erro': 'Produto não encontrado'})
        
        # Deletar
        table_produtos.delete_item(Key={'produto_id': produto_id})
        
        log_metric('ProdutoDeletado', 1)
        return response(200, {'mensagem': 'Produto deletado com sucesso'})
        
    except Exception as e:
        print(f"[deletar_produto] Erro: {str(e)}")
        log_metric('ProdutoErroDelete', 1)
        return response(500, {'erro': 'Erro ao deletar produto'})

# ============================================================================
# Handler Lambda (Router)
# ============================================================================
def lambda_handler(event, context):
    """
    Handler principal - roteia requisições para funções apropriadas
    """
    http_method = event['httpMethod']
    path = event['path']
    
    print(f"[lambda_handler] {http_method} {path}")
    
    try:
        if http_method == 'GET':
            if '{produto_id}' in path or event.get('pathParameters', {}).get('produto_id'):
                return obter_produto(event, context)
            else:
                return listar_produtos(event, context)
        
        elif http_method == 'POST':
            return criar_produto(event, context)
        
        elif http_method == 'PUT':
            return atualizar_produto(event, context)
        
        elif http_method == 'DELETE':
            return deletar_produto(event, context)
        
        else:
            return response(405, {'erro': 'Método não permitido'})
    
    except Exception as e:
        print(f"[lambda_handler] Erro fatal: {str(e)}")
        return response(500, {'erro': 'Erro interno do servidor'})
