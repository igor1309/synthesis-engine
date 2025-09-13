const SECRET_KEYS = /token|key|secret|authorization|password|pat/i;

export function redactMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  return deepMap(meta, (key, val) => {
    if (SECRET_KEYS.test(String(key))) return mask(String(val));
    if (typeof val === 'string') return redactText(val);
    return val;
  });
}

export function redactText(text) {
  let s = String(text);
  const gh = process.env.GH_PAT;
  const oa = process.env.OPENAI_API_KEY;
  if (gh) s = s.split(gh).join(mask(gh));
  if (oa) s = s.split(oa).join(mask(oa));
  return s;
}

function mask(v) {
  const str = String(v);
  if (str.length <= 6) return '*'.repeat(str.length);
  return str.slice(0, 3) + '***' + str.slice(-3);
}

function deepMap(obj, fn) {
  if (Array.isArray(obj)) return obj.map((v) => deepMap(v, (k, vv) => vv));
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMap(v, fn);
    } else {
      out[k] = fn(k, v);
    }
  }
  return out;
}

