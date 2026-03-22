#!/usr/bin/env node

try {
  require("dotenv").config();
} catch {
  // dotenv es opcional; el script puede usar variables ya definidas en el entorno.
}
function parseArgs(argv) {
  const args = {
    dryRun: false,
    includeInactive: false,
    limit: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--include-inactive") {
      args.includeInactive = true;
      continue;
    }

    if (arg.startsWith("--club-id=")) {
      args.clubId = arg.split("=")[1];
      continue;
    }

    if (arg.startsWith("--club-name=")) {
      args.clubName = arg.split("=")[1];
      continue;
    }

    if (arg.startsWith("--redirect-to=")) {
      args.redirectTo = arg.split("=")[1];
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("--limit debe ser un numero mayor a 0");
      }
      args.limit = value;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Argumento no soportado: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`\nUso:\n  node scripts/reset-club-passwords.cjs --club-id=<uuid> [opciones]\n  node scripts/reset-club-passwords.cjs --club-name=<nombre exacto> [opciones]\n\nOpciones:\n  --club-id=<uuid>          ID del club objetivo\n  --club-name=<nombre>      Nombre exacto del club (alternativa a --club-id)\n  --redirect-to=<url>       URL de redireccion de recovery\n  --include-inactive        Incluye miembros inactivos\n  --limit=<n>               Limita la cantidad de usuarios a procesar\n  --dry-run                 Solo muestra a quienes se enviaria, no envia correos\n  --help, -h                Muestra esta ayuda\n\nVariables de entorno requeridas:\n  SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n\nOpcionales:\n  RESET_PASSWORD_REDIRECT_TO\n  APP_URL (fallback para redirect: APP_URL/reset-password)\n\nEjemplos:\n  node scripts/reset-club-passwords.cjs --club-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --dry-run\n  node scripts/reset-club-passwords.cjs --club-name="Club Arqueria Centro" --redirect-to=https://app.midominio.com/reset-password\n`);
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value.trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidRecoveryEmail(email) {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.endsWith("@sin-email.clubarchery.local")) return false;
  return true;
}

async function resolveClubId(supabase, args) {
  if (args.clubId) return args.clubId;

  if (!args.clubName) {
    throw new Error("Debes indicar --club-id o --club-name");
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("name", args.clubName)
    .limit(2);

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error(`No se encontro club con nombre exacto: ${args.clubName}`);
  }

  if (data.length > 1) {
    throw new Error(`Hay mas de un club con nombre ${args.clubName}. Usa --club-id.`);
  }

  return data[0].id;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch {
    throw new Error("No se encontro @supabase/supabase-js. Ejecuta pnpm install antes de usar este script.");
  }

  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const redirectTo =
    args.redirectTo ||
    process.env.RESET_PASSWORD_REDIRECT_TO ||
    (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/reset-password` : null);

  if (!redirectTo) {
    throw new Error(
      "Debes indicar --redirect-to o definir RESET_PASSWORD_REDIRECT_TO/APP_URL en .env"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const clubId = await resolveClubId(supabase, args);

  let query = supabase
    .from("members")
    .select("id, full_name, email, status")
    .eq("club_id", clubId)
    .order("full_name", { ascending: true });

  if (!args.includeInactive) {
    query = query.eq("status", "activo");
  }

  if (args.limit) {
    query = query.limit(args.limit);
  }

  const { data: members, error: membersError } = await query;
  if (membersError) throw membersError;

  const candidates = (members || []).filter((m) => isValidRecoveryEmail(m.email));

  const uniqueByEmail = new Map();
  for (const m of candidates) {
    const normalizedEmail = m.email.trim().toLowerCase();
    if (!uniqueByEmail.has(normalizedEmail)) {
      uniqueByEmail.set(normalizedEmail, m);
    }
  }

  const recipients = Array.from(uniqueByEmail.values());

  console.log("\n=== Reset masivo por club ===");
  console.log(`Club ID: ${clubId}`);
  console.log(`Redirect: ${redirectTo}`);
  console.log(`Miembros leidos: ${(members || []).length}`);
  console.log(`Candidatos con email valido: ${candidates.length}`);
  console.log(`Correos unicos a enviar: ${recipients.length}`);
  console.log(`Modo: ${args.dryRun ? "DRY RUN" : "ENVIO REAL"}`);

  if (recipients.length === 0) {
    console.log("\nNo hay usuarios elegibles para enviar recuperacion.");
    return;
  }

  let ok = 0;
  let fail = 0;
  const failures = [];

  for (const m of recipients) {
    const email = m.email.trim().toLowerCase();

    if (args.dryRun) {
      console.log(`[DRY RUN] ${m.full_name} <${email}>`);
      continue;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      fail += 1;
      failures.push({ email, error: error.message });
      console.error(`[ERROR] ${email}: ${error.message}`);
    } else {
      ok += 1;
      console.log(`[OK] ${email}`);
    }

    // Evita disparar demasiadas solicitudes seguidas.
    await delay(120);
  }

  if (args.dryRun) {
    console.log(`\nDRY RUN finalizado. Total potencial: ${recipients.length}`);
    return;
  }

  console.log("\n=== Resumen ===");
  console.log(`Enviados OK: ${ok}`);
  console.log(`Fallidos: ${fail}`);

  if (failures.length > 0) {
    console.log("\nDetalle de errores:");
    for (const item of failures) {
      console.log(`- ${item.email}: ${item.error}`);
    }

    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error("\nFallo en reset-club-passwords:");
  console.error(err?.message || err);
  process.exit(1);
});
