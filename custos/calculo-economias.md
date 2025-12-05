# Cálculo de Economias - Farmácia Online AWS

## Fórmulas de Cálculo

### 1. Lambda Cost Calculation

```
Custo Lambda = (Número de Invocações × Tempo de Execução × GB de Memória) / Preço por Unidade

Fórmula:
Cost = (invocations × duration_ms × memory_gb) × $0.0000166667 / 1000

Exemplo:
- 1 milhão de invocações
- 200ms de duração média
- 512 MB (0.5 GB)

Cost = (1,000,000 × 200 × 0.5) × $0.0000166667 / 1000
     = (100,000,000) × $0.0000166667 / 1000
     = $1.67
```

### 2. DynamoDB Cost Calculation

#### On-Demand (Pay-Per-Request)
```
Leituras = Operações × $0.00000125
Escritas = Operações × $0.00000625

Exemplo:
- 100 milhões de leituras/mês
- 10 milhões de escritas/mês

Leituras: 100,000,000 × $0.00000125 = $125
Escritas: 10,000,000 × $0.00000625 = $62.50
Total: $187.50
```

#### Provisioned (Modo Reservado)
```
Leitura = RCU × 0.00013 × 730 horas
Escrita = WCU × 0.00065 × 730 horas

Exemplo:
- 100 RCU
- 50 WCU

Leitura: 100 × 0.00013 × 730 = $9.49
Escrita: 50 × 0.00065 × 730 = $23.73
Total: $33.22
```

### 3. Aurora Serverless Cost

```
Custo = ACU × $0.06 × Horas Utilizadas

Exemplo (24 horas/dia):
- 2 ACU durante pico (6 horas): 2 × $0.06 × 6 = $0.72
- 1 ACU durante normal (12 horas): 1 × $0.06 × 12 = $0.72
- Pausa (6 horas): $0

Por dia: $1.44
Por mês: $1.44 × 30 = $43.20
```

### 4. API Gateway Cost

```
Custo = Requisições × $0.0000075

Exemplo:
- 1 milhão de requisições/mês

Cost = 1,000,000 × $0.0000075 = $7.50
```

### 5. S3 Cost

```
Storage = GB × $0.023/mês
Requisições GET = Operações × $0.0004 por 10,000
Requisições PUT = Operações × $0.005 por 1,000

Exemplo:
- 100 GB storage
- 1 milhão GET/mês
- 100K PUT/mês

Storage: 100 × $0.023 = $2.30
GET: (1,000,000/10,000) × $0.0004 = $0.04
PUT: (100,000/1,000) × $0.005 = $0.50
Total: $2.84
```

### 6. CloudFront Cost (Data Transfer Out)

```
Custo = GB × Preço por Região

Preço por Região (US/EU):
- 0-10 TB: $0.085/GB
- 10-50 TB: $0.080/GB
- 50-100 TB: $0.060/GB

Exemplo:
- 100 GB distribuído

Cost = 100 × $0.085 = $8.50
```

### 7. CloudWatch Logs Cost

```
Custo Ingestion = GB × $0.50
Custo Storage = GB × $0.03

Exemplo:
- 50 GB ingeridos/mês
- Retenção: 7 dias (10 GB em média)

Ingestion: 50 × $0.50 = $25
Storage: 10 × $0.03 = $0.30
Total: $25.30
```

---

## Calculadora Interativa (Python)

```python
# calculadora_custos.py

class CustosAWS:
    # Preços em USD
    LAMBDA_PRICE = 0.0000166667
    DYNAMODB_READ = 0.00000125
    DYNAMODB_WRITE = 0.00000625
    AURORA_ACU = 0.06
    API_GATEWAY = 0.0000075
    CLOUDWATCH_INGEST = 0.50
    
    @staticmethod
    def calcular_lambda(invocacoes, duracao_ms, memoria_gb):
        """
        invocacoes: número de invocações/mês
        duracao_ms: tempo médio de execução em ms
        memoria_gb: memória alocada em GB
        """
        custo = (invocacoes * duracao_ms * memoria_gb) * CustosAWS.LAMBDA_PRICE / 1000
        return round(custo, 2)
    
    @staticmethod
    def calcular_dynamodb_ondemand(leituras, escritas):
        """
        leituras: número de operações de leitura/mês
        escritas: número de operações de escrita/mês
        """
        custo_leitura = leituras * CustosAWS.DYNAMODB_READ
        custo_escrita = escritas * CustosAWS.DYNAMODB_WRITE
        return round(custo_leitura + custo_escrita, 2)
    
    @staticmethod
    def calcular_aurora_serverless(acu_pico, acu_normal, horas_pico, horas_normal, horas_pausa=0):
        """
        acu_pico: ACU durante pico
        acu_normal: ACU durante normal
        horas_pico: horas em pico por dia
        horas_normal: horas normais por dia
        horas_pausa: horas em pausa por dia
        """
        custo_diario = (acu_pico * CustosAWS.AURORA_ACU * horas_pico + 
                       acu_normal * CustosAWS.AURORA_ACU * horas_normal)
        custo_mensal = custo_diario * 30
        return round(custo_mensal, 2)
    
    @staticmethod
    def calcular_api_gateway(requisicoes):
        """
        requisicoes: número de requisições/mês
        """
        custo = requisicoes * CustosAWS.API_GATEWAY
        return round(custo, 2)
    
    @staticmethod
    def calcular_s3(storage_gb, gets, puts):
        """
        storage_gb: tamanho em GB
        gets: operações GET por mês
        puts: operações PUT por mês
        """
        custo_storage = storage_gb * 0.023
        custo_gets = (gets / 10000) * 0.0004
        custo_puts = (puts / 1000) * 0.005
        total = custo_storage + custo_gets + custo_puts
        return round(total, 2)
    
    @staticmethod
    def calcular_cloudwatch(gb_ingeridos, gb_storage):
        """
        gb_ingeridos: GB de logs ingeridos/mês
        gb_storage: GB de logs em storage médio
        """
        custo_ingest = gb_ingeridos * CustosAWS.CLOUDWATCH_INGEST
        custo_storage = gb_storage * 0.03
        return round(custo_ingest + custo_storage, 2)

# Exemplo de uso
if __name__ == "__main__":
    print("=== Calculadora de Custos AWS - Farmácia Online ===\n")
    
    # Cenário: Tráfego Médio
    print("CENÁRIO: Tráfego Médio (1M requisições/mês)\n")
    
    # Lambda
    lambda_cost = CustosAWS.calcular_lambda(1_000_000, 200, 0.512)
    print(f"Lambda (1M invoc, 200ms, 512MB): ${lambda_cost}")
    
    # DynamoDB
    dynamo_cost = CustosAWS.calcular_dynamodb_ondemand(100_000_000, 10_000_000)
    print(f"DynamoDB (100M read, 10M write): ${dynamo_cost}")
    
    # Aurora
    aurora_cost = CustosAWS.calcular_aurora_serverless(2, 1, 6, 12, 6)
    print(f"Aurora Serverless (2 ACU pico, 1 normal): ${aurora_cost}")
    
    # API Gateway
    api_cost = CustosAWS.calcular_api_gateway(1_000_000)
    print(f"API Gateway (1M requisições): ${api_cost}")
    
    # S3
    s3_cost = CustosAWS.calcular_s3(100, 1_000_000, 100_000)
    print(f"S3 (100GB, 1M GET, 100K PUT): ${s3_cost}")
    
    # CloudWatch
    cw_cost = CustosAWS.calcular_cloudwatch(50, 10)
    print(f"CloudWatch (50GB ingested, 10GB stored): ${cw_cost}")
    
    # Total
    total = lambda_cost + dynamo_cost + aurora_cost + api_cost + s3_cost + cw_cost
    print(f"\nCUSTO TOTAL: ${total}/mês")
    print(f"CUSTO ANUAL: ${total * 12}/ano")


# Comparação com Tradicional
print("\n\n=== COMPARAÇÃO ===")
tradicional = 553.50
serverless = total
economia = tradicional - serverless
percentual = (economia / tradicional) * 100

print(f"Tradicional (EC2+RDS): ${tradicional:.2f}/mês")
print(f"Serverless (Lambda+DDB): ${serverless:.2f}/mês")
print(f"ECONOMIA: ${economia:.2f}/mês ({percentual:.1f}%)")
```

---

## Tabela de Preços AWS (2025)

### Serviços Principais

| Serviço | Métrica | Preço |
|---------|---------|-------|
| **Lambda** | por ms-GB | $0.0000166667 |
| **DynamoDB (leitura)** | por 1M operações | $1.25 |
| **DynamoDB (escrita)** | por 1M operações | $6.25 |
| **Aurora Serverless** | por ACU/hora | $0.06 |
| **RDS Aurora** | por instância | $0.15-$1.95/hora |
| **API Gateway** | por 1M requisições | $7.50 |
| **S3** | por GB/mês | $0.023 |
| **CloudFront** | por GB distribuído | $0.085 |
| **SQS** | por 1M requisições | $0.40 |
| **CloudWatch Logs** | por GB ingerido | $0.50 |

---

## Ferramentas de Cálculo

### AWS Cost Calculator
- Link: https://calculator.aws/
- Use para estimativas detalhadas

### AWS Pricing Calculator
- Link: https://pricing.aws.amazon.com/
- Mais preciso que o antigo Simple Calculator

### Recursos
- [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
- [AWS Budget Alerts](https://console.aws.amazon.com/billing/home?#/budgets)
- [AWS Trusted Advisor](https://console.aws.amazon.com/trustedadvisor)

