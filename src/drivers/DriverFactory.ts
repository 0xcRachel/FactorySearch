import type { DatabaseDriver } from './DatabaseDriver';
import { SQLiteDriver } from './SQLiteDriver';
import { IndexedDBDriver } from './IndexedDBDriver';
import { MockDriver } from './MockDriver';
import { ApiDriver } from './ApiDriver';
import { JsonDriver } from './JsonDriver';

export type DriverType = 'json' | 'sqlite' | 'indexeddb' | 'api' | 'mock';

export class DriverFactory {
  private static instances: Partial<Record<DriverType, DatabaseDriver>> = {};

  /**
   * Returns a singleton instance of the requested DatabaseDriver
   */
  static getDriver(type: DriverType): DatabaseDriver {
    if (!this.instances[type]) {
      switch (type) {
        case 'json':
          this.instances[type] = new JsonDriver();
          break;
        case 'sqlite':
          this.instances[type] = new SQLiteDriver();
          break;
        case 'indexeddb':
          this.instances[type] = new IndexedDBDriver();
          break;
        case 'api':
          this.instances[type] = new ApiDriver();
          break;
        case 'mock':
          this.instances[type] = new MockDriver();
          break;
        default:
          throw new Error(`Unsupported driver type: ${type}`);
      }
    }
    return this.instances[type]!;
  }
}
export default DriverFactory;

