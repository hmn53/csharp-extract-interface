/**
 * Logic module exports
 */

// Re-export interface extraction functions
export {
  ExtractionResult,
  generateInterfaceCode,
  updateClassToImplementInterface,
} from "./interfaceExtractor";

// Re-export parser utilities
export {
  CSharpPatterns,
  extractNamespace,
  extractUsings,
  extractClassName,
  extractMethods,
  extractEvents,
  extractProperties,
  extractFields,
  extractImplementedInterfaces,
  MethodInfo,
  EventInfo,
  PropertyInfo,
  FieldInfo,
} from "./csharpParser";

// Re-export add to interface utilities
export {
  generateMethodSignature,
  generatePropertySignature,
  addMethodToInterface,
  addPropertyToInterface,
  parseMethodFromLine,
  parsePropertyFromLine,
  findImplementedInterfaces,
} from "./addToInterface";
