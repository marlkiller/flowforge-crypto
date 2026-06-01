/**
 * Sync WORKFLOW_GEN_PROMPT.md with actual node definitions.
 * Run: node scripts/sync-prompt.mjs
 *
 * Handles:
 *   - registerNodeDef("kind", { meta: {...} })           inline
 *   - registerNodeDef("kind", varName)                   var ref
 *   - registerNodeDef("kind", funcName(args...))         factory
 *   - registerLazyNode("kind", META_CONST, ...)           lazy direct
 *   - ARRAY.forEach((meta) => { registerLazyNode(...) }) lazy forEach
 *   - meta via var ref in node def (meta: CONST_REF)
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const NODES_DIR = join(ROOT, "src", "lib", "crypto", "nodes");
const SETUP_FILE = join(ROOT, "src", "lib", "crypto", "setup.ts");
const META_FILE = join(NODES_DIR, "meta.ts");
const PROMPT_FILE = join(ROOT, "WORKFLOW_GEN_PROMPT.md");

// ─── Brace matching ────────────────────────────────────────────

function extractBrackets(str, startIdx, open = "{", close = "}") {
  let depth = 1,
    i = startIdx;
  while (i < str.length && depth > 0) {
    if (str[i] === open) depth++;
    else if (str[i] === close) depth--;
    i++;
  }
  return str.slice(startIdx, i - 1);
}

// ─── Meta parsing ──────────────────────────────────────────────

function removeBracketedBlock(raw, key, open = "[", close = "]") {
  const re = new RegExp(`${key}\\s*:\\s*\\${open}`);
  const m = re.exec(raw);
  if (!m) return raw;
  const start = m.index + m[0].length;
  const body = extractBrackets(raw, start, open, close);
  const fullMatch = raw.slice(m.index, m.index + m[0].length + body.length + 1); // +1 for close bracket
  return raw.replace(fullMatch, "");
}

function stripNested(raw) {
  let r = raw;
  r = removeBracketedBlock(r, "inputs");
  r = removeBracketedBlock(r, "outputs");
  return r;
}

function topValue(raw, key) {
  const re = new RegExp(`(?:^|[,;\\s])${key}\\s*:\\s*["'\`]([^"'\`]*)["'\`]`);
  const m = re.exec(raw);
  return m ? m[1] : null;
}

function parseMetaStr(kind, raw) {
  // Strip nested structures before reading top-level keys
  const top = stripNested(raw);
  const label = topValue(top, "label");
  const cat = topValue(top, "category");
  if (!label || !cat) return null;

  let inputs = "(none)";
  const im = raw.match(/inputs\s*:\s*\[/);
  if (im) {
    const start = im.index + im[0].length - 1; // position at '['
    const body = extractBrackets(raw, start + 1, "[", "]");
    inputs = parseInputs("[" + body + "]");
  }
  let outputs = "default";
  const om = raw.match(/outputs\s*:\s*\[/);
  if (om) {
    const start = om.index + om[0].length - 1; // position at '['
    const body = extractBrackets(raw, start + 1, "[", "]");
    outputs = parseOutputs("[" + body + "]");
  }
  return {
    kind,
    label,
    category: cat,
    description: topValue(top, "description") || "",
    inputs,
    outputs,
  };
}

function parseInputs(arr) {
  const items = [];
  let i = 0;
  while (i < arr.length) {
    const pos = arr.indexOf("{", i);
    if (pos === -1 || pos >= arr.length - 1) break;
    const body = extractBrackets(arr, pos + 1);
    i = pos + body.length + 2;
    const id = body.match(/id\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
    if (!id) continue;
    const type = body.match(/type\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
    const connectable = !body.includes("connectable: false");
    const acceptRaw = body.match(/acceptTypes\s*:\s*\[([^\]]+)\]/);
    let s = id;
    if (type) s += `:${type}`;
    if (connectable && acceptRaw) {
      const t = acceptRaw[1]
        .split(",")
        .map((x) =>
          x
            .trim()
            .replace(/["'`]/g, "")
            .replace(/\s+as\s+const/g, ""),
        )
        .filter((x) => x !== "raw")
        .join("/");
      if (t) s += `:${t}`;
    }
    if (!connectable && type === "select" && body.includes("options:")) {
      const vals = [...body.matchAll(/value\s*:\s*["'`]([^"'`]+)["'`]/g)]
        .map((m) => m[1])
        .slice(0, 7);
      if (vals.length) s += `(${vals.join("/")})`;
    }
    items.push(s);
  }
  return items.length ? items.join(", ") : "(none)";
}

function parseOutputs(arr) {
  const ids = [];
  let i = 0;
  while (i < arr.length) {
    const pos = arr.indexOf("{", i);
    if (pos === -1) break;
    const body = extractBrackets(arr, pos + 1);
    i = pos + body.length + 2;
    const id = body.match(/id\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
    if (id) ids.push(id);
  }
  return ids.length ? ids.join(", ") : "default";
}

function getMetaBlockFromObjBody(body) {
  const metaIdx = body.search(/meta\s*:/);
  if (metaIdx === -1) return null;
  const afterMeta = metaIdx + body.slice(metaIdx).match(/meta\s*:/)[0].length;
  // Meta value might be { (inline object) or IDENTIFIER (variable reference)
  const trimmed = body.slice(afterMeta).trim();
  if (trimmed.startsWith("{")) {
    return extractBrackets(body, afterMeta + 1);
  }
  // Variable reference - return the identifier name
  const idMatch = trimmed.match(/^(\w+)/);
  return idMatch ? { varRef: idMatch[1] } : null;
}

// ─── Find meta constants in TypeScript code ────────────────────

function findMetaConstDef(code, constName) {
  // export const X: NodeKindMeta = { ... }
  const re1 = new RegExp(`export\\s+const\\s+${constName}\\s*:\\s*\\w+\\s*=\\s*\\{`);
  let m = re1.exec(code);
  if (m) {
    const body = extractBrackets(code, m.index + m[0].length);
    return "{" + body + "}";
  }
  // export const X = makeHashMeta(...)
  const re2 = new RegExp(`export\\s+const\\s+${constName}\\s*=\\s*makeHashMeta\\(([^;]+)\\);`);
  m = re2.exec(code);
  if (m) {
    const args = m[1].split(",").map((s) => s.trim().replace(/["'`]/g, ""));
    return `{ kind:"${args[0]}", label:"${args[1]}", category:"hash", description:"${args[2] || ""}", inputs:[{id:"data",connectable:true,acceptTypes:["raw"]}] }`;
  }
  // const X: NodeKindMeta = { ... } (no export)
  const re3 = new RegExp(`const\\s+${constName}\\s*:\\s*\\w+\\s*=\\s*\\{`);
  m = re3.exec(code);
  if (m) {
    const body = extractBrackets(code, m.index + m[0].length);
    return "{" + body + "}";
  }
  return null;
}

// ─── Extract nodes from file ───────────────────────────────────

function extractNodes(code, metaFileCode) {
  const results = [];

  // Pattern A: registerNodeDef("kind", { meta: {...} })
  const patA = /registerNodeDef\(\s*["'`]([^"'`]+)["'`]\s*,\s*\{/g;
  let m;
  while ((m = patA.exec(code)) !== null) {
    const kind = m[1];
    const body = extractBrackets(code, m.index + m[0].length);
    const metaRaw = getMetaBlockFromObjBody(body);
    if (!metaRaw || metaRaw.varRef) continue;
    const entry = parseMetaStr(kind, metaRaw);
    if (entry) results.push(entry);
  }

  // Pattern B: registerNodeDef("kind", varName) — resolve meta inline or via const ref
  const patB = /registerNodeDef\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\)/g;
  while ((m = patB.exec(code)) !== null) {
    const kind = m[1],
      varName = m[2];
    if (results.some((e) => e.kind === kind)) continue;
    const vRe = new RegExp(`(?:const|let|var)\\s+${varName}\\s*(?:\\:\\s*\\w+)?\\s*=\\s*\\{`);
    const vm = vRe.exec(code);
    if (!vm) continue;
    const varBody = extractBrackets(code, vm.index + vm[0].length);
    const metaRaw = getMetaBlockFromObjBody(varBody);
    if (!metaRaw) continue;
    if (metaRaw.varRef) {
      // Meta is a variable reference — look up the constant
      const metaDef =
        findMetaConstDef(code, metaRaw.varRef) || findMetaConstDef(metaFileCode, metaRaw.varRef);
      if (metaDef) {
        const entry = parseMetaStr(kind, metaDef);
        if (entry) results.push(entry);
      }
    } else {
      const entry = parseMetaStr(kind, metaRaw);
      if (entry) results.push(entry);
    }
  }

  // Pattern C: registerNodeDef("kind", funcName(args...))
  const patC = /registerNodeDef\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\(/g;
  while ((m = patC.exec(code)) !== null) {
    const kind = m[1],
      funcName = m[2];
    if (results.some((e) => e.kind === kind)) continue;
    const argStr = extractBrackets(code, m.index + m[0].length, "(", ")");

    // Check if the function body contains inline meta
    const fnBody = findFuncBody(code, funcName);
    if (!fnBody) continue;

    // Look for `return { meta, ... }` — if meta is a parameter, find it in args
    // Look for `return { meta: { ... } }` — inline meta in factory
    const retIdx = fnBody.search(/return\s+/);
    if (retIdx === -1) continue;
    const afterRet = retIdx + fnBody.slice(retIdx).match(/return\s+/)[0].length;
    const retObjStart = fnBody.indexOf("{", afterRet);
    if (retObjStart === -1) continue;
    const retObjBody = extractBrackets(fnBody, retObjStart + 1);
    const metaRaw = getMetaBlockFromObjBody(retObjBody);

    if (metaRaw && !metaRaw.varRef) {
      // Inline meta in factory — try to resolve param refs
      const fnDeclRe = new RegExp(`function\\s+${funcName}\\s*\\(([^)]*)\\)`);
      const fnDecl = fnDeclRe.exec(code);
      const params = fnDecl
        ? fnDecl[1]
            .split(",")
            .map((p) => p.trim().split(/[:=]/)[0].trim())
            .filter(Boolean)
        : [];
      const argValues = argStr.split(",").map((a) => a.trim().replace(/^["'`]|["'`]$/g, ""));
      let resolved = metaRaw;
      for (let i = 0; i < params.length && i < argValues.length; i++) {
        const p = params[i],
          v = argValues[i];
        resolved = resolved.replace(new RegExp(`\\$\\{${p}\\}`, "g"), v);
        resolved = resolved.replace(new RegExp(`${p}\\.toLowerCase\\(\\)`, "g"), v.toLowerCase());
        // Shorthand property: param, or param} -> param: "value",
        resolved = resolved.replace(
          new RegExp(`(?<![\\w"'\`])${p}(?=\\s*[,}])`, "g"),
          `${p}: "${v}"`,
        );
      }
      const entry = parseMetaStr(kind, resolved);
      if (entry) results.push(entry);
    } else if (metaRaw && metaRaw.varRef) {
      // Factory returns a parameter directly as meta — find this param in args
      // e.g. makeHashNode("SHA-256", SHA256_META) -> returns { meta: SHA256_META }
      // SHA256_META is the second arg
      const fnDeclRe = new RegExp(`function\\s+${funcName}\\s*\\(([^)]*)\\)`);
      const fnDecl = fnDeclRe.exec(code);
      if (fnDecl) {
        const params = fnDecl[1]
          .split(",")
          .map((p) => p.trim().split(/[:=]/)[0].trim())
          .filter(Boolean);
        const argValues = argStr.split(",").map((a) => a.trim());
        const metaParamIndex = params.indexOf(metaRaw.varRef);
        if (metaParamIndex !== -1 && metaParamIndex < argValues.length) {
          const metaConstName = argValues[metaParamIndex].trim();
          const metaDef =
            findMetaConstDef(metaFileCode, metaConstName) || findMetaConstDef(code, metaConstName);
          if (metaDef) {
            const entry = parseMetaStr(kind, metaDef);
            if (entry) results.push(entry);
          }
        }
      }
    }
  }

  return results;
}

function findFuncBody(code, name) {
  const re = new RegExp(
    `function\\s+${name}\\s*\\([^)]*\\)\\s*(?:\\s*:\\s*\\w+(?:<[^>]*>)?)?\\s*\\{`,
  );
  const m = re.exec(code);
  if (!m) return null;
  return extractBrackets(code, m.index + m[0].length);
}

// ─── Lazy node extraction ──────────────────────────────────────

function extractLazyMetas() {
  const setup = readFileSync(SETUP_FILE, "utf-8");
  const map = new Map();

  // Pattern 1: registerLazyNode("kind", META_CONST, ...)
  const re1 = /registerLazyNode\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*,/g;
  let m;
  while ((m = re1.exec(setup)) !== null) map.set(m[1], m[2]);

  // Pattern 2: ARRAY.forEach((meta) => { registerLazyNode(meta.kind, meta, ...) })
  const forEachRe =
    /(\w+)\s*\.\s*forEach\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*\{?\s*registerLazyNode\(\s*\w+\.kind\s*,/g;
  while ((m = forEachRe.exec(setup)) !== null) {
    const arrName = m[1];
    const arrRe = new RegExp(`(?:const|let|var)\\s+${arrName}\\s*=\\s*\\[`);
    const am = arrRe.exec(setup);
    if (!am) continue;
    const arrBody = extractBrackets(setup, am.index + am[0].length);
    const elements = arrBody
      .split(",")
      .map((s) => s.trim().replace(/[\[\]]/g, ""))
      .filter(Boolean);
    for (const el of elements) {
      // Don't map yet — we need to resolve kind from the meta constant
      // Store as a virtual mapping: kind = el (we'll resolve kind from mcMap later)
      map.set("__forEach_" + el, el);
    }
  }

  return map;
}

function extractMetaConstants(code) {
  const r = [];
  // makeHashMeta factory
  const fRe = /export\s+const\s+(\w+)\s*=\s*makeHashMeta\(([^;]+)\);/g;
  let m;
  while ((m = fRe.exec(code)) !== null) {
    const args = m[2].split(",").map((s) => s.trim().replace(/["'`]/g, ""));
    r.push({
      name: m[1],
      metaStr: `{ kind:"${args[0]}", label:"${args[1]}", category:"hash", description:"${args[2] || ""}", inputs:[{id:"data",connectable:true,acceptTypes:["raw"]}] }`,
    });
  }
  // Direct object
  const oRe = /export\s+const\s+(\w+)\s*:\s*NodeKindMeta\s*=\s*\{/g;
  while ((m = oRe.exec(code)) !== null) {
    const body = extractBrackets(code, m.index + m[0].length);
    r.push({ name: m[1], metaStr: "{" + body + "}" });
  }
  return r;
}

// ─── Main ──────────────────────────────────────────────────────

function main() {
  const all = [];
  const metaFileCode = readFileSync(META_FILE, "utf-8");

  // 1. Scan all node files
  const files = readdirSync(NODES_DIR).filter((f) => f.endsWith(".ts") && f !== "meta.ts");
  for (const f of files) {
    const code = readFileSync(join(NODES_DIR, f), "utf-8");
    const entries = extractNodes(code, metaFileCode);
    console.log(`  ${f.padEnd(16)} ${entries.length} nodes`);
    all.push(...entries);
  }

  // 2. Lazy nodes
  const lazyMap = extractLazyMetas();
  const metaConsts = extractMetaConstants(metaFileCode);
  const mcMap = new Map(metaConsts.map((x) => [x.name, x.metaStr]));
  for (const [kind, constName] of lazyMap) {
    if (kind.startsWith("__forEach_")) {
      // For forEach pattern, resolve kind from the meta constant
      const actualConstName = constName;
      const metaStr = mcMap.get(actualConstName);
      if (metaStr) {
        const actualKind = topValue(stripNested(metaStr), "kind");
        if (actualKind && !all.some((e) => e.kind === actualKind)) {
          const entry = parseMetaStr(actualKind, metaStr);
          if (entry) all.push(entry);
        }
      }
      continue;
    }
    if (all.some((e) => e.kind === kind)) continue;
    const metaStr = mcMap.get(constName);
    if (metaStr) {
      const entry = parseMetaStr(kind, metaStr);
      if (entry) all.push(entry);
    }
  }

  // 3. Sort
  const order = [
    "io",
    "ui",
    "string",
    "encoding",
    "hash",
    "cipher",
    "asymmetric",
    "mac",
    "kdf",
    "entropy",
    "protocol",
    "legacy",
    "pqc",
    "analysis",
  ];
  all.sort((a, b) => {
    const ca = order.indexOf(a.category),
      cb = order.indexOf(b.category);
    return ca !== cb ? ca - cb : a.label.localeCompare(b.label);
  });

  // 4. Build catalog
  let cat = "";
  let cur = "";
  for (const e of all) {
    if (e.category !== cur) {
      cur = e.category;
      cat += `\n=== ${cur} ===\n`;
    }
    cat += `${e.kind} | ${e.label} | ${e.inputs} | ${e.outputs}\n`;
  }

  const h = readFileSync(join(__dirname, "_prompt_header.md"), "utf-8");
  const f = readFileSync(join(__dirname, "_prompt_footer.md"), "utf-8");
  writeFileSync(PROMPT_FILE, h + cat + f, "utf-8");
  console.log(`\n✅ Synced ${all.length} nodes to WORKFLOW_GEN_PROMPT.md`);
}

main();
