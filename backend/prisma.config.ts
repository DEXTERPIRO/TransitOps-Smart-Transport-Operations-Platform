import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres123@localhost:5432/transitops';

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    async adapter() {
      const pool = new pg.Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
  studio: {
    async adapter() {
      const pool = new pg.Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
