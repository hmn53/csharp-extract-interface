/**
 * Shared C# parsing utilities and regex patterns
 */

// Regex patterns for C# code parsing
export const CSharpPatterns = {
  // Namespace: captures namespace name
  namespace: /namespace\s+([\w.]+)/,

  // Using statements: matches all using lines
  usings: /^using\s+.*;/gm,

  // Class declaration: captures class name, handles partial
  classDeclaration: /public\s+(?:partial\s+)?class\s+(\w+)/,

  // Method: captures return type, name, generic params, parameters
  // Excludes constructors by checking for opening brace after params
  method: /public\s+(?:async\s+)?([\w<>\[\]]+)\s+(\w+)\s*(?:<([^>]*)>)?\s*\(([^)]*)\)\s*(?={)/g,

  // Property: captures type and name
  property: /public\s+([\w<>\[\]?]+)\s+(\w+)\s*{\s*get/g,

  // Event: captures event type and name
  event: /public\s+event\s+([\w<>\[\].]+)\s+(\w+)\s*;/g,

  // Field: captures access modifier, readonly, type, name
  field: /(private|protected|internal)\s+(readonly\s+)?([\w<>\[\]?]+)\s+(_?\w+)\s*[;=]/g,

  // Interface implementation in class declaration
  interfaceImplementation: /:\s*([\w<>,\s]+)(?=\s*{)/,
};

/**
 * Extract namespace from C# code
 */
export function extractNamespace(code: string): string | null {
  const match = code.match(CSharpPatterns.namespace);
  return match ? match[1] : null;
}

/**
 * Extract using statements from C# code
 */
export function extractUsings(code: string): string {
  const matches = code.match(CSharpPatterns.usings);
  return matches ? matches.join("\n") : "";
}

/**
 * Extract class name from C# code
 */
export function extractClassName(code: string): string | null {
  const match = code.match(CSharpPatterns.classDeclaration);
  return match ? match[1] : null;
}

/**
 * Represents a parsed method signature
 */
export interface MethodInfo {
  returnType: string;
  name: string;
  genericParams: string | null;
  parameters: string;
}

/**
 * Extract all public methods from C# code
 */
export function extractMethods(code: string, excludeClassName?: string): MethodInfo[] {
  const regex = new RegExp(CSharpPatterns.method.source, "g");
  const matches = [...code.matchAll(regex)];

  return matches
    .filter((match) => !excludeClassName || match[2] !== excludeClassName)
    .map((match) => ({
      returnType: match[1],
      name: match[2],
      genericParams: match[3] || null,
      parameters: match[4],
    }));
}

/**
 * Represents a parsed event
 */
export interface EventInfo {
  type: string;
  name: string;
}

/**
 * Extract all public events from C# code
 */
export function extractEvents(code: string): EventInfo[] {
  const regex = new RegExp(CSharpPatterns.event.source, "g");
  const matches = [...code.matchAll(regex)];

  return matches.map((match) => ({
    type: match[1],
    name: match[2],
  }));
}

/**
 * Represents a parsed property
 */
export interface PropertyInfo {
  type: string;
  name: string;
}

/**
 * Extract all public properties from C# code
 */
export function extractProperties(code: string): PropertyInfo[] {
  const regex = new RegExp(CSharpPatterns.property.source, "g");
  const matches = [...code.matchAll(regex)];

  return matches.map((match) => ({
    type: match[1],
    name: match[2],
  }));
}

/**
 * Represents a parsed field
 */
export interface FieldInfo {
  accessModifier: string;
  isReadonly: boolean;
  type: string;
  name: string;
}

/**
 * Extract all fields from C# code
 */
export function extractFields(code: string): FieldInfo[] {
  const regex = new RegExp(CSharpPatterns.field.source, "g");
  const matches = [...code.matchAll(regex)];

  return matches.map((match) => ({
    accessModifier: match[1],
    isReadonly: !!match[2],
    type: match[3],
    name: match[4],
  }));
}

/**
 * Extract interfaces implemented by a class
 */
export function extractImplementedInterfaces(code: string): string[] {
  const match = code.match(CSharpPatterns.interfaceImplementation);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
