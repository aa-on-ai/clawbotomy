import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';

// Loaded only by the supported dev supervisor, never by next build/start.
// Webpack can re-emit a chunk while Next streams that same file. Opening the
// target with 'w' truncates an in-flight reader and can produce a successful
// HTTP response containing only a JS prefix. Publish complete replacements by
// rename so existing readers keep their original inode until they finish.
const chunks = resolve('.next/static/chunks') + sep;
const writeFile = fs.writeFile;
fs.writeFile = function (file, data, options, callback) {
  if (typeof options === 'function') { callback = options; options = undefined; }
  const target = typeof file === 'string' ? resolve(file) : undefined;
  const flag = typeof options === 'object' && options !== null ? options.flag : undefined;
  if (!target?.startsWith(chunks) || !target.endsWith('.js')
    || typeof callback !== 'function' || (flag !== undefined && flag !== 'w')) {
    return writeFile.call(fs, file, data, options, callback);
  }
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  const fail = error => fs.unlink(temporary, () => callback(error));
  return writeFile.call(fs, temporary, data, options, error => {
    if (error) return fail(error);
    fs.rename(temporary, target, error => {
      if (error) return fail(error);
      callback(null);
    });
  });
};
