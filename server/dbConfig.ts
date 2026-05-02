import type { PoolConfig } from 'pg';

type DatabaseSource = 'database_url' | 'supabase_derived' | 'missing';

interface ResolvedDatabaseConfig {
  connectionString?: string;
  poolConfig: PoolConfig;
  source: DatabaseSource;
  reason?: string;
}

function withSslIfNeeded(connectionString: string): PoolConfig {
  const usesSsl = connectionString.includes('supabase.co') || process.env.PGSSLMODE === 'require';
  return usesSsl
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { connectionString };
}

function deriveSupabaseConnectionString(): { connectionString?: string; reason?: string } {
  const explicitHost = process.env.SUPABASE_DB_HOST?.trim();
  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() || process.env.SUPABASE_POSTGRES_PASSWORD?.trim();
  const user = process.env.SUPABASE_DB_USER?.trim() || 'postgres';
  const dbName = process.env.SUPABASE_DB_NAME?.trim() || 'postgres';
  const port = process.env.SUPABASE_DB_PORT?.trim() || '5432';

  let host = explicitHost;
  if (!host) {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      return { reason: 'Neither DATABASE_URL nor SUPABASE_URL is set.' };
    }

    try {
      const url = new URL(supabaseUrl);
      const projectRef = url.hostname.split('.')[0];
      if (!projectRef) {
        return { reason: 'SUPABASE_URL is set but project ref could not be parsed.' };
      }
      host = `db.${projectRef}.supabase.co`;
    } catch {
      return { reason: 'SUPABASE_URL is invalid. Expected format: https://<project-ref>.supabase.co' };
    }
  }

  if (!password) {
    return {
      reason:
        'Supabase DB password is missing. Set SUPABASE_DB_PASSWORD (or SUPABASE_POSTGRES_PASSWORD).'
    };
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedDbName = encodeURIComponent(dbName);
  return {
    connectionString: `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDbName}`
  };
}

export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return {
      connectionString: direct,
      poolConfig: {
        ...withSslIfNeeded(direct),
        max: 10
      },
      source: 'database_url'
    };
  }

  const supabaseDirect =
    process.env.SUPABASE_DB_URL?.trim() || process.env.SUPABASE_DATABASE_URL?.trim();
  if (supabaseDirect) {
    return {
      connectionString: supabaseDirect,
      poolConfig: {
        ...withSslIfNeeded(supabaseDirect),
        max: 10
      },
      source: 'supabase_derived'
    };
  }

  const derived = deriveSupabaseConnectionString();
  if (derived.connectionString) {
    return {
      connectionString: derived.connectionString,
      poolConfig: {
        ...withSslIfNeeded(derived.connectionString),
        max: 10
      },
      source: 'supabase_derived'
    };
  }

  return {
    poolConfig: {
      max: 10
    },
    source: 'missing',
    reason: derived.reason
  };
}
