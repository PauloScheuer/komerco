import Knex from 'knex';
import api from '../../services/api';
import allStocks from '../../stocks';
export async function seed(knex: Knex) {
  const trx = await knex.transaction();
  for await (const stock of allStocks) {
    const { name, simble, type } = stock;
    try {
      const insertedIds = await trx('stocks').insert({
        nameStock: name,
        simbleStock: simble,
        typeStock: type,
      });
      const id = insertedIds[0];
      //insere os preços
      const prices = await api.get(
        `query?function=TIME_SERIES_DAILY&symbol=${simble}.SA&apikey=${process.env.API_KEY}&outputsize=full`
      );
      const data = prices.data['Time Series (Daily)'];
      const toArray = Object.keys(data).map((k) => data[k]);
      const mappedPrices = toArray.map((obj: any, index: number) => {
        const min = obj['3. low'];
        const max = obj['2. high'];
        const open = obj['1. open'];
        const close = obj['4. close'];
        const absoluteVariation = close - open;
        const percentVariation = (100 * absoluteVariation) / open;
        const hasGrown = absoluteVariation > 0 ? true : false;
        return {
          idStock: id,
          typePrice: 'daily',
          datePrice: Object.keys(prices.data['Time Series (Daily)'])[index],
          minPrice: min,
          maxPrice: max,
          openPrice: open,
          closePrice: close,
          hasGrownPrice: hasGrown,
          absoluteVariationPrice: absoluteVariation,
          percentVariationPrice: percentVariation,
        };
      });
      const daysPerInsert = 80;
      const length = toArray.length;
      const maxDays = length >= 2000 ? 2000 : length;
      const howManyInserts = Math.ceil(maxDays / daysPerInsert);
      let i = 0;
      while (i < howManyInserts) {
        const inserted = i * daysPerInsert;
        const toInsert =
          2000 - inserted < daysPerInsert ? 2000 - inserted : daysPerInsert;
        const data = mappedPrices.splice(0, toInsert);
        await trx('price').insert(data);
        if (i === howManyInserts - 1) {
          console.log({ message: 'Ação inserida no banco de dados' });
        }
        i++;
      }
    } catch (err) {
      console.log({ error: err });
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  await trx.commit();
}
