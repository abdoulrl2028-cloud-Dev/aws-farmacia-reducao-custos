# Configuração Serverless Framework - AWS Farmácia

## Pré-requisitos

```bash
npm install -g serverless
npm install --save-dev serverless-python-requirements
aws configure  # Configure credenciais AWS
```

## Estrutura do Projeto

```
backend/
├── lambda-produtos.py
├── lambda-pedidos.py
├── lambda-usuarios.py
├── requirements.txt
└── serverless.yml
```

## Arquivos Necessários

### requirements.txt
```
boto3==1.26.0
python-dateutil==2.8.2
```

### serverless.yml Completo

```yaml
service: farmacia-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  
  environment:
    PRODUTOS_TABLE: !Ref ProdutosTable
    PEDIDOS_TABLE: !Ref PedidosTable
    USUARIOS_TABLE: !Ref UsuariosTable
    STAGE: ${self:provider.stage}
  
  iam:
    role:
      statements:
        # DynamoDB
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - !GetAtt ProdutosTable.Arn
            - !GetAtt PedidosTable.Arn
        
        # RDS Aurora
        - Effect: Allow
          Action:
            - rds-db:connect
          Resource: !Sub "arn:aws:rds:${AWS::Region}:${AWS::AccountId}:db/*"
        
        # CloudWatch
        - Effect: Allow
          Action:
            - cloudwatch:PutMetricData
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: "*"
        
        # SQS
        - Effect: Allow
          Action:
            - sqs:SendMessage
          Resource: !GetAtt FilaPedidos.Arn
        
        # EventBridge
        - Effect: Allow
          Action:
            - events:PutEvents
          Resource: !GetAtt EventBusOrchestracao.Arn

functions:
  # ===== PRODUTOS =====
  listarProdutos:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos
          method: get
          cors: true
    timeout: 30
    memorySize: 256
    environment:
      FUNCTION: list
  
  obterProduto:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos/{produto_id}
          method: get
          cors: true
    timeout: 30
    memorySize: 256
  
  criarProduto:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos
          method: post
          cors: true
          authorizer:
            name: AutenticacaoAuth
            resultTtlInSeconds: 300
    timeout: 30
    memorySize: 256
  
  atualizarProduto:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos/{produto_id}
          method: put
          cors: true
          authorizer:
            name: AutenticacaoAuth
    timeout: 30
    memorySize: 256
  
  deletarProduto:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos/{produto_id}
          method: delete
          cors: true
          authorizer:
            name: AutenticacaoAuth
    timeout: 30
    memorySize: 256

plugins:
  - serverless-python-requirements

custom:
  pythonRequirements:
    dockerizePip: true
    layer: true

resources:
  Resources:
    # ===== TABELAS DYNAMODB =====
    ProdutosTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: !Sub "farmacia-produtos-${self:provider.stage}"
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: produto_id
            AttributeType: S
        KeySchema:
          - AttributeName: produto_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: categoria-index
            KeySchema:
              - AttributeName: categoria
                KeyType: HASH
            Projection:
              ProjectionType: ALL
        Tags:
          - Key: Ambiente
            Value: ${self:provider.stage}
          - Key: Aplicacao
            Value: farmacia
    
    PedidosTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: !Sub "farmacia-pedidos-${self:provider.stage}"
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: pedido_id
            AttributeType: S
          - AttributeName: usuario_id
            AttributeType: S
          - AttributeName: criado_em
            AttributeType: S
        KeySchema:
          - AttributeName: pedido_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: usuario-id-index
            KeySchema:
              - AttributeName: usuario_id
                KeyType: HASH
              - AttributeName: criado_em
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
        Tags:
          - Key: Ambiente
            Value: ${self:provider.stage}
    
    # ===== SQS FILA =====
    FilaPedidos:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: !Sub "farmacia-pedidos-${self:provider.stage}"
        VisibilityTimeout: 300
        MessageRetentionPeriod: 1209600  # 14 dias
        Tags:
          - Key: Aplicacao
            Value: farmacia
    
    # ===== EVENTBRIDGE =====
    EventBusOrchestracao:
      Type: AWS::Events::EventBus
      Properties:
        Name: !Sub "farmacia-orquestracao-${self:provider.stage}"
    
    # ===== LOG GROUP =====
    LambdaLogGroup:
      Type: AWS::Logs::LogGroup
      Properties:
        LogGroupName: !Sub "/aws/lambda/farmacia-${self:provider.stage}"
        RetentionInDays: 7

outputs:
  ProdutosTableName:
    Description: Nome da tabela de produtos
    Value: !Ref ProdutosTable
    Export:
      Name: !Sub "farmacia-produtos-table-${self:provider.stage}"
  
  FilaPedidosUrl:
    Description: URL da fila de pedidos
    Value: !Ref FilaPedidos
    Export:
      Name: !Sub "farmacia-fila-pedidos-${self:provider.stage}"
  
  ApiEndpoint:
    Description: API Gateway endpoint
    Value: !Sub "https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}"
```

## Deployment

### Desenvolvimento
```bash
serverless deploy --stage dev
```

### Produção
```bash
serverless deploy --stage prod
```

### Verificar Logs
```bash
serverless logs -f listarProdutos --stage dev --tail
```

## Otimizações de Custo

### 1. **Reserved Capacity (DynamoDB)**
```bash
# Para produção com tráfego previsível
# No console AWS: DynamoDB > Tables > Capacity
# Economia: 40-50% em custos
```

### 2. **Lambda Concurrency**
```yaml
reservedConcurrentExecutions: 100  # Limitar para evitar surtos
```

### 3. **CloudWatch Logs Retention**
```bash
# Reduzir de 30 para 7 dias em dev
# Economia: 75% em logs
```

## Monitoramento

### Métricas Importantes
- Lambda Execution Duration
- Lambda Errors
- DynamoDB Consumed Capacity
- SQS Messages Sent
- API Gateway 4XX/5XX Errors

### Alerta Recomendado
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name farmacia-lambda-errors \
  --alarm-description "Alerta para erros em Lambda" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Troubleshooting

### Erro: "Access Denied to DynamoDB"
```bash
# Verificar IAM role da Lambda
aws iam list-role-policies --role-name farmacia-lambda-role
```

### Erro: "Lambda Timeout"
```bash
# Aumentar timeout em serverless.yml
timeout: 60  # segundos
```

### Erro: "Table not found"
```bash
# Verificar nome da tabela
aws dynamodb list-tables --region us-east-1 | grep farmacia
```
