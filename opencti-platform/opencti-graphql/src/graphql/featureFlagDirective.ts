import { defaultFieldResolver, getDirectiveValues, isObjectType } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import { ForbiddenAccess } from '../config/errors';
import type { AuthContext } from '../types/user';
import { isFeatureEnabled } from '../config/conf';

/**
 * Arguments passed to the feature-flagging directive in GraphQL schema
 * @example @ff(flags: ["SOME_FLAG", "SOME_OTHER_FLAG"], softFail: true)
 */
interface FeatureFlagDirectiveArgs {
  /**
   * Array of feature flags that allow access to the endpoint.
   * If at least one flag is set for current user then access
   * is granted. (i.e. an `or` operator is used between each one of them)
   */
  flags: string[];
  /**
   * If true indicates that a lack of enabled flag won't result
   * in an error but in returning the value defaultValue if provided, `null` otherwise.
   * Can be useful for instance when querying very early in the app lifecycle
   * before feature flags being available in the client.
   * Defaults to `false`.
   */
  softFail?: boolean;
  /**
   * Returned value if softFail = true.
   * Should be a JSON string that will be parsed (e.g. "[]", "\"default\"", "null").
   * Defaults to `null`
   */
  defaultValue?: string;
}

const FF_DIRECTIVE = 'ff';

export const makeFeatureFlagDirectiveTransformer = (): (schema: GraphQLSchema) => GraphQLSchema => {
  return (schema: GraphQLSchema) => {
    const ffDirectiveDef = schema.getDirective(FF_DIRECTIVE);
    if (!ffDirectiveDef) return schema;

    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type)) continue;

      for (const field of Object.values(type.getFields())) {
        if (!field.astNode) continue;

        const ffDirective = getDirectiveValues(ffDirectiveDef, field.astNode) as FeatureFlagDirectiveArgs | undefined;
        if (!ffDirective?.flags) continue;

        const { flags, softFail, defaultValue } = ffDirective;
        const { resolve = defaultFieldResolver } = field;
        field.resolve = (source: any, args: any, context: AuthContext, info: any) => {
          if (!flags.some((flag) => isFeatureEnabled(flag))) {
            if (softFail) {
              return defaultValue ? JSON.parse(defaultValue) : null;
            } else {
              throw ForbiddenAccess('Feature is disabled', { flags });
            }
          }
          return resolve(source, args, context, info);
        };
      }
    }

    return schema;
  };
};
