import Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('stocks', (table) => {
    table.increments('idStock').primary();
    table.string('simbleStock').notNullable();
    table.string('nameStock').notNullable();
    table.string('typeStock').notNullable();
  });
}
export async function down(knex: Knex) {
  return knex.schema.dropTable('stocks');
}
