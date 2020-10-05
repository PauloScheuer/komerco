import Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('price', (table) => {
    table.increments('idPrice').primary();
    table.string('datePrice').notNullable();
    table.decimal('minPrice').notNullable();
    table.decimal('maxPrice').notNullable();
    table.decimal('openPrice').notNullable();
    table.decimal('closePrice').notNullable();
    table.boolean('hasGrownPrice').notNullable();
    table.decimal('absoluteVariationPrice').notNullable();
    table.decimal('percentVariationPrice').notNullable();
    table.string('typePrice').notNullable();
    table.integer('idStock').references('idStock').inTable('stocks');
  });
}
export async function down(knex: Knex) {
  return knex.schema.dropTable('price');
}
