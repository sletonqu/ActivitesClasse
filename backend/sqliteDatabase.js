const BetterSqlite3 = require('better-sqlite3');

function getCallbackAndParameters(args) {
  const callback = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
  const parameters = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;

  return { callback, parameters };
}

class SqliteDatabase {
  constructor(filePath, callback) {
    try {
      this.database = new BetterSqlite3(filePath);
      this.openError = null;
    } catch (error) {
      this.database = null;
      this.openError = error;
    }

    if (callback) {
      queueMicrotask(() => callback(this.openError));
    } else if (this.openError) {
      throw this.openError;
    }
  }

  _execute(callback, operation, getCallbackContext = () => undefined, getCallbackValues = () => []) {
    if (this.openError) {
      if (callback) {
        queueMicrotask(() => callback(this.openError));
        return this;
      }

      throw this.openError;
    }

    let result;
    try {
      result = operation();
    } catch (error) {
      if (callback) {
        queueMicrotask(() => callback(error));
        return this;
      }

      throw error;
    }

    if (callback) {
      const context = getCallbackContext(result);
      const values = getCallbackValues(result);
      queueMicrotask(() => callback.call(context, null, ...values));
    }

    return this;
  }

  run(sql, ...args) {
    const { callback, parameters } = getCallbackAndParameters(args);

    return this._execute(
      callback,
      () => {
        const result = this.database.prepare(sql).run(...parameters);
        return {
          lastID: Number(result.lastInsertRowid),
          changes: result.changes
        };
      },
      (result) => result
    );
  }

  get(sql, ...args) {
    const { callback, parameters } = getCallbackAndParameters(args);
    return this._execute(callback, () => this.database.prepare(sql).get(...parameters), undefined, (row) => [row]);
  }

  all(sql, ...args) {
    const { callback, parameters } = getCallbackAndParameters(args);
    return this._execute(callback, () => this.database.prepare(sql).all(...parameters), undefined, (rows) => [rows]);
  }

  exec(sql, callback) {
    return this._execute(callback, () => this.database.exec(sql));
  }

  serialize(callback) {
    if (callback) {
      callback();
    }

    return this;
  }

  close(callback) {
    return this._execute(callback, () => this.database.close());
  }
}

module.exports = SqliteDatabase;
