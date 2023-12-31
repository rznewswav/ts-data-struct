import { DataTypeEnum } from './data-type.enum';

export interface PillarBase {
  dataType: DataTypeEnum;
  name: string;
  readonly [Symbol.toStringTag]: string;
}

export interface Pillar<T = unknown> extends PillarBase, Array<T> {}

export function MakePillar<T>(data: T[], name: string): Pillar<T> {
  function checkInsertedValue(t: T) {
    switch (self.dataType) {
      case DataTypeEnum.Unknown:
        switch (typeof t) {
          case 'undefined':
            self.dataType = DataTypeEnum.Unknown;
            break;
          case 'object':
            self.dataType =
              t === null ? DataTypeEnum.Unknown : DataTypeEnum.Object;
            break;
          case 'boolean':
            self.dataType = DataTypeEnum.Boolean;
            break;
          case 'number':
            self.dataType =
              t === Math.floor(t) ? DataTypeEnum.Integer : DataTypeEnum.Double;
            break;
          case 'string':
            self.dataType = DataTypeEnum.String;
            break;
          case 'function':
            // do nothing
            break;
          case 'symbol':
            throw new Error('not yet supported: symbol');
          case 'bigint':
            throw new Error('not yet supported: bigint');
        }
        break;
      case DataTypeEnum.Any:
        self.dataType = DataTypeEnum.Any;
        break;
      case DataTypeEnum.Integer:
        // check if we should promote to double
        if (typeof t !== 'number') {
          self.dataType = DataTypeEnum.Any;
        } else if (isFinite(t) && t !== Math.floor(t)) {
          self.dataType = DataTypeEnum.Double;
        }
        break;
      case DataTypeEnum.Double:
        if (typeof t !== 'number') {
          self.dataType = DataTypeEnum.Any;
        }
        break;
      case DataTypeEnum.Boolean:
        if (typeof t !== 'boolean') {
          self.dataType = DataTypeEnum.Any;
        }
        break;
      case DataTypeEnum.String:
        if (typeof t !== 'string') {
          self.dataType = DataTypeEnum.Any;
        }
        break;
      case DataTypeEnum.Object:
        if (typeof t !== 'object' && t !== undefined) {
          self.dataType = DataTypeEnum.Any;
        }
        break;
    }
  }

  const self: PillarBase = {
    dataType: DataTypeEnum.Unknown,
    name,
    get [Symbol.toStringTag](): string {
      return '[Pillar]';
    },
  };

  data.forEach(checkInsertedValue);
  function push(...items: T[]): number {
    items.forEach(checkInsertedValue);
    return data.push(...items);
  }

  function castToDataType() {
    for (let i = 0; i < data.length; i++) {
      switch (self.dataType) {
        case DataTypeEnum.Integer:
          data[i] = Number(data[i]) as any;
          break;
        case DataTypeEnum.Double:
          data[i] = Number(data[i]) as any;
          break;
        case DataTypeEnum.Boolean:
          data[i] = Boolean(data[i]) as any;
          break;
        case DataTypeEnum.String:
          data[i] = String(data[i]) as any;
          break;
      }
    }
  }

  return new Proxy(self, {
    get(_: any, prop: string | symbol): any {
      if (prop in self) {
        return (self as any)[prop];
      }
      if (prop === 'push') {
        return push;
      }
      if (prop === 'isPillar') {
        return true;
      }
      const accessed = (data as any)[prop];
      return typeof accessed === 'function' ? accessed.bind(data) : accessed;
    },
    set(_: {}, prop: string | symbol, item: any): boolean {
      if (isFinite(+Number(prop))) {
        checkInsertedValue(item);
        (data as any)[prop] =
          typeof item === 'function'
            ? item((data as any)[prop], prop, data)
            : item;
        return true;
      }
      (self as any)[prop] = item;
      if (String(prop) === 'dataType') {
        castToDataType();
      }
      return true;
    },
  }) as unknown as Pillar<T>;
}

if (process.argv.includes('RUN_PILLARS_MAIN')) {
  const p = MakePillar<any>([1, 2, 3], 'number');
  console.log(p[0], p[6], p.dataType);
  p[6] = 'hello';
  console.log(p[0], p[6], p.dataType);
  p.dataType = DataTypeEnum.String;
  console.log(p[0], p[6], p.dataType);
  p.dataType = DataTypeEnum.Integer;
  console.log(p[0], p[6], p.dataType);
}
