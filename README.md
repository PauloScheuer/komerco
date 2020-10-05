# Komerco

## Api para testes de setups de trading

### Tecnologias:

- Node.js
- Express
- Typescript
- Knex.js
- etc

### Ideia da aplicação:

A ideia da api é realizar testes de diferentes setups de swing trade (estratégia de operação na bolsa de valores) de ações que compoem o indíce Ibovespa. Essas ações estão no arquivo "stocks.ts", dentro da pasta src/ e as regras dos setups estão na mesma pasta, no arquivo setups.ts. Ambos arquivos podem ser editados conforme a necessidade do usuário.

### Funcionamento:

- O usuário deve criar uma chave de acesso no site https://www.alphavantage.co (que prove os dados necessários) e, conforme o arquivo .env.example, colocar essa chave dentro de uma variável de ambiente API_KEY

- Após isso, o usuário deve rodar o comando "db", que cria o banco de dados e o comando "db-sd", que insere nesse banco os dados das ações informadas em stocks.ts referentes aos últimos 2000 pregões, no caso de fechamentos diários, ou 400 pregões, no caso de fechamento semanal. (Esses passos podem demorar um tempo, visto que a fonte dos dados limita a 5 acessos por minuto).

- Agora, para realizar os testes, basta enviar uma requisição a api con os seguintes parâmetros:
  period, setup, accuracy, mepr, me
  -- period: se refere a fechamentos diários (informar 'daily') ou semanais (informar 'weekly');
  -- setup: o nome do setup desejado;
  -- accuracy (opcional): filtra os resultados acima da acurácia informada;
  -- mepr (opcional): filtra os resultados que possuem uma expectativa matemática por real maior que a informada;
  -- me (opcional): filtra os resultados que possuem uma expectative matemática maior que a informada.
