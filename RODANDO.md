# 🚀 Como Rodar o Projeto

## 1. Instalação de Dependências

### Pré-requisitos
```bash
# Node.js 18+
node --version

# Python 3.11+
python3 --version

# AWS CLI v2
aws --version

# Configurar credenciais AWS
aws configure
```

### Instalar Pacotes Globais
```bash
# Serverless Framework
npm install -g serverless

# AWS SAM (para rodar localmente)
npm install -g aws-sam-cli

# AWS CDK (opcional)
npm install -g aws-cdk
```

---

## 2. Setup do Backend

### Entrar no diretório backend
```bash
cd aplicacao/backend
```

### Criar arquivo `requirements.txt`
```bash
cat > requirements.txt << 'EOF'
boto3==1.26.0
python-dateutil==2.8.2
requests==2.31.0
python-dotenv==1.0.0
EOF
```

### Instalar dependências Python
```bash
pip install -r requirements.txt
```

### Instalar Serverless localmente
```bash
npm init -y
npm install --save-dev serverless serverless-python-requirements
```

### Criar arquivo `serverless.yml` (se não existir)
```bash
cat > serverless.yml << 'EOF'
service: farmacia-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  
  environment:
    PRODUTOS_TABLE: farmacia-produtos-${self:provider.stage}

functions:
  listarProdutos:
    handler: lambda-produtos.lambda_handler
    events:
      - http:
          path: produtos
          method: get
          cors: true
    timeout: 30
    memorySize: 256

plugins:
  - serverless-python-requirements

custom:
  pythonRequirements:
    dockerizePip: true
    layer: true
EOF
```

---

## 3. Rodar Localmente

### Opção A: Com SAM (Recomendado)
```bash
# Instalar SAM
npm install -g aws-sam-cli

# Rodar API local
sam local start-api

# Output:
# Mounting LambdaFunction at http://127.0.0.1:3000/produtos [GET]
# You can now browse to http://localhost:3000/produtos
```

### Opção B: Com Serverless Plugin
```bash
# Instalar plugin serverless-offline
npm install --save-dev serverless-offline

# Rodar
serverless offline start --stage dev
```

### Testar Endpoints (em outro terminal)
```bash
# Listar produtos
curl http://localhost:3000/produtos

# Obter produto específico
curl http://localhost:3000/produtos/1

# Criar produto (POST)
curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": "1",
    "nome": "Vitamina C",
    "preco": 45.90,
    "estoque": 100,
    "categoria": "suplementos"
  }'
```

---

## 4. Rodar Frontend Localmente

### Abrir arquivo HTML direto
```bash
cd aplicacao/frontend

# Opção 1: Abrir no navegador
open index.html

# Opção 2: Servir com Python
python3 -m http.server 8000

# Opção 3: Servir com Node.js
npm install -g http-server
http-server
```

### Acessar
- Browser: `http://localhost:8000`
- Ou: `http://localhost:8080` (se usando http-server)

---

## 5. Deploy na AWS

### Deploy em Dev
```bash
cd aplicacao/backend

# Configurar credenciais AWS
export AWS_ACCESS_KEY_ID="sua_chave"
export AWS_SECRET_ACCESS_KEY="sua_secreta"
export AWS_DEFAULT_REGION="us-east-1"

# Deploy
serverless deploy --stage dev

# Output esperado:
# Service Information
# service: farmacia-api
# stage: dev
# region: us-east-1
# 
# Endpoints:
#   GET - https://xxx.execute-api.us-east-1.amazonaws.com/dev/produtos
```

### Deploy em Produção
```bash
serverless deploy --stage prod
```

### Remover Stack
```bash
serverless remove --stage dev
```

---

## 6. Solucionar Problemas

### Erro: "boto3 não encontrado"
```bash
# Reinstalar dependências
pip install --upgrade -r requirements.txt

# Ou criar virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### Erro: "AWS credentials not found"
```bash
# Configurar credenciais
aws configure

# Ou exportar variáveis
export AWS_ACCESS_KEY_ID="seu_key"
export AWS_SECRET_ACCESS_KEY="sua_secret"
export AWS_DEFAULT_REGION="us-east-1"
```

### Erro: "Port 3000 already in use"
```bash
# Encontrar e matar processo
lsof -i :3000
kill -9 <PID>

# Ou usar outra porta
sam local start-api --port 4000
```

### Erro: "DynamoDB table not found"
```bash
# Verificar se tabela existe
aws dynamodb list-tables --region us-east-1

# Criar tabela manualmente
aws dynamodb create-table \
  --table-name farmacia-produtos-dev \
  --attribute-definitions AttributeName=produto_id,AttributeType=S \
  --key-schema AttributeName=produto_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## 7. Estrutura de Diretórios para Rodar

```
aws-farmacia-reducao-custos/
├── aplicacao/
│   ├── backend/
│   │   ├── lambda-produtos.py      ← Handler principal
│   │   ├── serverless.yml          ← Config Serverless
│   │   ├── requirements.txt        ← Dependências Python
│   │   ├── package.json            ← Dependências Node
│   │   └── serverless-config.md    ← Documentação
│   │
│   └── frontend/
│       ├── index.html              ← Interface HTML
│       ├── app.js                  ← Lógica JavaScript
│       └── style.css               ← (em index.html)
│
├── infraestrutura/
│   ├── arquitetura.md
│   └── arquitetura.drawio
│
├── custos/
│   ├── analise-custos.md
│   └── calculo-economias.md
│
└── README.md
```

---

## 8. Verificar Logs

### Logs Locais (SAM)
```bash
# Terminal onde rodou SAM mostra logs em tempo real
sam local start-api
# Logs aparecem automaticamente
```

### Logs na AWS
```bash
# Ver logs de uma função Lambda
serverless logs -f listarProdutos --stage dev

# Com follow (tail)
serverless logs -f listarProdutos --stage dev --tail

# Com timestamp
serverless logs -f listarProdutos --stage dev --startTime 30m
```

---

## 9. Testar com Postman/Insomnia

### Importar Collection
```json
{
  "info": {
    "name": "Farmácia API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Listar Produtos",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/produtos"
      }
    },
    {
      "name": "Criar Produto",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/produtos",
        "body": {
          "mode": "raw",
          "raw": "{\"produto_id\": \"1\", \"nome\": \"Vitamina C\", \"preco\": 45.90, \"estoque\": 100}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 10. Checklist de Inicialização

- [ ] Python 3.11+ instalado
- [ ] Node.js 18+ instalado
- [ ] AWS CLI configurado
- [ ] Serverless Framework instalado
- [ ] Dependências Python instaladas (`pip install -r requirements.txt`)
- [ ] Dependências Node instaladas (`npm install`)
- [ ] SAM ou Serverless Offline funcionando
- [ ] Frontend acessível em `http://localhost:8000`
- [ ] API testada com curl/Postman
- [ ] Credenciais AWS exportadas (para deploy)

---

## 11. Comandos Rápidos

```bash
# Rodar tudo (em 3 terminais diferentes)

# Terminal 1: Backend
cd aplicacao/backend
sam local start-api

# Terminal 2: Frontend
cd aplicacao/frontend
python3 -m http.server 8000

# Terminal 3: Testar
curl http://localhost:3000/produtos
open http://localhost:8000
```

---

## 12. Próximos Passos

1. ✅ Rodar localmente
2. ✅ Testar endpoints
3. → Deploy em Dev
4. → Deploy em Prod
5. → Configurar CloudWatch
6. → Otimizar custos

