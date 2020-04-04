import { fieldTransformers } from "./field-transformers"
import {
  fieldOfTypeWasFetched,
  typeIsASupportedScalar,
  getTypeSettingsByType,
} from "../helpers"

const handleCustomScalars = field => {
  const fieldTypeIsACustomScalar =
    field.type.kind === `SCALAR` && !typeIsASupportedScalar(field.type)

  if (fieldTypeIsACustomScalar) {
    // if this field is an unsupported custom scalar,
    // type it as JSON
    field.type.name = `JSON`
  }

  const fieldTypeOfTypeIsACustomScalar =
    field.type.ofType &&
    field.type.ofType.kind === `SCALAR` &&
    !typeIsASupportedScalar(field.type)

  if (fieldTypeOfTypeIsACustomScalar) {
    // if this field is an unsupported custom scalar,
    // type it as JSON
    field.type.ofType.name = `JSON`
  }

  return field
}

// this is used to alias fields that conflict with Gatsby node fields
// for ex Gatsby and WPGQL both have a `parent` field
const getAliasedFieldName = ({ fieldAliases, field }) =>
  fieldAliases && fieldAliases[field.name]
    ? fieldAliases[field.name]
    : field.name

const excludeField = ({
  field,
  fieldName,
  thisTypeSettings,
  fieldBlacklist,
  parentTypeSettings,
  parentInterfacesImplementingTypeSettings,
}) =>
  // this field wasn't previously fetched, so we shouldn't
  // add it to our schema
  !fieldOfTypeWasFetched(field.type) ||
  // this field was excluded on it's parent fields Type
  (parentTypeSettings.excludeFieldNames &&
    parentTypeSettings.excludeFieldNames.includes(fieldName)) ||
  // this field is on an interface type and one of the implementing types has this field excluded on it.
  (parentInterfacesImplementingTypeSettings &&
    parentInterfacesImplementingTypeSettings.find(
      typeSetting =>
        typeSetting.excludeFieldNames &&
        typeSetting.excludeFieldNames.find(
          excludedFieldName => fieldName === excludedFieldName
        )
    )) ||
  // the type of this field was excluded via plugin options
  thisTypeSettings.exclude ||
  // node interface types are created elsewhere
  thisTypeSettings.nodeInterface ||
  // field is blacklisted
  fieldBlacklist.includes(fieldName) ||
  // this field has required input args
  (field.args && field.args.find(arg => arg.type.kind === `NON_NULL`)) ||
  // this field has no typeName
  (!field.type.name && !field.type.ofType.name) ||
  // field is a non null object
  (field.type.kind === `NON_NULL` && field.type.ofType.kind === `OBJECT`) ||
  // field is a non null enum
  (field.type.kind === `NON_NULL` && field.type.ofType.kind === `ENUM`)

/**
 * Transforms fields from the WPGQL schema to work in the Gatsby schema
 * with proper node linking and type namespacing
 * also filters out unusable fields and types
 */
export const transformFields = ({
  fields,
  fieldAliases,
  fieldBlacklist,
  parentType,
  parentInterfacesImplementingTypes,
}) => {
  if (!fields || !fields.length) {
    return null
  }

  const parentTypeSettings = getTypeSettingsByType(parentType)

  const parentInterfacesImplementingTypeSettings = parentInterfacesImplementingTypes
    ? parentInterfacesImplementingTypes.map(type => getTypeSettingsByType(type))
    : null

  return fields.reduce((fieldsObject, field) => {
    const thisTypeSettings = getTypeSettingsByType(field.type)

    const fieldName = getAliasedFieldName({ fieldAliases, field })

    if (
      excludeField({
        field,
        fieldName,
        thisTypeSettings,
        fieldBlacklist,
        parentTypeSettings,
        parentInterfacesImplementingTypeSettings,
      })
    ) {
      return fieldsObject
    }

    field = handleCustomScalars(field)

    const { transform } =
      fieldTransformers.find(({ test }) => test(field)) || {}

    if (transform && typeof transform === `function`) {
      fieldsObject[fieldName] = transform({
        field,
        fieldsObject,
        fieldName,
      })
    }

    return fieldsObject
  }, {})
}
