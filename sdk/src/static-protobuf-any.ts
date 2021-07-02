/*
 * Copyright 2021 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Message } from 'google-protobuf';
import { Any } from 'google-protobuf/google/protobuf/any_pb';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Type } from 'google-protobuf/google/protobuf/type_pb';
import * as wrappers from 'google-protobuf/google/protobuf/wrappers_pb';
import Long from 'long';

const AkkaServerlessPrimitive = 'p.akkaserverless.com/';
const AkkaServerlessSupportedPrimitiveTypes = [
  'string',
  'bytes',
  'int64',
  'bool',
  'double',
];

// function isPrimitiveDefaultValue(obj, type) {
//   if (Long.isLong(obj)) return obj.equals(Long.ZERO);
//   else if (Buffer.isBuffer(obj)) return !obj.length;
//   else return obj === protobuf.types.defaults[type];
// }

// function serializePrimitiveValue(obj, type) {
//   if (this.isPrimitiveDefaultValue(obj, type)) return EmptyArray;
//   const writer = new protobuf.Writer();
//   // First write the field key.
//   // Field index is always 15, which gets shifted left by 3 bits (ie, 120).
//   writer.uint32(
//     (AkkaServerlessPrimitiveFieldNumberEncoded |
//       protobuf.types.basic[type]) >>>
//       0,
//   );
//   // Now write the primitive
//   writer[type](obj);
//   return writer.finish();
// }

//   /** Basic type defaults. From protobufjs */
//   const protoDefaults: {
//     "double": number,
//     "float": number,
//     "int32": number,
//     "uint32": number,
//     "sint32": number,
//     "fixed32": number,
//     "sfixed32": number,
//     "int64": number,
//     "uint64": number,
//     "sint64": number,
//     "fixed64": number,
//     "sfixed64": number,
//     "bool": boolean,
//     "string": string,
//     "bytes": number[],
//     "message": null
// };

const primitiveDefaults: Map<string, Message> = new Map<string, Message>([
  ['bool', new wrappers.BoolValue()],
  ['bytes', new wrappers.BytesValue()],
  ['double', new wrappers.DoubleValue()],
  ['float', new wrappers.FloatValue()],
  ['int32', new wrappers.Int32Value()],
  ['int64', new wrappers.Int64Value()],
  ['string', new wrappers.StringValue()],
  ['uint32', new wrappers.UInt32Value()],
  ['uint64', new wrappers.UInt64Value()],
]);

const primitiveDefaultValues: Map<string, any> = new Map<string, any>([
  ['bool', new wrappers.BoolValue().getValue()],
  ['bytes', new wrappers.BytesValue().getValue()],
  ['double', new wrappers.DoubleValue().getValue()],
  ['float', new wrappers.FloatValue().getValue()],
  ['int32', new wrappers.Int32Value().getValue()],
  ['int64', new wrappers.Int64Value().getValue()],
  ['string', new wrappers.StringValue().getValue()],
  ['uint32', new wrappers.UInt32Value().getValue()],
  ['uint64', new wrappers.UInt64Value().getValue()],
]);

function isPrimitiveDefaultValue(obj: any, type: string) {
  if (Long.isLong(obj)) return obj.equals(Long.ZERO);
  else if (Buffer.isBuffer(obj)) return !obj.length;
  else return obj === primitiveDefaultValues.get(type);
}

function serializePrimitiveValue(obj: any, type: string): Uint8Array {
  if (isPrimitiveDefaultValue(obj, type)) return new Empty().serializeBinary();

  switch (type) {
    case 'bool':
      return new wrappers.BoolValue().setValue(obj).serializeBinary();
    case 'bytes':
      return new wrappers.BytesValue().setValue(obj).serializeBinary();
    case 'double':
      return new wrappers.DoubleValue().setValue(obj).serializeBinary();
    case 'float':
      return new wrappers.FloatValue().setValue(obj).serializeBinary();
    case 'int32':
      return new wrappers.Int32Value().setValue(obj).serializeBinary();
    case 'int64':
      return new wrappers.Int64Value().setValue(obj).serializeBinary();
    case 'string':
      return new wrappers.StringValue().setValue(obj).serializeBinary();
    case 'uint32':
      return new wrappers.UInt32Value().setValue(obj).serializeBinary();
    case 'uint64':
      return new wrappers.UInt64Value().setValue(obj).serializeBinary();
    default:
      throw new Error('unsupported primitive type');
  }
}

function serializePrimitive(obj: any, type: string): Any {
  return new Any()
    .setTypeUrl(AkkaServerlessPrimitive + type)
    .setValue(serializePrimitiveValue(obj, type));
}

/**
 * Serialize a protobuf object to a google.protobuf.Any.
 *
 * @param obj The object to serialize. It must be a protobufjs created object.
 * @param allowPrimitives Whether primitives should be allowed to be serialized.
 * @param fallbackToJson Whether serialization should fallback to JSON if the object
 *        is not a protobuf, but defines a type property.
 * @param requireJsonType If fallbackToJson is true, then if this is true, a property
 *        called type is required.
 * @private
 */
export function serialize(
  obj: any,
  allowPrimitives: boolean,
  fallbackToJson: boolean,
  requireJsonType: boolean = false,
): Any {
  if (allowPrimitives) {
    if (typeof obj === 'string') {
      return serializePrimitive(obj, 'string');
    } else if (typeof obj === 'number') {
      return serializePrimitive(obj, 'double');
    } else if (Buffer.isBuffer(obj)) {
      return serializePrimitive(obj, 'bytes');
    } else if (typeof obj === 'boolean') {
      return serializePrimitive(obj, 'bool');
    } else if (Long.isLong(obj)) {
      return serializePrimitive(obj, 'int64');
    }
  }

  throw new Error('Implement me');
  //  if (
  //    obj.constructor &&
  //    typeof obj.constructor.encode === 'function' &&
  //    obj.constructor.$type
  //  ) {
  //    return Any.create({
  //      // I have *no* idea why it's type_url and not typeUrl, but it is.
  //      type_url:
  //        'type.googleapis.com/' + AnySupport.fullNameOf(obj.constructor.$type),
  //      value: obj.constructor.encode(obj).finish(),
  //    });
  //  } else if (fallbackToJson && typeof obj === 'object') {
  //    let type = obj.type;
  //    if (type === undefined) {
  //      if (requireJsonType) {
  //        throw new Error(
  //          util.format(
  //            'Fallback to JSON serialization supported, but object does not define a type property: %o',
  //            obj,
  //          ),
  //        );
  //      } else {
  //        type = 'object';
  //      }
  //    }
  //    return Any.create({
  //      type_url: AkkaServerlessJson + type,
  //      value: this.serializePrimitiveValue(stableJsonStringify(obj), 'string'),
  //    });
  //  } else {
  //    throw new Error(
  //      util.format(
  //        "Object %o is not a protobuf object, and hence can't be dynamically " +
  //          'serialized. Try passing the object to the protobuf classes create function.',
  //        obj,
  //      ),
  //    );
  //  }
}

/**
 * Deserialize an any using the given protobufjs root object.
 *
 * @param any The any.
 * @private
 */
export function deserialize(msg: Any): any {
  const url = msg.getTypeUrl();
  const idx = url.indexOf('/');
  let hostName = '';
  let type = url;
  if (url.indexOf('/') >= 0) {
    hostName = url.substr(0, idx + 1);
    type = url.substr(idx + 1);
  }

  const bytes = msg.getValue_asU8();

  if (hostName === AkkaServerlessPrimitive) {
    return deserializePrimitive(bytes, type);
  }

  throw new Error('not implemented yet');
  // if (hostName === AkkaServerlessJson) {
  //   const json = AnySupport.deserializePrimitive(bytes, 'string');
  //   return JSON.parse(json);
  // }

  // const desc = this.root.lookupType(type);
  // return desc.decode(bytes);
}

function deserializePrimitive(bytes: Uint8Array, type: string) {
  if (!bytes.length) return primitiveDefaultValues.get(type);

  switch (type) {
    case 'bool':
      return wrappers.BoolValue.deserializeBinary(bytes).getValue();
    case 'bytes':
      return wrappers.BytesValue.deserializeBinary(bytes).getValue();
    case 'double':
      return wrappers.DoubleValue.deserializeBinary(bytes).getValue();
    case 'float':
      return wrappers.FloatValue.deserializeBinary(bytes).getValue();
    case 'int32':
      return wrappers.Int32Value.deserializeBinary(bytes).getValue();
    case 'int64':
      return wrappers.Int64Value.deserializeBinary(bytes).getValue();
    case 'string':
      return wrappers.StringValue.deserializeBinary(bytes).getValue();
    case 'uint32':
      return wrappers.UInt32Value.deserializeBinary(bytes).getValue();
    case 'uint64':
      return wrappers.UInt64Value.deserializeBinary(bytes).getValue();
    default:
      throw new Error('unsupported primitive type');
  }
}

export class StaticAnySupport {
  constructor() {}
}
