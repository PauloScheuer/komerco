//encontrar uma maneira de tirar ouliers

import { Request, Response } from 'express';
import knex from '../database/connection';
import api from '../services/api';
import setups from '../setups';
const simulationFixStop = (
  date: string,
  id: number,
  setup: any,
  allPrices: any[]
) => {
  let entry;
  let loss;
  let gain;
  const index = allPrices.findIndex((price) => {
    return price.id === id;
  });
  if (index <= 1) {
    return { entry: false };
  }
  const thisPrice = allPrices[index];
  const whereEntry = setup.entry.price;
  const whereLoss = setup.out.loss;
  const multGain = setup.out.gain;

  entry = thisPrice[whereEntry];
  loss = thisPrice[whereLoss];
  gain = entry + (entry - loss) * multGain;
  allPrices.splice(0, index + 1);

  if (allPrices.length === 0) {
    return { entry: false };
  }
  //allPrices[0] = dia seguinte
  if (allPrices[0].open > entry) {
    entry = allPrices[0].open;
  }
  if (allPrices[0].max < entry) {
    return { entry: false };
  }
  let initialMoney = 400;

  const numberOfStocks = Math.floor(initialMoney / entry);

  let i = 0;
  let result = {};
  while (i < allPrices.length) {
    if (allPrices[i].min <= loss) {
      const boolean = false;
      result = {
        entry: true,
        finish: true,
        boolean,
        numberOfStocks,
        total: loss * numberOfStocks - entry * numberOfStocks,
        profit: ((loss - entry) * 100) / entry,
        howManyTime: i + 1,
        on: [date, entry],
        out: [allPrices[i].date, loss],
      };
      i = allPrices.length;
    } else if (allPrices[i].max >= gain) {
      const boolean = true;
      result = {
        entry: true,
        finish: true,
        boolean,
        numberOfStocks,
        total: gain * numberOfStocks - entry * numberOfStocks,
        profit: ((loss - entry) * 100) / entry,
        howManyTime: i + 1,
        on: [date, entry],
        out: [allPrices[i].date, gain],
      };
      i = allPrices.length;
    } else {
      result = {
        entry: true,
        finish: false,
      };
      i++;
    }
  }

  return result;
};
const simulationMovingStop = (
  date: string,
  id: number,
  setup: any,
  allPrices: any[]
) => {
  const index = allPrices.findIndex((price) => {
    return price.id === id;
  });
  if (index <= 1) {
    return { entry: false };
  }

  const whereEntry = setup.entry.price;
  const firstOut = setup.out.price !== 'null' ? setup.out.price : 0;
  const thisPrice = allPrices[index];
  let entry = thisPrice[whereEntry] + 0.01;
  let out = thisPrice[firstOut];
  let gain = entry + (entry - out) * setup.out.gain;
  allPrices.splice(0, index + 1);

  if (allPrices.length === 0) {
    return { entry: false };
  }
  //allPrices[0] = dia seguinte

  //se abre em gap, puxa a entrada pro gap
  if (allPrices[0].open > entry) {
    entry = allPrices[0].open;
  }
  if (allPrices[0].max < entry) {
    return { entry: false };
  }
  let i = 0;
  let result = {};
  let loss = out;
  let initialMoney = 400;

  const numberOfStocks = Math.floor(initialMoney / entry);
  while (i < allPrices.length) {
    if (allPrices[i].min <= loss) {
      const boolean = loss - entry >= 0 ? true : false;
      result = {
        entry: true,
        finish: true,
        boolean,
        numberOfStocks,
        total: loss * numberOfStocks - entry * numberOfStocks,
        profit: ((loss - entry) * 100) / entry,
        howManyTime: i + 1,
        on: [date, entry],
        out: [allPrices[i].date, loss],
      };
      i = allPrices.length;
    } else if (allPrices[i].max >= gain) {
      result = {
        entry: true,
        finish: true,
        boolean: true,
        numberOfStocks,
        total: gain * numberOfStocks - entry * numberOfStocks,
        profit: ((gain - entry) * 100) / entry,
        howManyTime: i + 1,
        on: [date, entry],
        out: [allPrices[i].date, gain],
      };
      i = allPrices.length;
    } else {
      result = {
        entry: true,
        finish: false,
      };
      //loss = allPrices[i].ma9;
      const allBooleans = setup.out.conditions.map((condition: any) => {
        switch (condition[1]) {
          case '>':
            return allPrices[i][condition[0]] > allPrices[i][condition[2]];
          case '<':
            return allPrices[i][condition[0]] < allPrices[i][condition[2]];
          case '=':
            return allPrices[i][condition[0]] === allPrices[i][condition[2]];
          case '!=':
            return allPrices[i][condition[0]] !== allPrices[i][condition[2]];
          default:
            return false;
        }
      });
      const toReturn = allBooleans.find((boolean: Boolean) => {
        return boolean === false;
      });
      if (toReturn == null) {
        loss = allPrices[i].min;
      }
      i++;
    }
  }

  return result;
};

class StocksController {
  async create(req: Request, res: Response) {
    const { name, simble, type } = req.body;

    try {
      const thisSimbleExists = await knex('stocks')
        .select('*')
        .where('simbleStock', '=', simble);
      if (thisSimbleExists.length > 0) {
        throw new Error('Já existe');
      }
      const trx = await knex.transaction();
      const insertedIds = await trx('stocks').insert({
        nameStock: name,
        simbleStock: simble,
        typeStock: type,
      });
      const id = insertedIds[0];

      //insere os preços diários
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
        i++;
      }
      //insere os preços semanais
      const pricesW = await api.get(
        `query?function=TIME_SERIES_WEEKLY&symbol=${simble}.SA&apikey=${process.env.API_KEY}&outputsize=full`
      );
      const dataW = pricesW.data['Weekly Time Series'];
      const toArrayW = Object.keys(dataW).map((k) => dataW[k]);
      const mappedPricesW = toArrayW.map((obj: any, index: number) => {
        const min = obj['3. low'];
        const max = obj['2. high'];
        const open = obj['1. open'];
        const close = obj['4. close'];
        const absoluteVariation = close - open;
        const percentVariation = (100 * absoluteVariation) / open;
        const hasGrown = absoluteVariation > 0 ? true : false;

        return {
          idStock: id,
          typePrice: 'weekly',
          datePrice: Object.keys(pricesW.data['Weekly Time Series'])[index],
          minPrice: min,
          maxPrice: max,
          openPrice: open,
          closePrice: close,
          hasGrownPrice: hasGrown,
          absoluteVariationPrice: absoluteVariation,
          percentVariationPrice: percentVariation,
        };
      });
      const weeksPerInsert = 80;
      const lengthW = toArrayW.length;

      const maxWeeks = lengthW >= 400 ? 400 : lengthW;
      const howManyInsertsW = Math.ceil(maxWeeks / weeksPerInsert);
      let j = 0;
      while (j < howManyInsertsW) {
        const inserted = j * weeksPerInsert;
        const toInsert =
          400 - inserted < weeksPerInsert ? 400 - inserted : weeksPerInsert;
        const data = mappedPricesW.splice(0, toInsert);

        await trx('price').insert(data);
        if (j === howManyInsertsW - 1) {
          await trx.commit();
          res.send({ message: 'Ação inserida no banco de dados' });
        }
        j++;
      }
    } catch (err) {
      console.log(err);
      res.status(400).send({ error: err });
    }
  }

  async all(req: Request, res: Response) {
    const allStocks = await knex('stocks').select('*');
    const { period, setup, accuracy, mepr, me } = req.query;
    if (period == null) {
      res.status(400).send({ message: 'Informe um período' });
      return;
    }
    if (setup == null) {
      res.status(400).send({ message: 'Informe um período' });
      return;
    }
    let meprFilter: number;
    let accFilter: number;
    let meFilter: number;
    mepr == null ? (meprFilter = -9999) : (meprFilter = Number(mepr));
    accuracy == null ? (accFilter = -9999) : (accFilter = Number(accuracy));
    me == null ? (meFilter = -9999) : (meFilter = Number(me));

    const strSetup = String(setup);
    const useSetup = setups[strSetup];

    try {
      const totalEntries = [];
      const separetedEntries = [];
      for (const stock of allStocks) {
        const idStock = stock.idStock;
        const allPrices = await knex('price')
          .select('*')
          .where('idStock', '=', idStock)
          .and.where('typePrice', '=', String(period));
        allPrices.reverse();

        const mapped = allPrices.map((price, index) => {
          const odbmin =
            index > 1 ? allPrices[index - 1].minPrice : price.minPrice;
          const odbmax =
            index > 1 ? allPrices[index - 1].maxPrice : price.maxPrice;
          const tdbmin =
            index > 1 ? allPrices[index - 2].minPrice : price.minPrice;
          const odbma9 =
            index > 1 ? doMedia(index - 1, allPrices, 9, 'close') : 0;
          const odbma21 =
            index > 1 ? doMedia(index - 1, allPrices, 21, 'close') : 0;
          const odbma50 =
            index > 1 ? doMedia(index - 1, allPrices, 50, 'close') : 0;
          const tdbma9 =
            index > 2 ? doMedia(index - 2, allPrices, 9, 'close') : 0;
          return {
            id: price.idPrice,
            date: price.datePrice,
            min: price.minPrice,
            max: price.maxPrice,
            open: price.openPrice,
            close: price.closePrice,
            hasGrown: price.hasGrownPrice,
            ma9: doMedia(index, allPrices, 9, 'close'),
            ma21: doMedia(index, allPrices, 21, 'close'),
            ma50: doMedia(index, allPrices, 50, 'close'),
            odbopen:
              index > 1 ? allPrices[index - 1].openPrice : price.openPrice,
            odbclose:
              index > 1 ? allPrices[index - 1].closePrice : price.closePrice,
            odbmin,
            odbmax,
            tdbmin,
            odbma9,
            tdbma9,
            odbma21,
            odbma50,
          };
        });

        const conditions = useSetup.entry.conditions;
        const allEntryPoints = mapped.filter((price: any, index) => {
          if (index > 1) {
            const allBooleans = conditions.map((condition: any) => {
              switch (condition[1]) {
                case '>':
                  return price[condition[0]] > price[condition[2]];
                case '<':
                  return price[condition[0]] < price[condition[2]];
                case '=':
                  return price[condition[0]] === price[condition[2]];
                case '!=':
                  return price[condition[0]] !== price[condition[2]];
                default:
                  return false;
              }
            });
            const toReturn = allBooleans.find((boolean: Boolean) => {
              return boolean === false;
            });
            if (toReturn == null) {
              return true;
            } else {
              return false;
            }
          }
          return false;
        });
        const allResults: any[] = [];
        allEntryPoints.forEach((entryPoint) => {
          let test;
          if (useSetup.out.fix === true) {
            test = simulationFixStop(entryPoint.date, entryPoint.id, useSetup, [
              ...mapped,
            ]);
          } else {
            test = simulationMovingStop(
              entryPoint.date,
              entryPoint.id,
              useSetup,
              [...mapped]
            );
          }

          allResults.push(test);
        });
        const onlyEntries = allResults.filter((result) => {
          return (
            result.entry === true &&
            result.finish === true &&
            result.profit < 100
          );
        });
        const mathDid = doTheMath(onlyEntries);
        if (
          mathDid.mathExpectationPerReal > meprFilter &&
          mathDid.accuracy > accFilter &&
          mathDid.mathExpectation > meFilter
        ) {
          totalEntries.push(...onlyEntries);
          separetedEntries.push({
            name: stock.nameStock,
            simble: stock.simbleStock,
            ...doTheMath(onlyEntries),
          });
        }
      }

      const orderedEntries = separetedEntries.sort((a, b) => {
        return b.mathExpectationPerReal - a.mathExpectationPerReal;
      });

      const finalResult = {
        total: doTheMath(totalEntries),
        especific: orderedEntries,
      };
      res.send(finalResult);
    } catch (err) {
      res.status(400).send({ error: err });
    }
  }
  async one(req: Request, res: Response) {
    const idStock = req.params.idStock;

    const { period, setup, accuracy, mepr, me } = req.query;
    if (period == null) {
      res.status(400).send({ message: 'Informe um período' });
      return;
    }
    if (setup == null) {
      res.status(400).send({ message: 'Informe um período' });
      return;
    }
    let meprFilter: number;
    let accFilter: number;
    let meFilter: number;
    mepr == null ? (meprFilter = -9999) : (meprFilter = Number(mepr));
    accuracy == null ? (accFilter = -9999) : (accFilter = Number(accuracy));
    me == null ? (meFilter = -9999) : (meFilter = Number(me));

    const strSetup = String(setup);
    const useSetup = setups[strSetup];

    try {
      const stock: any = await knex('stocks')
        .select('*')
        .where('idStock', '=', idStock);
      if (stock.length !== 1) {
        throw new Error('Ação não encontrada');
      }
      const separetedEntries = [];
      const allPrices = await knex('price')
        .select('*')
        .where('idStock', '=', idStock)
        .and.where('typePrice', '=', String(period));
      allPrices.reverse();

      const mapped = allPrices.map((price, index) => {
        const odbmin = index > 1 ? allPrices[index - 1].minPrice : 0;
        const tdbmin = index > 1 ? allPrices[index - 2].minPrice : 0;
        const odbma9 =
          index > 2 ? doMedia(index - 1, allPrices, 9, 'close') : 0;
        const odbma21 =
          index > 2 ? doMedia(index - 1, allPrices, 21, 'close') : 0;
        const odbma50 =
          index > 2 ? doMedia(index - 1, allPrices, 50, 'close') : 0;
        const tdbma9 =
          index > 2 ? doMedia(index - 2, allPrices, 9, 'close') : 0;
        return {
          id: price.idPrice,
          date: price.datePrice,
          min: price.minPrice,
          max: price.maxPrice,
          open: price.openPrice,
          close: price.closePrice,
          hasGrown: price.hasGrownPrice,
          ma9: doMedia(index, allPrices, 9, 'close'),
          ma21: doMedia(index, allPrices, 21, 'close'),
          ma50: doMedia(index, allPrices, 50, 'close'),
          odbmin,
          tdbmin,
          odbma9,
          tdbma9,
          odbma21,
          odbma50,
        };
      });

      const conditions = useSetup.entry.conditions;
      const allEntryPoints = mapped.filter((price: any, index) => {
        if (index > 1) {
          const allBooleans = conditions.map((condition: any) => {
            switch (condition[1]) {
              case '>':
                return price[condition[0]] > price[condition[2]];
              case '<':
                return price[condition[0]] < price[condition[2]];
              case '=':
                return price[condition[0]] === price[condition[2]];
              case '!=':
                return price[condition[0]] !== price[condition[2]];
              default:
                return false;
            }
          });
          const toReturn = allBooleans.find((boolean: Boolean) => {
            return boolean === false;
          });
          if (toReturn == null) {
            return true;
          } else {
            return false;
          }
        }
        return false;
      });
      const allResults: any[] = [];
      allEntryPoints.forEach((entryPoint, index) => {
        let test;
        if (useSetup.out.fix === true) {
          test = simulationFixStop(entryPoint.date, entryPoint.id, useSetup, [
            ...mapped,
          ]);
        } else {
          test = simulationMovingStop(
            entryPoint.date,
            entryPoint.id,
            useSetup,
            [...mapped]
          );
        }

        allResults.push(test);
        //console.log(index);
      });
      const onlyEntries = allResults.filter((result) => {
        return (
          result.entry === true && result.finish === true && result.profit < 100
        );
      });
      const mathDid = doTheMath(onlyEntries);
      if (
        mathDid.mathExpectationPerReal > meprFilter &&
        mathDid.accuracy > accFilter &&
        mathDid.mathExpectation > meFilter
      ) {
        separetedEntries.push({
          name: stock[0].nameStock,
          simble: stock[0].simbleStock,
          ...doTheMath(onlyEntries),
        });
      }

      const finalResult = {
        separetedEntries,
      };
      res.send(finalResult);
    } catch (err) {
      res.status(400).send({ error: err });
    }
  }
}
function doMedia(index: number, allPrices: any[], time: number, use: string) {
  const period = time - 1;
  const toSub = index > period ? period : index;
  const allPricesCopy = [...allPrices];
  const toCalc = allPricesCopy.splice(index - toSub, toSub + 1);
  const sum = toCalc.reduce((acc, cur) => {
    if (use === 'close') {
      return acc + cur.closePrice;
    } else if (use === 'min') {
      return acc + cur.minPrice;
    } else if (use === 'max') {
      return acc + cur.maxPrice;
    }
  }, 0);
  const ma9 = sum / (toSub + 1);
  return ma9;
}
function doMediaExp(
  index: number,
  allPrices: any[],
  time: number,
  use: string
) {
  const period = time - 1;
  const toSub = index > period ? period : index;
  const allPricesCopy = [...allPrices];
  const toCalc = allPricesCopy.splice(index - toSub, toSub + 1);
  const sum = toCalc.reduce((acc, cur) => {
    if (use === 'close') {
      return acc + cur.closePrice;
    } else if (use === 'min') {
      return acc + cur.minPrice;
    } else if (use === 'max') {
      return acc + cur.maxPrice;
    }
  }, 0);
  const me = sum / (toSub + 1);
  return me;
}
function doTheMath(totalEntries: any[]) {
  const total = totalEntries.length;
  const good = totalEntries.filter((result: any) => result.boolean === true);
  const bad = totalEntries.filter((result: any) => result.boolean === false);
  const mediumWin =
    good.reduce((acc: number, cur: any) => {
      return acc + cur.total;
    }, 0) / good.length;
  const mediumLoose =
    (bad.reduce((acc, cur: any) => {
      return acc + cur.total;
    }, 0) /
      bad.length) *
    -1;
  const mediumTimeGood =
    good.reduce((acc, cur: any) => {
      return acc + cur.howManyTime;
    }, 0) / good.length;
  const mediumTimeBad =
    bad.reduce((acc, cur: any) => {
      return acc + cur.howManyTime;
    }, 0) / bad.length;
  const accuracy = (good.length * 100) / total;
  const mathExpectation =
    (accuracy / 100) * mediumWin - ((100 - accuracy) / 100) * mediumLoose;
  return {
    numberOfEntries: total,
    accuracy: accuracy,
    durationGood: mediumTimeGood,
    durationBad: mediumTimeBad,
    win: mediumWin,
    loose: mediumLoose,
    mathExpectation: mathExpectation,
    mathExpectationPerReal: mathExpectation / mediumLoose,
  };
}

export default StocksController;
