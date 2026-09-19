import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const articles=sqliteTable('articles',{id:text('id').primaryKey(),title:text('title').notNull(),content:text('content').notNull(),transcript:text('transcript').notNull().default(''),url:text('url').notNull().default(''),collection:text('collection').notNull().default('Inbox'),tags:text('tags').notNull().default(''),favorite:integer('favorite').notNull().default(0),created:text('created').notNull()});
export const collections=sqliteTable('collections',{name:text('name').primaryKey()});
