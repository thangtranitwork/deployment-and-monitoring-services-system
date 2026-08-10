export function parseKVString(str: string): Record<string, any> | any {
  let pos = 0;
  const len = str.length;

  function skipWhitespace() {
    while (pos < len && /\s/.test(str[pos])) pos++;
  }

  function parseValue(): any {
    skipWhitespace();
    if (pos >= len) return undefined;

    const char = str[pos];

    if (char === '{') {
      pos++;
      const obj: Record<string, any> = {};
      while (pos < len) {
        skipWhitespace();
        if (str[pos] === '}') {
          pos++;
          break;
        }
        const kv = parsePair();
        if (kv && kv.key !== undefined) {
          obj[kv.key] = kv.value;
        } else {
          if (pos < len && str[pos] !== '}') pos++;
        }
      }
      return obj;
    }

    if (char === '[') {
      pos++;
      const arr: any[] = [];
      while (pos < len) {
        skipWhitespace();
        if (str[pos] === ']') {
          pos++;
          break;
        }
        const val = parseSingleValue();
        if (val !== undefined) {
          arr.push(val);
        } else {
          pos++;
        }
      }
      return arr;
    }

    return parseSingleValue();
  }

  function parseSingleValue(): any {
    skipWhitespace();
    if (pos >= len) return undefined;

    if (str[pos] === '"' || str[pos] === "'") {
      const quoteChar = str[pos];
      pos++;
      let val = '';
      while (pos < len) {
        if (str[pos] === '\\' && pos + 1 < len) {
          val += str[pos + 1];
          pos += 2;
        } else if (str[pos] === quoteChar) {
          pos++;
          break;
        } else {
          val += str[pos];
          pos++;
        }
      }
      return val;
    }

    if (str[pos] === '{') return parseValue();
    if (str[pos] === '[') return parseValue();

    let start = pos;
    while (pos < len && !/[\s\}\]:]/.test(str[pos])) {
      pos++;
    }
    let raw = str.substring(start, pos);
    if (raw === '') return undefined;

    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null' || raw === '<nil>') return null;
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);

    return raw;
  }

  function parsePair(): { key: string; value: any } | null {
    skipWhitespace();
    if (pos >= len || str[pos] === '}') return null;

    let key = '';
    if (str[pos] === '"' || str[pos] === "'") {
      key = parseSingleValue();
    } else {
      let startKey = pos;
      while (pos < len && !/[\s:]/.test(str[pos])) {
        pos++;
      }
      key = str.substring(startKey, pos);
    }

    skipWhitespace();
    if (pos >= len || str[pos] !== ':') {
      return null;
    }

    pos++;
    skipWhitespace();

    const value = parseValue();
    return { key, value };
  }

  skipWhitespace();

  if (str[pos] === '{') {
    return parseValue();
  }

  const braceIdx = str.indexOf('{');
  const colonIdx = str.indexOf(':');
  if (braceIdx !== -1 && (colonIdx === -1 || braceIdx < colonIdx)) {
    const prefix = str.substring(0, braceIdx).trim();
    if (prefix === '' || !/^[a-zA-Z0-9_-]+$/.test(prefix)) {
      pos = braceIdx;
      return parseValue();
    }
  }

  const result: Record<string, any> = {};
  while (pos < len) {
    skipWhitespace();
    if (pos >= len) break;
    const pair = parsePair();
    if (pair && pair.key) {
      result[pair.key] = pair.value;
    } else {
      pos++;
    }
  }
  return result;
}
