# Arquitetura AWS Farmácia - Redução de Custos

## Visão Geral
Arquitetura serverless e escalável para plataforma de e-commerce de farmácia, otimizada para redução de custos operacionais.

## Componentes

### 1. **Frontend (S3 + CloudFront)**
- **S3 Bucket**: Hospedagem estática (HTML, CSS, JS)
- **CloudFront**: CDN para distribuição global
- **Benefício**: Reduz latência, economia em banda
- **Custo**: ~$0.085/GB

### 2. **API Gateway + ALB**
- **Application Load Balancer**: Roteamento inteligente
- **API Gateway**: Gerenciamento de APIs REST
- **Benefício**: Auto-scaling, pay-per-use
- **Custo**: ~$0.0075/requisição

### 3. **Computação (Lambda)**
- **Lambda Produtos**: Listagem e detalhes
- **Lambda Pedidos**: Criação e rastreamento
- **Lambda Usuários**: Autenticação e perfil
- **Benefício**: Paga apenas pelo tempo de execução
- **Custo**: ~$0.0000002/ms

### 4. **Banco de Dados**

#### DynamoDB (Produtos e Pedidos)
- **On-Demand**: Escalabilidade automática
- **Benefício**: Sem gerenciamento, pay-per-request
- **Custo**: ~$1.25/1M leituras, ~$6.25/1M escritas

#### Aurora Serverless (Usuários)
- **Auto-scaling**: Escala automaticamente
- **Benefício**: Pause automático = economia 70%
- **Custo**: ACU (Aurora Capacity Units): ~$0.06/ACU/hora

### 5. **Integração (SQS + EventBridge)**
- **SQS**: Fila de processamento de pedidos
- **EventBridge**: Orquestração de eventos
- **Benefício**: Desacoplamento, escalabilidade
- **Custo**: ~$0.40/1M requisições SQS

### 6. **Monitoramento (CloudWatch)**
- **Logs**: Rastreamento centralizado
- **Métricas**: Alertas automáticos
- **Benefício**: Detecção de anomalias
- **Custo**: ~$0.50/GB logs ingeridos

## Fluxo de Dados

```
Cliente
   ↓
Internet Gateway
   ↓
CloudFront (CDN)
   ├→ S3 (Frontend)
   └→ ALB
      ├→ Lambda Produtos → DynamoDB
      ├→ Lambda Pedidos → DynamoDB → SQS → EventBridge
      └→ Lambda Usuários → Aurora Serverless
```

## Vantagens da Arquitetura

1. **Serverless**: Sem gerenciamento de servidores
2. **Auto-scaling**: Escalabilidade automática
3. **Pay-per-use**: Paga apenas pelo consumido
4. **Alta Disponibilidade**: Distribuído globalmente
5. **Segurança**: IAM, VPC, criptografia

## Estimativa de Custos Mensais

| Serviço | Uso Estimado | Custo/mês |
|---------|-------------|----------|
| Lambda | 1M invocações | $0.20 |
| DynamoDB | 100M req | $150 |
| Aurora Serverless | 2 ACU | $88 |
| S3 + CloudFront | 100GB | $10 |
| SQS | 10M msg | $4 |
| API Gateway | 1M req | $7.50 |
| CloudWatch | 50GB logs | $25 |
| **TOTAL** | | **~$284.70/mês** |

## Otimizações de Custo

1. **Reserved Capacity (DynamoDB)**: Economia 50% com comprometimento anual
2. **Aurora Pause**: Para desenvolvimento, pausa automática em 15min inatividade
3. **Lambda Reserved Concurrency**: Economia 20-30% para picos previsíveis
4. **S3 Lifecycle**: Mover objetos antigos para Glacier
5. **CloudWatch Logs Retention**: Manter apenas 7 dias
